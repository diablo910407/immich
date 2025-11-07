<script lang="ts">
  import type { PersonSortDimension } from '$lib/utils/person-group-sort-by';
  import { Button } from '@immich/ui';

  interface Props {
    selected?: PersonSortDimension;
    onChange?: (dim: PersonSortDimension) => void;
  }

  let { selected = 'overall', onChange = () => {} }: Props = $props();

  const options: { id: PersonSortDimension; label: string }[] = [
    { id: 'overall', label: '综合' },
    { id: 'looks', label: '颜值' },
    { id: 'body', label: '身材' },
    { id: 'content', label: '内容' },
  ];

  const handleSelect = (id: PersonSortDimension) => {
    console.log('[SortButtons] 选择排序维度:', id);
    onChange(id);
  };
</script>

<div class="flex items-center gap-2">
  {#each options as opt (opt.id)}
    <Button
      size="small"
      variant="ghost"
      color={selected === opt.id ? 'primary' : 'secondary'}
      onclick={() => handleSelect(opt.id)}
    >{opt.label}</Button>
  {/each}
  <!-- 轻微分隔符，与视图切换按钮保持视觉平衡 -->
</div>

<style>
  div { white-space: nowrap; }
</style>