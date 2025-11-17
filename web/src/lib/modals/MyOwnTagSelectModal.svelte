<script lang="ts">
  import { Button, Modal, ModalBody } from '@immich/ui';
  import { mdiArrowLeft, mdiContentSaveOutline } from '@mdi/js';
  import { onMount } from 'svelte';
  import { getLabelsFresh } from '$lib/utils/myowntag-client';
  import { SvelteSet } from 'svelte/reactivity';

  interface Props {
    selected: { typeId: string; skillId?: string }[];
    onClose: (value?: { typeId: string; skillId?: string }[]) => void;
  }
  let { selected, onClose }: Props = $props();

  let types: { id: string; name: string }[] = $state([]);
  let skills: { id: string; typeId: string; name: string }[] = $state([]);
  let typeSelection = new SvelteSet<string>();
  let skillSelection = new SvelteSet<string>();

  const initSelection = () => {
    typeSelection.clear();
    for (const t of selected.map((x) => x.typeId)) {
      typeSelection.add(t);
    }
    skillSelection.clear();
    for (const s of selected.filter((x) => !!x.skillId).map((x) => x.skillId as string)) {
      skillSelection.add(s);
    }
  };

  const toggleType = (id: string) => {
    if (typeSelection.has(id)) {
      typeSelection.delete(id);
      for (const s of skills.filter((k) => k.typeId === id)) {
        skillSelection.delete(s.id);
      }
    } else {
      typeSelection.add(id);
    }
    // SvelteSet 已具备响应式，无需重建实例
  };

  const toggleSkill = (id: string) => {
    if (skillSelection.has(id)) {
      skillSelection.delete(id);
    } else {
      skillSelection.add(id);
    }
    // SvelteSet 已具备响应式，无需重建实例
  };

  const onSave = () => {
    const result: { typeId: string; skillId?: string }[] = [];
    for (const t of typeSelection) {
      const sub = skills.filter((s) => s.typeId === t && skillSelection.has(s.id));
      if (sub.length === 0) {
        result.push({ typeId: t });
      } else {
        for (const s of sub) {
          result.push({ typeId: t, skillId: s.id });
        }
      }
    }
    onClose(result);
  };

  const handleClose = () => onClose();

  onMount(async () => {
    const data = await getLabelsFresh();
    types = data.types;
    skills = data.skills;
    initSelection();
  });
</script>

<Modal title="选择标签" size="medium" onClose={handleClose}>
  <ModalBody>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-0">
      <div class="p-3 max-h-[60vh] overflow-y-auto immich-scrollbar divide-y">
        {#each types as t (t.id)}
          <label class="flex items-center gap-2 py-2">
            <input type="checkbox" checked={typeSelection.has(t.id)} oninput={() => toggleType(t.id)} />
            <span>{t.name}</span>
          </label>
        {/each}
      </div>
      <div class="p-3 max-h-[60vh] overflow-y-auto immich-scrollbar divide-y">
        {#each types.filter((t) => typeSelection.has(t.id)) as t (t.id)}
          <div class="py-1 text-sm text-gray-500">{t.name} 的特长</div>
          {#each skills.filter((s) => s.typeId === t.id) as s (s.id)}
            <label class="flex items-center gap-2 py-2">
              <input type="checkbox" checked={skillSelection.has(s.id)} oninput={() => toggleSkill(s.id)} />
              <span>{s.name}</span>
            </label>
          {/each}
        {/each}
      </div>
    </div>
    <div class="flex items-center justify-end gap-2 mt-3">
      <Button leadingIcon={mdiArrowLeft} variant="ghost" color="secondary" size="small" onclick={handleClose}>返回</Button>
      <Button leadingIcon={mdiContentSaveOutline} size="small" onclick={onSave}>保存</Button>
    </div>
  </ModalBody>
</Modal>