<script lang="ts">
  import { goto } from '$app/navigation';
  import UserPageLayout from '$lib/components/layouts/user-page-layout.svelte';
  import { AppRoute } from '$lib/constants';
  import { Button, IconButton } from '@immich/ui';
  import { mdiArrowLeft, mdiContentSaveOutline, mdiPencilOutline, mdiDeleteOutline, mdiPlus } from '@mdi/js';
  import { onMount } from 'svelte';

  type TagType = { id: string; name: string };
  type TagSkill = { id: string; typeId: string; name: string };

  let types: TagType[] = $state([]);
  let skills: TagSkill[] = $state([]);
  let selectedTypeId: string | null = $state(null);

  let newTypeName = $state('');
  let newSkillName = $state('');

  let editingTypeId: string | null = $state(null);
  let editingSkillId: string | null = $state(null);

  const selectType = (id: string) => {
    selectedTypeId = id;
  };

  const addType = () => {
    const name = newTypeName.trim();
    if (!name) {
      return;
    }
    const id = crypto.randomUUID();
    types = [...types, { id, name }];
    newTypeName = '';
    if (!selectedTypeId) {
      selectedTypeId = id;
    }
  };

  const addSkill = () => {
    const name = newSkillName.trim();
    if (!name || !selectedTypeId) {
      return;
    }
    const id = crypto.randomUUID();
    skills = [...skills, { id, typeId: selectedTypeId, name }];
    newSkillName = '';
  };

  const deleteType = (id: string) => {
    types = types.filter((t) => t.id !== id);
    skills = skills.filter((s) => s.typeId !== id);
    if (selectedTypeId === id) {
      selectedTypeId = types.length > 0 ? types[0].id : null;
    }
  };

  const deleteSkill = (id: string) => {
    skills = skills.filter((s) => s.id !== id);
  };

  const updateTypeName = (id: string, name: string) => {
    const next = name.trim();
    types = types.map((t) => (t.id === id ? { ...t, name: next || t.name } : t));
    editingTypeId = null;
  };

  const updateSkillName = (id: string, name: string) => {
    const next = name.trim();
    skills = skills.map((s) => (s.id === id ? { ...s, name: next || s.name } : s));
    editingSkillId = null;
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/myowntag/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ types, skills }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      console.log('[myowntag] 保存成功');
      await goto(AppRoute.PEOPLE);
    } catch (error) {
      console.error('[myowntag] 保存失败', error);
    }
  };

  const handleBack = () => goto(AppRoute.PEOPLE);

  onMount(async () => {
    try {
      const res = await fetch('/api/myowntag/labels');
      if (res.ok) {
        const data = (await res.json()) as { types: TagType[]; skills: TagSkill[] };
        types = data.types ?? [];
        skills = data.skills ?? [];
        selectedTypeId = types[0]?.id ?? null;
        console.log('[myowntag] 初始加载', { typeCount: types.length, skillCount: skills.length });
      }
    } catch (error) {
      console.error('[myowntag] 加载失败', error);
    }
  });
</script>

<UserPageLayout title="标签管理">
  {#snippet buttons()}
    <div class="flex gap-2 items-center justify-center">
      <Button leadingIcon={mdiArrowLeft} size="small" variant="ghost" color="secondary" onclick={handleBack}>返回</Button>
      <Button leadingIcon={mdiContentSaveOutline} size="small" onclick={handleSave}>保存</Button>
    </div>
  {/snippet}

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-3">
      <div class="rounded-xl border p-4 bg-white dark:bg-immich-dark-gray shadow-sm">
        <div class="flex gap-2 items-center mb-3">
          <input
            type="text"
            class="flex-1 h-9 bg-white dark:bg-immich-dark-gray border border-gray-200 dark:border-gray-700 rounded-lg px-3"
            placeholder="新增类型"
            bind:value={newTypeName}
            onkeydown={(e) => {
              if ((e as KeyboardEvent).key === 'Enter') {
                addType();
              }
            }}
          />
          <IconButton icon={mdiPlus} aria-label="新增" onclick={addType} />
        </div>

        <div class="max-h-[60vh] overflow-y-auto immich-scrollbar divide-y">
          {#each types as t (t.id)}
            <div class="flex items-center py-2 gap-2">
              <button
                type="button"
                class="text-left flex-1 rounded-lg px-2 py-1 border transition-colors {selectedTypeId === t.id ? 'bg-gray-100 dark:bg-immich-dark-primary/20 border-immich-primary' : 'border-transparent hover:bg-gray-50 dark:hover:bg-immich-dark-primary/10'}"
                onclick={() => selectType(t.id)}>{t.name}</button>
              <IconButton icon={mdiPencilOutline} aria-label="编辑" onclick={() => (editingTypeId = t.id)} />
              <IconButton icon={mdiDeleteOutline} aria-label="删除" onclick={() => deleteType(t.id)} />
            </div>
            {#if editingTypeId === t.id}
              <div class="pb-2">
                <input
                  type="text"
                  class="w-full h-9 bg-white dark:bg-immich-dark-gray border border-gray-200 dark:border-gray-700 rounded-lg px-3"
                  value={t.name}
                  onblur={(e) => updateTypeName(t.id, (e.target as HTMLInputElement).value)}
                />
              </div>
            {/if}
          {/each}
        </div>
      </div>

      <div class="rounded-xl border p-4 bg-white dark:bg-immich-dark-gray shadow-sm">
        <div class="flex gap-2 items-center mb-3">
          <input
            type="text"
            class="flex-1 h-9 bg-white dark:bg-immich-dark-gray border border-gray-200 dark:border-gray-700 rounded-lg px-3"
            placeholder="新增特长"
            bind:value={newSkillName}
            disabled={!selectedTypeId}
            onkeydown={(e) => {
              if ((e as KeyboardEvent).key === 'Enter') {
                addSkill();
              }
            }}
          />
          <IconButton icon={mdiPlus} aria-label="新增" onclick={addSkill} disabled={!selectedTypeId} />
        </div>

        <div class="max-h-[60vh] overflow-y-auto immich-scrollbar divide-y">
          {#each skills.filter((s) => s.typeId === selectedTypeId) as s (s.id)}
            <div class="flex items-center py-2 gap-2">
              <div class="flex-1">{s.name}</div>
              <IconButton icon={mdiPencilOutline} aria-label="编辑" onclick={() => (editingSkillId = s.id)} />
              <IconButton icon={mdiDeleteOutline} aria-label="删除" onclick={() => deleteSkill(s.id)} />
            </div>
            {#if editingSkillId === s.id}
              <div class="pb-2">
                <input
                  type="text"
                  class="w-full h-9 bg-white dark:bg-immich-dark-gray border border-gray-200 dark:border-gray-700 rounded-lg px-3"
                  value={s.name}
                  onblur={(e) => updateSkillName(s.id, (e.target as HTMLInputElement).value)}
                />
              </div>
            {/if}
          {/each}
        </div>
      </div>
    </div>
</UserPageLayout>