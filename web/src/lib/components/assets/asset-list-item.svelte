<script lang="ts">
  import type { TimelineAsset } from '$lib/managers/timeline-manager/types';
  import { getAssetThumbnailUrl } from '$lib/utils';
  import { getAltText } from '$lib/utils/thumbnail-util';
  import { AssetMediaSize } from '@immich/sdk';
  import { Icon } from '@immich/ui';
  import { mdiAccount, mdiFolder, mdiImage, mdiVideo } from '@mdi/js';
  import { createEventDispatcher } from 'svelte';
  import ImageThumbnail from './thumbnail/image-thumbnail.svelte';

  export let asset: TimelineAsset;
  export let selected = false;
  export let selectionCandidate = false;
  export let disabled = false;

  const dispatch = createEventDispatcher<{
    select: { asset: TimelineAsset; selected: boolean };
    click: { asset: TimelineAsset };
  }>();

  const handleClick = () => {
    console.log('AssetListItem: Click event for asset:', asset.id, 'disabled:', disabled);
    if (!disabled) {
      dispatch('click', { asset });
    }
  };

  const handleSelect = (event: Event) => {
    console.log(
      'AssetListItem: Select event for asset:',
      asset.id,
      'current selected:',
      selected,
      'disabled:',
      disabled,
    );
    event.stopPropagation();
    if (!disabled) {
      const newSelected = !selected;
      dispatch('select', { asset, selected: newSelected });
    }
  };

  // 获取文件名
  const getFileName = (asset: TimelineAsset): string => {
    return asset.id; // TimelineAsset没有文件名，使用ID作为占位符
  };

  // 获取人物信息
  const getPersonInfo = (asset: TimelineAsset): string => {
    if (!asset.people || asset.people.length === 0) {
      return '无关联人物';
    }

    if (asset.people.length === 1) {
      return asset.people[0];
    } else if (asset.people.length <= 3) {
      return asset.people.join(', ');
    } else {
      return `${asset.people.slice(0, 2).join(', ')} 等${asset.people.length}人`;
    }
  };

  // 获取文件路径
  const getFilePath = (asset: TimelineAsset): string => {
    return `资源ID: ${asset.id}`; // TimelineAsset没有路径信息，使用ID作为占位符
  };

  // 格式化文件大小（TimelineAsset没有文件大小信息）
  const formatFileSize = (): string => {
    return '大小未知';
  };

  // 格式化日期
  const formatDate = (asset: TimelineAsset): string => {
    try {
      const date = new Date(asset.fileCreatedAt.year, asset.fileCreatedAt.month - 1, asset.fileCreatedAt.day);
      return date.toLocaleDateString('zh-CN');
    } catch {
      return '日期未知';
    }
  };
</script>

<div
  class="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-colors duration-200"
  class:bg-blue-50={selected}
  class:dark:bg-blue-900={selected}
  class:bg-yellow-50={selectionCandidate && !selected}
  class:dark:bg-yellow-900={selectionCandidate && !selected}
  class:opacity-50={disabled}
  on:click={handleClick}
  role="button"
  tabindex="0"
  on:keydown={(e) => e.key === 'Enter' && handleClick()}
>
  <!-- 选择框 -->
  <div class="flex-shrink-0 mr-3">
    <input
      type="checkbox"
      bind:checked={selected}
      on:change={handleSelect}
      {disabled}
      class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
    />
  </div>

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
        <Icon
          icon={asset.isVideo ? mdiVideo : mdiImage}
          size="16"
          class="mr-2 text-gray-500 dark:text-gray-400 flex-shrink-0"
        />
        <span class="font-medium text-gray-900 dark:text-gray-100 truncate" title={getFileName(asset)}>
          {getFileName(asset)}
        </span>
      </div>
      <div class="text-sm text-gray-500 dark:text-gray-400">
        {formatDate(asset)} • {formatFileSize()}
      </div>
    </div>

    <!-- 所属人物 -->
    <div class="min-w-0">
      <div class="flex items-center mb-1">
        <Icon icon={mdiAccount} size="16" class="mr-2 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        <span class="text-gray-700 dark:text-gray-300 truncate" title={getPersonInfo(asset)}>
          {getPersonInfo(asset)}
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
          {getFilePath(asset)}
        </span>
      </div>
      <div class="text-sm text-gray-500 dark:text-gray-400">
        {getFilePath(asset)}
      </div>
    </div>
  </div>
</div>
