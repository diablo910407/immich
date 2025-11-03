<script lang="ts">
  import type { TimelineAsset } from '$lib/managers/timeline-manager/types';
  import AssetListItem from './asset-list-item.svelte';
  import { createEventDispatcher } from 'svelte';

  interface Props {
    assets: TimelineAsset[];
    selectedAssets?: Set<TimelineAsset>;
    selectionCandidates?: Set<TimelineAsset>;
    disabled?: boolean;
    showArchiveIcon?: boolean;
  }

  let {
    assets = [],
    selectedAssets = new Set(),
    selectionCandidates = new Set(),
    disabled = false,
    showArchiveIcon = false,
  }: Props = $props();

  const dispatch = createEventDispatcher<{
    select: { asset: TimelineAsset };
    click: { asset: TimelineAsset };
    mouseEvent: { asset: TimelineAsset | null };
  }>();

  const handleAssetClick = (asset: TimelineAsset) => {
    console.log('AssetListView: Asset clicked:', asset.id);
    dispatch('click', { asset });
  };

  const handleAssetSelect = (asset: TimelineAsset) => {
    console.log('AssetListView: Asset selected:', asset.id);
    dispatch('select', { asset });
  };

  const handleMouseEvent = (asset: TimelineAsset | null) => {
    console.log('AssetListView: Mouse event on asset:', asset?.id || 'null');
    dispatch('mouseEvent', { asset });
  };

  // 添加调试日志
  $effect(() => {
    console.log('AssetListView: assets.length:', assets.length);
    console.log('AssetListView: selectedAssets.size:', selectedAssets.size);
    console.log('AssetListView: selectionCandidates.size:', selectionCandidates.size);
  });
</script>

<div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
  <!-- 列表头部 -->
  <div class="flex items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
    <div class="flex-shrink-0 w-4 mr-3"></div> <!-- 选择框占位 -->
    <div class="flex-shrink-0 w-16 mr-4"></div> <!-- 缩略图占位 -->
    <div class="flex-1">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div class="font-medium text-gray-700 dark:text-gray-300">文件信息</div>
        <div class="font-medium text-gray-700 dark:text-gray-300">所属人物</div>
        <div class="font-medium text-gray-700 dark:text-gray-300">文件路径</div>
      </div>
    </div>
  </div>

  <!-- 资产列表 -->
  <div class="divide-y divide-gray-200 dark:divide-gray-700">
    {#each assets as asset (asset.id)}
      <AssetListItem
        {asset}
        selected={selectedAssets.has(asset)}
        selectionCandidate={selectionCandidates.has(asset)}
        {disabled}
        on:click={() => handleAssetClick(asset)}
        on:select={() => handleAssetSelect(asset)}
        on:mouseenter={() => handleMouseEvent(asset)}
        on:mouseleave={() => handleMouseEvent(null)}
      />
    {/each}
  </div>

  <!-- 空状态 -->
  {#if assets.length === 0}
    <div class="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
      <div class="text-lg font-medium mb-2">没有找到照片或视频</div>
      <div class="text-sm">请检查您的媒体库设置</div>
    </div>
  {/if}
</div>

<style>
  /* 移除固定高度和滚动，让它使用页面的主滚动 */
</style>