<script lang="ts">
  import { modalManager } from '@immich/ui';
  import { getLabelsFresh, getPersonLabels, savePersonLabels } from '$lib/utils/myowntag-client';
  import MyOwnTagSelectModal from '$lib/modals/MyOwnTagSelectModal.svelte';
  import type { PersonResponseDto } from '@immich/sdk';

  interface Props {
    person: PersonResponseDto;
  }
  let { person }: Props = $props();

  let labels = $state<{ typeId: string; skillId?: string }[]>([] as { typeId: string; skillId?: string }[]);
  let types: { id: string; name: string }[] = $state([]);
  let skills: { id: string; typeId: string; name: string }[] = $state([]);

  const load = async () => {
    const data = await getLabelsFresh();
    types = data.types;
    skills = data.skills;
    const existing = await getPersonLabels(person.id);
    labels = existing.labels;
  };

  const openSelect = async () => {
    const result = await modalManager.show(MyOwnTagSelectModal, { selected: labels });
    if (result) {
      labels = result;
      await savePersonLabels(person.id, labels);
    }
  };

  $effect(() => {
    void load();
  });

  const typeTagIds = $derived(new Set(labels.map((l) => l.typeId)));
  const skillTagIds = $derived(new Set(labels.filter((l) => !!l.skillId).map((l) => l.skillId as string)));
  const typeTags = $derived(Array.from(typeTagIds).map((id) => types.find((t) => t.id === id)).filter(Boolean) as { id: string; name: string }[]);
  const skillTags = $derived(Array.from(skillTagIds).map((id) => skills.find((s) => s.id === id)).filter(Boolean) as { id: string; typeId: string; name: string }[]);
</script>

<div
  class="mt-2"
>
  <button
    type="button"
    class="w-full rounded-xl border px-3 py-2 text-left bg-white dark:bg-immich-dark-gray hover:bg-gray-50 dark:hover:bg-immich-dark-primary/10"
    onclick={openSelect}
  >
    {#if labels.length === 0}
      <span class="text-gray-500">新增标签</span>
    {:else}
      <div class="flex flex-wrap gap-2">
        {#each typeTags as t (t.id)}
          <span class="inline-flex items-center gap-1 text-xs rounded-full px-2 py-1 bg-immich-primary/10 text-immich-primary dark:bg-immich-dark-primary/25 dark:text-white">{t.name}</span>
        {/each}
        {#each skillTags as s (s.id)}
          <span class="inline-flex items-center gap-1 text-xs rounded-full px-2 py-1 bg-violet-500/10 text-violet-700 dark:text-white">{s.name}</span>
        {/each}
      </div>
    {/if}
  </button>
</div>