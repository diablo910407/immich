<script lang="ts">
  import { AssetTypeEnum, createPerson, getFaces, reassignFacesById, type PersonResponseDto } from '@immich/sdk';
  import { IconButton, Button, LoadingSpinner, toastManager } from '@immich/ui';
  import { mdiArrowLeftThin } from '@mdi/js';
  import ImageThumbnail from '$lib/components/assets/thumbnail/image-thumbnail.svelte';
  import { getAssetThumbnailUrl, handlePromiseError } from '$lib/utils';

  interface Props {
    assetId: string;
    assetType: AssetTypeEnum;
    onClose: () => void;
    onCreated: (person: PersonResponseDto) => void;
  }

  let { assetId, assetType, onClose, onCreated }: Props = $props();

  let name: string = $state('');
  let isSaving: boolean = $state(false);

  const handleConfirm = async () => {
    if (!name.trim()) {
      toastManager.warning('请输入人物名称');
      return;
    }
    isSaving = true;
    try {
      const person = await createPerson({ personCreateDto: { name } });
      const faces = await getFaces({ id: assetId });
      for (const face of faces) {
        if (!face.person) {
          await reassignFacesById({ id: person.id, faceDto: { id: face.id } });
        }
      }
      onCreated(person);
      toastManager.success('已新增人物并归入未聚类人脸');
      onClose();
    } catch (error) {
      console.error('create-person-side-panel save error', error);
      toastManager.error('保存失败');
    } finally {
      isSaving = false;
    }
  };
</script>

<section class="absolute top-0 h-full w-90 overflow-x-hidden p-2 dark:text-immich-dark-fg bg-light">
  <div class="flex place-items-center justify-between gap-2">
    <div class="flex items-center gap-2">
      <IconButton shape="round" color="secondary" variant="ghost" icon={mdiArrowLeftThin} aria-label="返回" onclick={onClose} />
      <p class="flex text-lg text-immich-fg dark:text-immich-dark-fg">新增人物</p>
    </div>
    {#if isSaving}
      <LoadingSpinner />
    {:else}
      <Button color="primary" onclick={handleConfirm}>确定</Button>
    {/if}
  </div>

  <div class="px-4 py-4 text-sm">
    <div class="mt-4 flex gap-4 items-start">
      <ImageThumbnail curve shadow url={getAssetThumbnailUrl({ id: assetId, size: 'thumbnail' })} altText={name || '预览'} widthStyle="120px" heightStyle="120px" />
      <div class="flex flex-col gap-2 w-full">
        <label class="text-sm">人物名称</label>
        <input class="w-full rounded border border-gray-300 px-2 py-1 dark:bg-immich-dark-bg" bind:value={name} placeholder="请输入人物名称" />
      </div>
    </div>
  </div>
</section>
