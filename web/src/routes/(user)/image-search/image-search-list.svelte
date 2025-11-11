<script lang="ts">
  import type { TimelineAsset } from '$lib/managers/timeline-manager/types';
  import ImageSearchListItem from './image-search-list-item.svelte';
  import { createEventDispatcher } from 'svelte';

  // 组件内使用的列表项数据结构（无需导出）
  type ImageSearchListItemData = { asset: TimelineAsset; similarity?: number };

  export let mode: 'face' | 'similar' = 'similar';
  export let items: ImageSearchListItemData[] = [];
  export let disabled = false;

  const dispatch = createEventDispatcher<{ itemClick: { assetId: string } }>();

  const onItemClick = (e: CustomEvent<{ asset: TimelineAsset }>) => {
    dispatch('itemClick', { assetId: e.detail.asset.id });
  };
</script>

<div class="divide-y divide-gray-200 dark:divide-gray-700">
  {#each items as item, idx (item.asset.id + '-' + idx)}
    <ImageSearchListItem mode={mode} asset={item.asset} similarity={item.similarity} {disabled} on:click={onItemClick} />
  {/each}
</div>

<style>
  /* 列表容器使用分割线样式，与原 AssetListView 一致 */
</style>