<script lang="ts">
  import { IconButton } from '@immich/ui';
  import { mdiViewGrid, mdiViewList } from '@mdi/js';
  import { t } from 'svelte-i18n';

  interface Props {
    isListView: boolean;
    onToggle: (isListView: boolean) => void;
  }

  let { isListView, onToggle }: Props = $props();

  const handleToggle = () => {
    onToggle(!isListView);
  };
</script>

<IconButton
  icon={isListView ? mdiViewGrid : mdiViewList}
  title={isListView ? $t('grid_view') : $t('list_view')}
  onclick={handleToggle}
  size="small"
  variant="ghost"
/>