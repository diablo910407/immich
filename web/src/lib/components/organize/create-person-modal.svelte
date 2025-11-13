<script lang="ts">
  import { AssetTypeEnum, createPerson, updatePerson, getFaces, createFace, reassignFacesById, type PersonResponseDto } from '@immich/sdk';
  import { Button, Input, LoadingSpinner, toastManager } from '@immich/ui';
  import ImageThumbnail from '$lib/components/assets/thumbnail/image-thumbnail.svelte';
  import { getAssetThumbnailUrl } from '$lib/utils';

  interface Props {
    assetId: string;
    assetType: AssetTypeEnum;
    onClose: () => void;
    onCreated: (person: PersonResponseDto) => void;
  }

  let { assetId, assetType, onClose, onCreated }: Props = $props();
  let name: string = $state('');
  let saving: boolean = $state(false);

  const ensureFaceAssigned = async (personId: string) => {
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

  const confirm = async () => {
    if (!name.trim()) {
      toastManager.warning('请输入人物名称');
      return;
    }
    saving = true;
    try {
      const person = await createPerson({ personCreateDto: { name } });
      const changed = await ensureFaceAssigned(person.id);
      if (changed) {
        try {
          const updated = await updatePerson({ id: person.id, personUpdateDto: { featureFaceAssetId: assetId } });
          toastManager.success('已新增人物并归入');
          onCreated(updated);
        } catch (e) {
          console.error('set feature face after create failed', e);
          toastManager.warning('已归入，但头像设置失败');
          onCreated(person);
        }
      } else {
        onCreated(person);
      }
      onClose();
    } catch (error) {
      console.error('create-person-modal error', error);
      toastManager.error('保存失败');
    } finally {
      saving = false;
    }
  };
</script>

<div class="fixed inset-0 bg-black/50" onclick={onClose}></div>
<div class="fixed inset-0 flex items-center justify-center">
  <div class="max-w-[420px] w-[420px] bg-white dark:bg-immich-dark-gray dark:text-immich-dark-fg backdrop-blur-sm px-4 py-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl">
    <p class="text-center text-sm">新增人物</p>
    <div class="mt-4 flex items-start gap-4">
      <ImageThumbnail curve shadow url={getAssetThumbnailUrl({ id: assetId, size: 'thumbnail' })} altText={name || '预览'} widthStyle="120px" heightStyle="120px" />
      <div class="flex-1">
        <label class="text-sm">人物名称</label>
        <Input placeholder="请输入人物名称" bind:value={name} />
      </div>
    </div>
    <div class="mt-4 flex justify-end gap-2">
      <Button variant="ghost" onclick={onClose}>返回</Button>
      {#if saving}
        <LoadingSpinner />
      {:else}
        <Button color="primary" onclick={confirm}>确定</Button>
      {/if}
    </div>
  </div>
  
</div>

