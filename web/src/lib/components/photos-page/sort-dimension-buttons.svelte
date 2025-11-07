<script lang="ts">
  import type { PersonSortDimension } from '$lib/utils/person-group-sort-by';
  import Dropdown from '$lib/elements/Dropdown.svelte';
  import { mdiChevronDown } from '@mdi/js';

  interface Props {
    selected?: PersonSortDimension;
    onChange?: (dim: PersonSortDimension) => void;
  }

  let { selected = 'overall', onChange = () => {} }: Props = $props();

  const options: PersonSortDimension[] = ['overall', 'looks', 'body', 'content'];

  const labelOf = (dim: PersonSortDimension): string => {
    switch (dim) {
      case 'overall': {
        return '综合评分';
      }
      case 'looks': {
        return '颜值评分';
      }
      case 'body': {
        return '身材评分';
      }
      case 'content': {
        return '内容评分';
      }
      default: {
        // 防御性返回，理论上不会触发
        return '综合评分';
      }
    }
  };

  const handleSelect = (dim: PersonSortDimension) => {
    console.log('[SortDropdown] 选择排序维度:', dim);
    onChange(dim);
  };
</script>

<div class="flex items-center gap-2">
  <span class="text-sm text-primary">排序：</span>
  <Dropdown
    {options}
    selectedOption={selected}
    hideTextOnSmallScreen={false}
    render={(dim) => ({ title: labelOf(dim), icon: mdiChevronDown })}
    onSelect={(dim) => handleSelect(dim as PersonSortDimension)}
  />
</div>

<style>
  div { white-space: nowrap; }
</style>