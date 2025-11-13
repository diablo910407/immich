<script lang="ts">
  import UserPageLayout from '$lib/components/layouts/user-page-layout.svelte';
  import { Button, LoadingSpinner, toastManager } from '@immich/ui';
  import { getAssetThumbnailUrl } from '$lib/utils';
  import AssignPersonModal from '$lib/components/organize/assign-person-modal.svelte';
  import CreatePersonModal from '$lib/components/organize/create-person-modal.svelte';
  import { AssetTypeEnum, getFaces, type AssetResponseDto } from '@immich/sdk';

  type TabKey = 'files' | 'people';
  let selectedTab: TabKey = $state('files');

  interface UnassignedItem {
    id: string;
    type: AssetTypeEnum;
    originalFileName: string;
    originalPath: string;
  }

  let isLoading: boolean = $state(false);
  let items: UnassignedItem[] = $state([]);

  let showAssignModal: boolean = $state(false);
  let showCreateModal: boolean = $state(false);
  let currentAssetId: string = $state('');
  let currentAssetType: AssetTypeEnum = $state(AssetTypeEnum.IMAGE);

  const handleSelectTab = async (value: TabKey) => {
    selectedTab = value;
    await refresh();
  };

  const refresh = async () => {
    if (selectedTab !== 'files') {
      items = [];
      return;
    }
    await handleSearch();
  };

  const handleSearch = async () => {
    isLoading = true;
    try {
      const res = await fetch('/api/organize/unassigned-assets');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data: UnassignedItem[] = await res.json();
      items = data;
      toastManager.info(`检索到 ${items.length} 个未聚类文件`);
    } catch (error) {
      console.error('zhengli files search error', error);
      toastManager.error('检索失败');
    } finally {
      isLoading = false;
    }
  };

  const openAssignPanel = (item: UnassignedItem) => {
    currentAssetId = item.id;
    currentAssetType = item.type;
    showAssignModal = true;
  };

  const onAssignedRefresh = async () => {
    try {
      const faces = await getFaces({ id: currentAssetId });
      const hasUnassigned = faces.some((f) => !f.person);
      if (!hasUnassigned) {
        items = items.filter((i) => i.id !== currentAssetId);
      }
    } catch (_) {}
    showAssignModal = false;
  };

  const openCreatePanel = (item: UnassignedItem) => {
    currentAssetId = item.id;
    currentAssetType = item.type;
    showCreateModal = true;
  };

  const onCreated = (person: any) => {
    items = items.filter((i) => i.id !== currentAssetId);
    showCreateModal = false;
  };
</script>

<UserPageLayout pageTitle="整理">
  <div class="px-6 py-4">
    <div class="mb-4">
      <div class="flex w-full h-16">
        <button
          type="button"
          class={
            `w-1/2 h-full flex items-center justify-center text-base rounded-s-2xl ` +
            (selectedTab === 'files'
              ? 'bg-gray-300 dark:bg-gray-700'
              : 'bg-gray-200 hover:bg-gray-300 dark:bg-immich-dark-gray dark:hover:bg-gray-800')
          }
          onclick={() => handleSelectTab('files')}
        >
          文件
        </button>
        <button
          type="button"
          class={
            `w-1/2 h-full flex items-center justify-center text-base rounded-e-2xl ` +
            (selectedTab === 'people'
              ? 'bg-gray-300 dark:bg-gray-700'
              : 'bg-gray-200 hover:bg-gray-300 dark:bg-immich-dark-gray dark:hover:bg-gray-800')
          }
          onclick={() => handleSelectTab('people')}
        >
          人物
        </button>
      </div>
    </div>

    {#if selectedTab === 'files'}
      <div class="mb-4">
        <Button color="primary" onclick={handleSearch}>检索</Button>
      </div>
      {#if isLoading}
        <div class="flex w-full justify-center"><LoadingSpinner /></div>
      {:else}
        <div class="flex flex-col gap-3">
          {#each items as item (item.id)}
            <div class="flex items-center gap-4 p-3 rounded border border-gray-200 dark:border-gray-700">
              <img class="rounded" src={getAssetThumbnailUrl({ id: item.id, size: 'thumbnail' })} alt={item.originalFileName} width="80" height="80" />
              <div class="flex-1 min-w-0">
                <div class="font-medium truncate">{item.originalFileName}</div>
                <div class="text-xs text-gray-500 whitespace-normal break-all leading-5">{item.originalPath}</div>
              </div>
              <div class="flex gap-2">
                <Button color="secondary" onclick={() => openAssignPanel(item)}>归入</Button>
                <Button color="primary" onclick={() => openCreatePanel(item)}>新增</Button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {:else}
      <div class="text-sm text-gray-500">人物整理功能暂未实现</div>
    {/if}
  </div>

  {#if showAssignModal}
    <AssignPersonModal assetId={currentAssetId} assetType={currentAssetType} onClose={() => (showAssignModal = false)} onAssigned={onAssignedRefresh} />
  {/if}

  {#if showCreateModal}
    <CreatePersonModal assetId={currentAssetId} assetType={currentAssetType} onClose={() => (showCreateModal = false)} onCreated={onCreated} />
  {/if}
</UserPageLayout>
