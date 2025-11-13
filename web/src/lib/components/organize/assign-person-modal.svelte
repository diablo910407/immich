<script lang="ts">
  import { getAllPeople, getFaces, createFace, reassignFacesById, type PersonResponseDto, AssetTypeEnum } from '@immich/sdk';
  import { Button, Input, LoadingSpinner, toastManager } from '@immich/ui';
  import ImageThumbnail from '$lib/components/assets/thumbnail/image-thumbnail.svelte';
  import { getPeopleThumbnailUrl, getAssetThumbnailUrl } from '$lib/utils';

  interface Props {
    assetId: string;
    assetType: AssetTypeEnum;
    anchorLeft: number;
    anchorTop: number;
    onClose: () => void;
    onAssigned: () => void;
  }

  let { assetId, assetType, anchorLeft, anchorTop, onClose, onAssigned }: Props = $props();

  let page = $state(1);
  let loading = $state(false);
  let people: PersonResponseDto[] = $state([]);
  let searchTerm = $state('');

  const filtered = $derived(
    searchTerm ? people.filter((p) => (p.name || '').toLowerCase().includes(searchTerm.toLowerCase())) : people,
  );

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

<div class="fixed inset-0 bg-black/50" onclick={onClose}></div>

<div
  class="absolute max-w-[320px] w-[320px] bg-white dark:bg-immich-dark-gray dark:text-immich-dark-fg backdrop-blur-sm px-3 py-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl"
  style={`top:${anchorTop}px; left:${anchorLeft}px`}
>
  <p class="text-center text-sm">选择要标记的人物</p>
  <div class="my-3">
    <Input placeholder="按人物查找" bind:value={searchTerm} size="tiny" />
  </div>
  <div class="h-62.5 overflow-y-auto mt-2">
    {#if loading}
      <div class="flex w-full justify-center"><LoadingSpinner /></div>
    {:else}
      {#if filtered.length > 0}
        <div class="mt-2 rounded-lg">
          {#each filtered as person (person.id)}
            <button type="button" class="w-full flex place-items-center gap-2 rounded-lg ps-1 pe-4 py-2 hover:bg-immich-primary/25" onclick={() => onChoose(person)}>
              <ImageThumbnail curve shadow url={getPeopleThumbnailUrl(person)} altText={person.name} title={person.name} widthStyle="30px" heightStyle="30px" />
              <p class="text-sm">{person.name}</p>
            </button>
          {/each}
        </div>
      {:else}
        <div class="flex items-center justify-center py-4"><p class="text-sm text-gray-500">未找到人物</p></div>
      {/if}
    {/if}
  </div>
  <Button size="small" fullWidth onclick={onClose} color="danger" class="mt-2">取消</Button>
</div>

