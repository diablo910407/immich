<script lang="ts">
  import type { TimelineAsset } from '$lib/managers/timeline-manager/types';
  import { getAssetThumbnailUrl } from '$lib/utils';
  import { getAltText } from '$lib/utils/thumbnail-util';
  import { AssetMediaSize } from '@immich/sdk';
  import { Icon } from '@immich/ui';
  import { mdiAccount, mdiFolder, mdiImage, mdiVideo } from '@mdi/js';
  import { createEventDispatcher, onMount } from 'svelte';
  import ImageThumbnail from '$lib/components/assets/thumbnail/image-thumbnail.svelte';
  import { getAssetInfo, type AssetResponseDto } from '@immich/sdk';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import { getAssetFilename, getFileSize } from '$lib/utils/asset-utils';

  export let asset: TimelineAsset;
  export let mode: 'face' | 'similar' = 'similar';
  export let similarity: number | undefined = undefined;
  export let disabled = false;

  const dispatch = createEventDispatcher<{ click: { asset: TimelineAsset } }>();

  let fullAssetInfo: AssetResponseDto | null = null;
  let isLoadingAssetInfo = false;

  // 加载完整的资产信息，复用原列表项的行为
  onMount(async () => {
    try {
      isLoadingAssetInfo = true;
      fullAssetInfo = await getAssetInfo({ ...authManager.params, id: asset.id });
    } catch (error) {
      console.error('[ImageSearchListItem] 加载资产信息失败:', error);
    } finally {
      isLoadingAssetInfo = false;
    }
  });

  const handleClick = () => {
    console.log('[ImageSearchListItem] 点击:', asset.id, 'disabled:', disabled);
    if (!disabled) {
      dispatch('click', { asset });
    }
  };

  // 文件名/人物/路径/大小/日期的工具函数，保持与原组件一致
  const getFileName = (a: TimelineAsset): string => {
    if (fullAssetInfo) {
      return getAssetFilename(fullAssetInfo);
    }
    return `资源-${a.id.slice(0, 8)}...`;
  };

  const getPersonInfo = (a: TimelineAsset): string => {
    if (fullAssetInfo?.people && fullAssetInfo.people.length > 0) {
      const peopleNames = fullAssetInfo.people.map((p) => p.name).filter(Boolean);
      if (peopleNames.length === 0) {
        return '无关联人物';
      }
      if (peopleNames.length === 1) {
        return peopleNames[0]!;
      }
      if (peopleNames.length <= 3) {
        return peopleNames.join(', ');
      }
      return `${peopleNames.slice(0, 2).join(', ')} 等${peopleNames.length}人`;
    }
    if (a.people && a.people.length > 0) {
      if (a.people.length === 1) {
        return a.people[0]!;
      }
      if (a.people.length <= 3) {
        return a.people.join(', ');
      }
      return `${a.people.slice(0, 2).join(', ')} 等${a.people.length}人`;
    }
    return '无关联人物';
  };

  const getFilePath = (a: TimelineAsset): string => {
    if (fullAssetInfo?.originalPath) {
      return fullAssetInfo.originalPath;
    }
    return `资源ID: ${a.id}`;
  };

  const formatFileSize = (): string => {
    if (fullAssetInfo) {
      return getFileSize(fullAssetInfo);
    }
    return '大小未知';
  };

  const formatDate = (a: TimelineAsset): string => {
    try {
      const d = new Date(a.fileCreatedAt.year, a.fileCreatedAt.month - 1, a.fileCreatedAt.day);
      return d.toLocaleDateString('zh-CN');
    } catch {
      return '日期未知';
    }
  };

  const similarityText = () => {
    if (mode !== 'similar') {
      return '';
    }
    if (typeof similarity === 'number') {
      return `相似度 ${similarity}%`;
    }
    return '相似度 --%';
  };
</script>

<div
  class="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-colors duration-200"
  class:opacity-50={disabled}
  on:click={handleClick}
  role="button"
  tabindex="0"
  on:keydown={(e) => e.key === 'Enter' && handleClick()}
  on:keydown={(e) => {
    if (e.key === 'Enter') {
      handleClick();
    }
  }}
>
  <!-- 左侧：相似度（替换原多选勾选框）；在人脸模式下不显示 -->
  {#if mode === 'similar'}
    <div class="flex-shrink-0 mr-3">
      <div class="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 font-medium">
        {similarityText()}
      </div>
    </div>
  {/if}

  <!-- 缩略图 -->
  <div class="flex-shrink-0 mr-4">
    <div class="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
      <ImageThumbnail
        url={getAssetThumbnailUrl({ id: asset.id, size: AssetMediaSize.Thumbnail, cacheKey: asset.thumbhash })}
        altText={$getAltText(asset)}
        widthStyle="100%"
        heightStyle="100%"
        class="w-full h-full object-cover"
      />
    </div>
  </div>

  <!-- 信息区域 -->
  <div class="flex-1 grid grid-cols-3 gap-4 min-w-0">
    <!-- 文件信息 -->
    <div class="min-w-0">
      <div class="flex items-center mb-1">
        <Icon icon={asset.isVideo ? mdiVideo : mdiImage} size="16" class="mr-2 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        <span class="font-medium text-gray-900 dark:text-gray-100 truncate" title={getFileName(asset)}>
          {isLoadingAssetInfo ? '加载中...' : getFileName(asset)}
        </span>
      </div>
      <div class="text-sm text-gray-500 dark:text-gray-400">
        {formatDate(asset)} • {isLoadingAssetInfo ? '...' : formatFileSize()}
      </div>
    </div>

    <!-- 所属人物 -->
    <div class="min-w-0">
      <div class="flex items-center mb-1">
        <Icon icon={mdiAccount} size="16" class="mr-2 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        <span class="text-gray-700 dark:text-gray-300 truncate" title={getPersonInfo(asset)}>
          {isLoadingAssetInfo ? '加载中...' : getPersonInfo(asset)}
        </span>
      </div>
      <div class="text-sm text-gray-500 dark:text-gray-400">
        {asset.isVideo ? '视频' : '照片'}
      </div>
    </div>

    <!-- 文件路径 -->
    <div class="min-w-0">
      <div class="flex items-center mb-1">
        <Icon icon={mdiFolder} size="16" class="mr-2 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        <span class="text-gray-700 dark:text-gray-300 truncate" title={getFilePath(asset)}>
          {isLoadingAssetInfo ? '加载中...' : getFilePath(asset)}
        </span>
      </div>
      <div class="text-sm text-gray-500 dark:text-gray-400">
        {isLoadingAssetInfo ? '加载中...' : getFilePath(asset)}
      </div>
    </div>
  </div>
</div>

<style>
  /* 保持与原列表项一致的行高与分割线风格 */
</style>