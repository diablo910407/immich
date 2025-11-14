<script lang="ts">
  import { goto } from '$app/navigation';
  import UserPageLayout from '$lib/components/layouts/user-page-layout.svelte';
  import AssignPersonModal from '$lib/components/organize/assign-person-modal.svelte';
  import CreatePersonModal from '$lib/components/organize/create-person-modal.svelte';
  import { AppRoute } from '$lib/constants';
  import { getAssetThumbnailUrl } from '$lib/utils';
  import { AssetMediaSize, AssetTypeEnum, getFaces } from '@immich/sdk';
  import { Button, Icon, LoadingSpinner, toastManager } from '@immich/ui';
  import { mdiFolderOutline } from '@mdi/js';

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
  let currentAssetType: AssetTypeEnum = $state(AssetTypeEnum.Image);

  interface PeopleAuditItem {
    id: string;
    name: string;
    paths: string[];
  }
  let peopleAuditLoading: boolean = $state(false);
  let peopleAuditItems: PeopleAuditItem[] = $state([]);

  const copyFolderPath = async (p: string) => {
    try {
      await navigator.clipboard.writeText(p);
      toastManager.info('已复制绝对路径');
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = p;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.append(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        if (ok) {
          toastManager.info('已复制绝对路径');
          return;
        }
        throw new Error('execCommand failed');
      } catch (error_) {
        console.error('copy folder path failed', error_);
        toastManager.danger('复制路径失败');
      }
    }
  };

  const getPersonThumb = (id: string) => `/api/people/${id}/thumbnail`;

  const gotoPersonPhotos = async (id: string) => {
    await goto(`${AppRoute.PEOPLE}/${id}/photos`);
  };

  const handlePeopleAudit = async () => {
    peopleAuditLoading = true;
    try {
      const res = await fetch('/api/people-audit/paths');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data: PeopleAuditItem[] = await res.json();
      peopleAuditItems = data;
      toastManager.info(`检索到 ${peopleAuditItems.length} 个人物存在多路径文件`);
    } catch (error) {
      console.error('zhengli people audit error', error);
      toastManager.danger('检索失败');
    } finally {
      peopleAuditLoading = false;
    }
  };

  const ignoreAuditItem = (id: string) => {
    peopleAuditItems = peopleAuditItems.filter((i) => i.id !== id);
  };

  const handleSelectTab = (value: TabKey) => {
    selectedTab = value;
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
      toastManager.danger('检索失败');
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
    } catch {
      console.warn('onAssignedRefresh: faces fetch failed');
    }
    showAssignModal = false;
  };

  const openCreatePanel = (item: UnassignedItem) => {
    currentAssetId = item.id;
    currentAssetType = item.type;
    showCreateModal = true;
  };

  const onCreated = () => {
    items = items.filter((i) => i.id !== currentAssetId);
    showCreateModal = false;
  };
</script>

<UserPageLayout title="整理" stackButtons>
  {#snippet buttons()}
    <div class="flex w-full h-12">
      <button
        type="button"
        class={`w-1/2 h-full flex items-center justify-center text-sm rounded-s-2xl ` +
          (selectedTab === 'files'
            ? 'bg-gray-300 dark:bg-gray-700'
            : 'bg-gray-200 hover:bg-gray-300 dark:bg-immich-dark-gray dark:hover:bg-gray-800')}
        onclick={() => handleSelectTab('files')}
      >
        文件
      </button>
      <button
        type="button"
        class={`w-1/2 h-full flex items-center justify-center text-sm rounded-e-2xl ` +
          (selectedTab === 'people'
            ? 'bg-gray-300 dark:bg-gray-700'
            : 'bg-gray-200 hover:bg-gray-300 dark:bg-immich-dark-gray dark:hover:bg-gray-800')}
        onclick={() => handleSelectTab('people')}
      >
        人物
      </button>
    </div>
  {/snippet}
  <div class="px-6 py-4">
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
              <img
                class="rounded"
                src={getAssetThumbnailUrl({ id: item.id, size: AssetMediaSize.Thumbnail })}
                alt={item.originalFileName}
                width="80"
                height="80"
              />
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
      <div class="mb-4">
        <Button color="primary" onclick={handlePeopleAudit}>路径排查</Button>
      </div>
      {#if peopleAuditLoading}
        <div class="flex w-full justify-center"><LoadingSpinner /></div>
      {:else}
        <div class="flex flex-col gap-3">
          {#each peopleAuditItems as item (item.id)}
            <div class="flex items-center gap-4 p-3 rounded border border-gray-200 dark:border-gray-700">
              <button
                type="button"
                class="rounded"
                aria-label="打开人物照片"
                onclick={() => gotoPersonPhotos(item.id)}
                onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && gotoPersonPhotos(item.id)}
              >
                <img src={getPersonThumb(item.id)} alt={item.name} width="80" height="80" />
              </button>
              <div class="flex-1 min-w-0">
                <div class="font-medium truncate">{item.name || item.id}</div>
                <div class="mt-2 flex flex-col gap-2">
                  {#each item.paths as p (p)}
                    <div class="flex items-center gap-2">
                      <div class="text-xs text-gray-500 whitespace-normal break-all leading-5 flex-1">{p}</div>
                      <button
                        class="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700"
                        title="复制绝对路径"
                        onclick={() => copyFolderPath(p)}
                        type="button"
                      >
                        <Icon icon={mdiFolderOutline} size="1.1em" />
                      </button>
                    </div>
                  {/each}
                </div>
              </div>
              <div class="flex gap-2">
                <Button color="secondary" onclick={() => ignoreAuditItem(item.id)}>忽略</Button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  </div>

  {#if showAssignModal}
    <AssignPersonModal
      assetId={currentAssetId}
      assetType={currentAssetType}
      onClose={() => (showAssignModal = false)}
      onAssigned={onAssignedRefresh}
    />
  {/if}

  {#if showCreateModal}
    <CreatePersonModal
      assetId={currentAssetId}
      assetType={currentAssetType}
      onClose={() => (showCreateModal = false)}
      {onCreated}
    />
  {/if}
</UserPageLayout>
