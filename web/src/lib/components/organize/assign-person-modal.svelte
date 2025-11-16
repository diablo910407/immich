<script lang="ts">
  import { getAllPeople, getFaces, createFace, reassignFacesById, type PersonResponseDto, AssetTypeEnum } from '@immich/sdk';
  import { Button, Input, LoadingSpinner, toastManager } from '@immich/ui';
  import ImageThumbnail from '$lib/components/assets/thumbnail/image-thumbnail.svelte';
  import { getPeopleThumbnailUrl, getAssetThumbnailUrl } from '$lib/utils';
  import SearchPeople from '$lib/components/faces-page/people-search.svelte';

  interface Props {
    assetId: string;
    assetType: AssetTypeEnum;
    onClose: () => void;
    onAssigned: () => void;
  }

  let { assetId, assetType, onClose, onAssigned }: Props = $props();

  let page = $state(1);
  let loading = $state(false);
  let people: PersonResponseDto[] = $state([]);
  let searchedPeople: PersonResponseDto[] = $state([]);
  let searchName = $state('');
  let isShowLoadingSearch = $state(false);

  const filtered = $derived(searchName ? searchedPeople : people);

  const loadPeople = async () => {
    const { hasNextPage, people: items, total } = await getAllPeople({ page, size: 1000, withHidden: true });
    if (people.length === total) return;
    people = [...people, ...items];
    if (hasNextPage) page++;
  };

  const ensureFaceForAsset = async (personId: string) => {
    const faces = await getFaces({ id: assetId });
    if (faces.length > 0) {
      let changed = false;
      for (const f of faces) {
        if (!f.person) {
          await reassignFacesById({ id: personId, faceDto: { id: f.id } });
          changed = true;
        }
      }
      return changed;
    }

    const img = new Image();
    const src = getAssetThumbnailUrl({ id: assetId, size: 'preview' });
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('preview load failed'));
      img.src = src;
    });

    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const w = Math.floor(iw * 0.6);
    const h = Math.floor(ih * 0.6);
    const x = Math.floor((iw - w) / 2);
    const y = Math.floor((ih - h) / 2);

    await createFace({ assetFaceCreateDto: { assetId, personId, imageWidth: iw, imageHeight: ih, x, y, width: w, height: h } });
    return true;
  };

  const onChoose = async (person: PersonResponseDto) => {
    loading = true;
    try {
      const changed = await ensureFaceForAsset(person.id);
      if (changed) {
        toastManager.success('已归入人物');
        onAssigned();
        onClose();
      } else {
        toastManager.info('没有可归入的人脸');
      }
    } catch (error) {
      console.error('assign-person-modal error', error);
      toastManager.error('归入失败');
    } finally {
      loading = false;
    }
  };

  $effect(() => {
    loadPeople();
  });
</script>

<button type="button" class="fixed inset-0 bg-black/50" aria-label="关闭遮罩" tabindex="0" onclick={onClose} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onClose()}></button>
<div class="fixed inset-0 flex items-center justify-center">
  <div class="max-w-[480px] w-[480px] bg-white dark:bg-immich-dark-gray dark:text-immich-dark-fg backdrop-blur-sm px-4 py-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl">
    <p class="text-center text-sm">选择已聚类的人物</p>
    <div class="mt-3 flex items-center gap-2">
      <SearchPeople type="input" bind:searchName={searchName} bind:showLoadingSpinner={isShowLoadingSearch} bind:searchedPeopleLocal={searchedPeople} />
      {#if isShowLoadingSearch}
        <LoadingSpinner />
      {/if}
    </div>
    <div class="h-80 overflow-y-auto mt-3">
      {#if loading}
        <div class="flex w-full justify-center"><LoadingSpinner /></div>
      {:else}
        {#if filtered.length > 0}
          <div class="grid grid-cols-3 gap-3 mt-2">
            {#each filtered as person (person.id)}
              <button type="button" class="w-full" onclick={() => onChoose(person)}>
                <div class="flex items-center gap-2">
                  <ImageThumbnail curve shadow url={getPeopleThumbnailUrl(person)} altText={person.name} title={person.name} widthStyle="40px" heightStyle="40px" />
                  <p class="text-sm truncate">{person.name}</p>
                </div>
              </button>
            {/each}
          </div>
        {:else}
          <div class="flex items-center justify-center py-4"><p class="text-sm text-gray-500">未找到人物</p></div>
        {/if}
      {/if}
    </div>
    <div class="mt-3 flex justify-end gap-2">
      <Button variant="ghost" onclick={onClose}>返回</Button>
    </div>
  </div>
</div>
