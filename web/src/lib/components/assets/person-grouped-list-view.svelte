<script lang="ts">
  import AssetListView from '$lib/components/assets/asset-list-view.svelte';
  import { navigate } from '$lib/utils/navigation';
  import { toTimelineAsset } from '$lib/utils/timeline-util';
  import { getAssetFilename } from '$lib/utils/asset-utils';
  import { sortPersonGroupsDefault, sortPersonGroupsBy, type PersonSortDimension } from '$lib/utils/person-group-sort-by';
  import { handleError } from '$lib/utils/handle-error';
  import {
    getAllPeople,
    searchAssets,
    AssetTypeEnum,
    type AssetResponseDto,
    type PersonResponseDto,
  } from '@immich/sdk';
  import { getPeopleThumbnailUrl } from '$lib/utils';
  import ImageThumbnail from '$lib/components/assets/thumbnail/image-thumbnail.svelte';
  import FractionalStars from '$lib/elements/fractional-stars.svelte';
  import { personRatingStore, type PersonRatingDimensions } from '$lib/stores/person-rating.store';
  import type { TimelineAsset } from '$lib/managers/timeline-manager/types';
  import type { AssetInteraction } from '$lib/stores/asset-interaction.svelte';
  import Skeleton from '$lib/elements/Skeleton.svelte';

  interface Props {
    assetInteraction: AssetInteraction;
    isSelectionMode?: boolean;
    singleSelect?: boolean;
    showArchiveIcon?: boolean;
    onSelect?: (asset: TimelineAsset) => void;
    // 列表排序维度，仅在人物分组列表模式下使用
    sortBy?: PersonSortDimension;
  }

  let {
    assetInteraction,
    isSelectionMode = false,
    singleSelect = false,
    showArchiveIcon = false,
    onSelect = () => {},
    sortBy = 'overall',
  }: Props = $props();

  type PersonGroup = {
    person: PersonResponseDto;
    assets: TimelineAsset[];
    page: number;
    hasNext: boolean;
    loading: boolean;
    loadedOnce: boolean;
  };

  let groups: PersonGroup[] = $state([]);
  let isInitializing = $state(true);
  let ratingMap = $state<Record<string, PersonRatingDimensions>>({});

  const getPersonRating = (id: string): PersonRatingDimensions => {
    return ratingMap[id] ?? personRatingStore.ensure(id);
  };

  const typeOrder = (t: AssetTypeEnum) => (t === 'IMAGE' ? 0 : t === 'VIDEO' ? 1 : 2);

  const sortAssetsForGroup = (items: AssetResponseDto[]) => {
    items.sort((a, b) => {
      const ta = a.type;
      const tb = b.type;
      const typeDiff = typeOrder(ta) - typeOrder(tb);
      if (typeDiff !== 0) {
        return typeDiff;
      }
      const fa = getAssetFilename(a);
      const fb = getAssetFilename(b);
      return fa.localeCompare(fb);
    });
  };

  const initGroups = async () => {
    try {
      // 仅加载未隐藏人物，保证照片界面不显示被隐藏人物
      const { people } = await getAllPeople({ withHidden: false });
      const sorted = sortBy === 'overall' ? sortPersonGroupsDefault(people) : sortPersonGroupsBy(people, sortBy);
      groups = sorted.map((p) => ({ person: p, assets: [], page: 1, hasNext: true, loading: false, loadedOnce: false }));
      console.log('[PersonList] 初始化人物组数量(不含隐藏):', groups.length, '排序维度:', sortBy);
      // 初始化评分映射，避免首次渲染为空
      for (const p of sorted) {
        ratingMap[p.id] = personRatingStore.ensure(p.id);
      }
    } catch (error) {
      handleError(error, '加载人物列表失败');
    } finally {
      isInitializing = false;
    }
  };

  const loadGroupAssets = async (group: PersonGroup) => {
    if (group.loading || (!group.hasNext && group.loadedOnce)) {
      return;
    }
    group.loading = true;
    try {
      const { assets } = await searchAssets({ metadataSearchDto: { page: group.page, personIds: [group.person.id], withExif: true, withPeople: true } });
      const items = assets.items;
      console.log(`[PersonList] 加载人物资产: ${group.person.name} 页: ${group.page} 数量: ${items.length}`);
      sortAssetsForGroup(items);
      const timelineAssets = items.map((a) => toTimelineAsset(a));
      group.assets.push(...timelineAssets);
      const next = Number(assets.nextPage) || 0;
      group.page = next || group.page + 1;
      group.hasNext = next > 0;
      group.loadedOnce = true;
    } catch (error) {
      handleError(error, '加载人物资产失败');
    } finally {
      group.loading = false;
    }
  };

  const intersectOnce = (node: HTMLElement, group: PersonGroup) => {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          void loadGroupAssets(group);
          io.disconnect();
          break;
        }
      }
    }, { root: document.querySelector('#asset-grid') || null, threshold: 0.05 });
    io.observe(node);
    return { destroy: () => io.disconnect() };
  };

  const onAssetClick = (asset: TimelineAsset) => {
    if (isSelectionMode || assetInteraction.selectionActive) {
      assetInteraction.selectAsset(asset);
      return;
    }
    void navigate({ targetRoute: 'current', assetId: asset.id });
  };

  const onAssetSelect = (asset: TimelineAsset) => {
    onSelect(asset);
    if (singleSelect) {
      return;
    }
    assetInteraction.selectAsset(asset);
  };

  const getSelectedSet = (assets: TimelineAsset[]) => new Set(assets.filter((a) => assetInteraction.hasSelectedAsset(a.id)));
  const getCandidateSet = (assets: TimelineAsset[]) => new Set(assets.filter((a) => assetInteraction.hasSelectionCandidate(a.id)));

  $effect(() => { void initGroups(); });

  // 监听排序维度变更，动态重排已有分组（不重新拉取数据）
  $effect(() => {
    // 初始化阶段跳过
    if (isInitializing || groups.length === 0) {
      return;
    }
    const people = groups.map((g) => g.person);
    const sorted = sortBy === 'overall' ? sortPersonGroupsDefault(people) : sortPersonGroupsBy(people, sortBy);
    // 使用排序后的顺序重排 groups，但保留其 assets、分页等状态
    const orderMap = new Map(sorted.map((p, idx) => [p.id, idx]));
    groups.sort((ga, gb) => (orderMap.get(ga.person.id)! - orderMap.get(gb.person.id)!));
    console.log('[PersonList] 切换排序维度为:', sortBy, '已重排分组数量:', groups.length);
  });

  // 订阅评分变更（如用户在其他界面更新评分），保持标题区域展示最新值
  $effect(() => {
    const unsub = personRatingStore.subscribe((state) => {
      for (const id in state) {
        ratingMap[id] = state[id];
        console.debug('[PersonList] 评分更新:', id, state[id]);
      }
      // 分数更新后也根据当前维度重排
      if (!isInitializing && groups.length > 0) {
        const people = groups.map((g) => g.person);
        const sorted = sortBy === 'overall' ? sortPersonGroupsDefault(people) : sortPersonGroupsBy(people, sortBy);
        const orderMap = new Map(sorted.map((p, idx) => [p.id, idx]));
        groups.sort((ga, gb) => (orderMap.get(ga.person.id)! - orderMap.get(gb.person.id)!));
        console.log('[PersonList] 评分变更触发重排，维度:', sortBy);
      }
    });
    return () => unsub();
  });
</script>

<section class="px-4 py-2">
  {#if isInitializing}
    <Skeleton height={240} title="加载人物分组中" />
  {:else}
    {#each groups as group (group.person.id)}
      <div class="mb-8">
        <div class="flex items-start justify-between mb-3" use:intersectOnce={group}>
          <div class="flex items-start gap-3">
            <div class="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-700 overflow-hidden shrink-0">
              <ImageThumbnail circle url={getPeopleThumbnailUrl(group.person)} altText={group.person.name} widthStyle="48px" heightStyle="48px" />
            </div>
            <div class="flex flex-col gap-1">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight">{group.person.name}</h3>
              <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700 dark:text-gray-300">
                <div class="flex items-center gap-2">
                  <span class="w-10 text-right">综合</span>
                  <span style="color:#FFD700">
                    <FractionalStars value={getPersonRating(group.person.id).overall} count={5} size="1.2em" title={`综合评分 ${getPersonRating(group.person.id).overall}`} />
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-10 text-right">颜值</span>
                  <span style="color:#FF69B4">
                    <FractionalStars value={getPersonRating(group.person.id).looks} count={5} size="1.1em" title={`颜值 ${getPersonRating(group.person.id).looks}`} />
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-10 text-right">身材</span>
                  <span style="color:#FF7F50">
                    <FractionalStars value={getPersonRating(group.person.id).body} count={5} size="1.1em" title={`身材 ${getPersonRating(group.person.id).body}`} />
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-10 text-right">内容</span>
                  <span style="color:#4169E1">
                    <FractionalStars value={getPersonRating(group.person.id).content} count={5} size="1.1em" title={`内容 ${getPersonRating(group.person.id).content}`} />
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            {#if group.loading}
              <span class="text-sm text-gray-500">加载中...</span>
            {/if}
            {#if group.hasNext}
              <button type="button" class="px-3 py-1 text-sm rounded bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700" onclick={() => void loadGroupAssets(group)}>
                加载更多
              </button>
            {/if}
          </div>
        </div>

        {#if group.assets.length === 0 && group.loadedOnce && !group.loading}
          <div class="text-sm text-gray-600 dark:text-gray-400">该人物暂无资产</div>
        {:else}
          {#if group.assets.length > 0}
            {@const selectedAssets = getSelectedSet(group.assets)}
            {@const selectionCandidates = getCandidateSet(group.assets)}
            <AssetListView
              assets={group.assets}
              {selectedAssets}
              {selectionCandidates}
              disabled={false}
              {showArchiveIcon}
              on:click={({ detail }) => onAssetClick(detail.asset)}
              on:select={({ detail }) => onAssetSelect(detail.asset)}
              on:mouseEvent={({ detail }) => {
                // 简化：仅记录候选但不实现跨组范围选择
                if (detail.asset) {
                  assetInteraction.setAssetSelectionCandidates([detail.asset]);
                }
              }}
            />
          {:else if group.loading}
            <Skeleton height={180} title="加载中" />
          {/if}
        {/if}
      </div>
    {/each}
  {/if}
</section>

<style>
  /* 人物分组列表视图样式占位，避免空规则 */
  section { display: block; }
</style>