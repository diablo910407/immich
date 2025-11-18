<script lang="ts">
  import { getLabelsFresh } from '$lib/utils/myowntag-client';
  import { createEventDispatcher } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';

  const dispatch = createEventDispatcher<{ apply: { typeIds: string[]; skillIds: string[] } }>();

  let open = $state(false);
  let types: { id: string; name: string }[] = $state([]);
  let skills: { id: string; typeId: string; name: string }[] = $state([]);
  let selectedTypeIds = new SvelteSet<string>();
  let selectedSkillIds = new SvelteSet<string>();

  const toggleOpen = async () => {
    open = !open;
    if (open) {
      try {
        const dict = await getLabelsFresh();
        types = dict.types;
        skills = dict.skills;
      } catch (error) {
        console.warn('tag-filter-menu load labels failed', error);
      }
    }
  };

  const applyAndClose = () => {
    open = false;
    dispatch('apply', { typeIds: Array.from(selectedTypeIds), skillIds: Array.from(selectedSkillIds) });
  };

  const toggleType = (id: string) => {
    if (selectedTypeIds.has(id)) {
      selectedTypeIds.delete(id);
    } else {
      selectedTypeIds.add(id);
    }
  };

  const toggleSkill = (id: string) => {
    if (selectedSkillIds.has(id)) {
      selectedSkillIds.delete(id);
    } else {
      selectedSkillIds.add(id);
    }
  };

  const onDocClick = (e: MouseEvent) => {
    if (!open) {
      return;
    }
    const target = e.target as HTMLElement | null;
    if (!target) {
      return;
    }
    const menu = document.querySelector('#tag-filter-dropdown');
    const btn = document.querySelector('#tag-filter-button');
    if (menu && !menu.contains(target) && btn && !btn.contains(target)) {
      applyAndClose();
    }
  };

  $effect(() => {
    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  });
</script>

<div class="relative inline-block">
  <button id="tag-filter-button" type="button" class="px-3 py-1.5 rounded-lg border bg-white dark:bg-immich-dark-gray text-sm hover:bg-gray-50 dark:hover:bg-immich-dark-primary/10" onclick={toggleOpen}>
    标签
  </button>

  {#if open}
    <div id="tag-filter-dropdown" class="absolute z-50 mt-2 w-[540px] max-w-[80vw] bg-white dark:bg-immich-dark-gray border rounded-xl shadow-xl p-3">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="text-xs font-semibold mb-2">一级标签</div>
          <div class="max-h-[260px] overflow-auto pr-1">
            {#each types as t (t.id)}
              <label class="flex items-center gap-2 py-1 cursor-pointer">
                <input type="checkbox" checked={selectedTypeIds.has(t.id)} onchange={() => toggleType(t.id)} />
                <span class="inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-1 bg-immich-primary/10 text-immich-primary dark:bg-immich-dark-primary/25 dark:text-white">{t.name}</span>
              </label>
            {/each}
          </div>
        </div>
        <div>
          <div class="text-xs font-semibold mb-2">二级标签</div>
          <div class="max-h-[260px] overflow-auto pr-1">
            {#each skills as s (s.id)}
              <label class="flex items-center gap-2 py-1 cursor-pointer">
                <input type="checkbox" checked={selectedSkillIds.has(s.id)} onchange={() => toggleSkill(s.id)} />
                <span class="inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-1 bg-violet-500/10 text-violet-700 dark:text-white">{s.name}</span>
              </label>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
</style>