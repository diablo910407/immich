<script lang="ts">
  import AssetListView from '$lib/components/assets/asset-list-view.svelte';
  import { navigate } from '$lib/utils/navigation';
  import { toTimelineAsset } from '$lib/utils/timeline-util';
  import { getAssetFilename } from '$lib/utils/asset-utils';
  import { sortPersonGroupsDefault, sortPersonGroupsBy, type PersonSortDimension } from '$lib/utils/person-group-sort-by';
  import { handleError } from '$lib/utils/handle-error';
  import {
    getAllPeople,
    getPersonStatistics,
    searchAssets,
    AssetTypeEnum,
    type AssetResponseDto,
    type PersonResponseDto,
  } from '@immich/sdk';
  import { Button } from '@immich/ui';
  import { getPeopleThumbnailUrl } from '$lib/utils';
  import ImageThumbnail from '$lib/components/assets/thumbnail/image-thumbnail.svelte';
  import FractionalStars from '$lib/elements/fractional-stars.svelte';
  import { personRatingStore, type PersonRatingDimensions } from '$lib/stores/person-rating.store';
  import type { TimelineAsset } from '$lib/managers/timeline-manager/types';
  import type { AssetInteraction } from '$lib/stores/asset-interaction.svelte';
  import Skeleton from '$lib/elements/Skeleton.svelte';
  import { getLabelsCached, getPersonLabels } from '$lib/utils/myowntag-client';

  interface Props {
    assetInteraction: AssetInteraction;
    isSelectionMode?: boolean;
    singleSelect?: boolean;
    showArchiveIcon?: boolean;
    onSelect?: (asset: TimelineAsset) => void;
    // 列表排序维度，仅在人物分组列表模式下使用
    sortBy?: PersonSortDimension;
    // 可选：限定只显示某一个人物（用于人物详情页的列表模式）
    person?: PersonResponseDto;
    tagFilter?: { typeIds: string[]; skillIds: string[] };
  }

  let {
    assetInteraction,
    isSelectionMode = false,
    singleSelect = false,
    showArchiveIcon = false,
    onSelect = () => {},
    sortBy = 'overall',
    person,
    tagFilter,
  }: Props = $props();

  type PersonGroup = {
    person: PersonResponseDto;
    assets: TimelineAsset[];
    page: number;
    hasNext: boolean;
    loading: boolean;
    loadedOnce: boolean;
    expanded: boolean;
    previewAssets: TimelineAsset[];
    totalCount?: number;
  };

  let groups: PersonGroup[] = $state([]);
  let filteredGroups: PersonGroup[] = $state([]);
  let isInitializing = $state(true);
  let ratingMap = $state<Record<string, PersonRatingDimensions>>({});
  let myowntagTypes = $state<{ id: string; name: string }[]>([]);
  let myowntagSkills = $state<{ id: string; typeId: string; name: string }[]>([]);
  let labelsMap = $state<Record<string, { typeId: string; skillId?: string }[]>>({});

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

  const samplePreview = (assets: TimelineAsset[], count = 3) => {
    const n = Math.min(count, assets.length);
    if (n <= 0) {
      return [] as TimelineAsset[];
    }
    const picked: TimelineAsset[] = [];
    const usedIdx: number[] = [];
    while (picked.length < n) {
      const idx = Math.floor(Math.random() * assets.length);
      if (!usedIdx.includes(idx)) {
        usedIdx.push(idx);
        picked.push(assets[idx]);
      }
    }
    return picked;
  };

  type PersonWithCounts = PersonResponseDto & {
    assetsCount?: number;
    numberOfAssets?: number;
    assetCount?: number;
    totalAssets?: number;
    total?: number;
  };
  const getPersonAssetCount = (p: PersonResponseDto): number => {
    const anyp = p as PersonWithCounts;
    const v = anyp.assetsCount ?? anyp.numberOfAssets ?? anyp.assetCount ?? anyp.totalAssets ?? anyp.total ?? 0;
    return Number(v) || 0;
  };

  const updatePreviewAssets = (group: PersonGroup) => {
    if (!group.expanded) {
      group.previewAssets = samplePreview(group.assets, 3);
      console.debug('[PersonList] 更新预览资产数量:', group.previewAssets.length, '人物:', group.person.name);
    }
  };

  const initGroups = async () => {
    try {
      // 如果传入了特定人物，则仅初始化该人物的分组
      if (person) {
        groups = [
          { person, assets: [], page: 1, hasNext: true, loading: false, loadedOnce: false, expanded: true, previewAssets: [] },
        ];
        ratingMap[person.id] = personRatingStore.ensure(person.id);
        console.log('[PersonList] 以人物过滤模式初始化:', person.name);
      } else {
        // 仅加载未隐藏人物，保证照片界面不显示被隐藏人物
        const { people } = await getAllPeople({ withHidden: false });
        const sorted = sortBy === 'overall' ? sortPersonGroupsDefault(people) : sortPersonGroupsBy(people, sortBy);
        groups = sorted.map((p) => ({ person: p, assets: [], page: 1, hasNext: true, loading: false, loadedOnce: false, expanded: false, previewAssets: [] }));
        console.log('[PersonList] 初始化人物组数量(不含隐藏):', groups.length, '排序维度:', sortBy);
        // 初始化评分映射，避免首次渲染为空
        for (const p of sorted) {
          ratingMap[p.id] = personRatingStore.ensure(p.id);
        }
      }
    } catch (error) {
      handleError(error, '加载人物列表失败');
    } finally {
      isInitializing = false;
    }
  };

  const ensureMyOwnTagDict = async () => {
    try {
      const dict = await getLabelsCached();
      myowntagTypes = dict.types;
      myowntagSkills = dict.skills;
      console.debug('[PersonList] myowntag 字典加载完成', { types: myowntagTypes.length, skills: myowntagSkills.length });
    } catch (error) {
      console.warn('[PersonList] myowntag 字典加载失败', error);
    }
  };

  const loadPersonLabels = async (personId: string) => {
    if (labelsMap[personId]) {
      return;
    }
    try {
      const res = await getPersonLabels(personId);
      labelsMap[personId] = res.labels || [];
      console.debug('[PersonList] 加载人物标签:', personId, '数量:', labelsMap[personId].length);
    } catch (error) {
      console.warn('[PersonList] 加载人物标签失败', personId, error);
      labelsMap[personId] = [];
    }
  };

  const getTypeTags = (personId: string) => {
    const labels = labelsMap[personId] || [];
    const typeIds = Array.from(new Set(labels.map((l) => l.typeId)));
    return typeIds.map((id) => myowntagTypes.find((t) => t.id === id)).filter(Boolean) as { id: string; name: string }[];
  };

  const getSkillTags = (personId: string) => {
    const labels = labelsMap[personId] || [];
    const skillIds = Array.from(new Set(labels.filter((l) => !!l.skillId).map((l) => l.skillId as string)));
    return skillIds.map((id) => myowntagSkills.find((s) => s.id === id)).filter(Boolean) as { id: string; typeId: string; name: string }[];
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
      updatePreviewAssets(group);
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
          void (async () => {
            try {
              const stats = await getPersonStatistics({ id: group.person.id });
              group.totalCount = stats.assets ?? getPersonAssetCount(group.person);
              console.debug('[PersonList] 获取人物统计总数:', group.person.name, '总数:', group.totalCount);
              await loadPersonLabels(group.person.id);
            } catch (error) {
              console.warn('[PersonList] 获取人物详情失败，使用已有字段回退', error);
            }
            await loadGroupAssets(group);
          })();
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
  $effect(() => { void ensureMyOwnTagDict(); });

  const prefetchAllLabels = async () => {
    const ids = groups.map((g) => g.person.id);
    const pool: Promise<void>[] = [];
    const concurrency = 5;
    let i = 0;
    const next = async () => {
      if (i >= ids.length) {
        return;
      }
      const id = ids[i++];
      await loadPersonLabels(id);
      await next();
    };
    for (let k = 0; k < concurrency; k++) {
      pool.push(next());
    }
    await Promise.all(pool);
  };

  $effect(() => {
    if (person) {
      filteredGroups = groups;
      return;
    }
    const typeSel = new Set(tagFilter?.typeIds || []);
    const skillSel = new Set(tagFilter?.skillIds || []);
    const hasFilter = typeSel.size > 0 || skillSel.size > 0;
    if (!hasFilter) {
      filteredGroups = groups;
      return;
    }
    void prefetchAllLabels().then(() => {
      filteredGroups = groups.filter((g) => {
        const labels = labelsMap[g.person.id] || [];
        for (const l of labels) {
          if (skillSel.size > 0 && l.skillId && skillSel.has(l.skillId)) {
            return true;
          }
          if (typeSel.size > 0 && typeSel.has(l.typeId)) {
            return true;
          }
        }
        return false;
      });
    });
  });

  // 监听排序维度变更，动态重排已有分组（不重新拉取数据）
  $effect(() => {
    // 初始化阶段跳过
    if (isInitializing || groups.length === 0) {
      return;
    }
    // 若为人物过滤模式（只有一个分组），无需重排
    if (person) {
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
      if (!isInitializing && groups.length > 0 && !person) {
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
    {#each (person ? groups : filteredGroups) as group (group.person.id)}
      <div class="mb-8">
        <div class="flex items-start justify-between mb-3" use:intersectOnce={group}>
          <div class="flex items-start gap-3 w-full">
            <div class="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-700 overflow-hidden shrink-0">
              <ImageThumbnail circle url={getPeopleThumbnailUrl(group.person)} altText={group.person.name} widthStyle="48px" heightStyle="48px" />
            </div>
            <div class="flex-1 flex flex-col gap-1 min-w-0">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight">{group.person.name}</h3>
              <div class="flex items-start gap-3">
                <div class="flex items-start gap-3 flex-1">
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
                  {#if !person}
                    <div class="flex flex-col gap-1 min-w-0 text-xs">
                      <div class="flex items-center gap-2 flex-nowrap overflow-hidden min-h-[22px]">
                        {#each getTypeTags(group.person.id) as t (t.id)}
                          <span class="inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-1 bg-immich-primary/10 text-immich-primary dark:bg-immich-dark-primary/25 dark:text-white whitespace-nowrap">{t.name}</span>
                        {/each}
                      </div>
                      <div class="flex items-center gap-2 flex-nowrap overflow-hidden min-h-[22px]">
                        {#each getSkillTags(group.person.id) as s (s.id)}
                          <span class="inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-1 bg-violet-500/10 text-violet-700 dark:text-white whitespace-nowrap">{s.name}</span>
                        {/each}
                      </div>
                    </div>
                  {/if}
                </div>
                <div class="ml-auto flex items-center gap-2">
                  {#if group.loading}
                    <span class="text-sm text-gray-500">加载中...</span>
                  {/if}
                  {#if !group.expanded && (group.totalCount ?? 0) > 3}
                    <Button size="small" variant="ghost" color="primary" onclick={() => { group.expanded = true; console.log('[PersonList] 展开全部文件:', group.person.name, '总数:', group.totalCount); }}>
                      展示全部{group.totalCount}个文件
                    </Button>
                  {:else if group.expanded && group.hasNext}
                    <Button size="small" variant="ghost" color="secondary" onclick={() => void loadGroupAssets(group)}>
                      加载更多
                    </Button>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        </div>

      {#if group.assets.length === 0 && group.loadedOnce && !group.loading}
        <div class="text-sm text-gray-600 dark:text-gray-400">该人物暂无资产</div>
      {:else}
        {#if (group.expanded && group.assets.length > 0) || (!group.expanded && group.previewAssets.length > 0)}
          {@const renderAssets = group.expanded ? group.assets : group.previewAssets}
          {@const selectedAssets = getSelectedSet(renderAssets)}
          {@const selectionCandidates = getCandidateSet(renderAssets)}
          <AssetListView
            assets={renderAssets}
            {selectedAssets}
            {selectionCandidates}
            disabled={false}
            {showArchiveIcon}
            on:click={({ detail }) => onAssetClick(detail.asset)}
            on:select={({ detail }) => onAssetSelect(detail.asset)}
            on:mouseEvent={({ detail }) => {
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