<script lang="ts">
  import { shortcuts } from '$lib/actions/shortcut';
  import { Icon } from '@immich/ui';
  import { t } from 'svelte-i18n';

  interface Props {
    count?: number;
    rating: number;
    readOnly?: boolean;
    showClear?: boolean;
    onRating: (rating: number) => void | undefined;
    size?: string;
  }

  let { count = 5, rating, readOnly = false, showClear = true, onRating, size = '1.5em' }: Props = $props();

  let ratingSelection = $derived(rating);
  let hoverValue = $state(0);

  const starIcon =
    'M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z';

  const clamp = (v: number) => Math.max(0, Math.min(count, v));
  const displayValue = $derived(hoverValue > 0 ? hoverValue : ratingSelection);
  const fills = $derived(Array.from({ length: count }, (_, i) => Math.max(0, Math.min(1, displayValue - i)) * 100));

  const select = (value: number) => {
    if (readOnly) {
      return;
    }
    const next = clamp(value);
    if (next === ratingSelection) {
      return;
    }
    console.debug('[HalfStarRating] select', next);
    onRating(next);
  };

  const setHover = (value: number) => {
    if (readOnly) {
      return;
    }
    hoverValue = clamp(value);
  };
  const resetHover = () => {
    hoverValue = 0;
  };

  const step = 0.5;
  const adjustBy = (delta: number) => {
    if (readOnly) {
      return;
    }
    const base = hoverValue > 0 ? hoverValue : ratingSelection;
    setHover(clamp(base + delta));
  };
</script>

<!-- 支持 0.5 步进半星交互 -->
<fieldset
  class="text-primary w-fit cursor-default"
  onmouseleave={resetHover}
  use:shortcuts={[
    { shortcut: { key: 'ArrowLeft' }, preventDefault: false, onShortcut: (e) => { e.stopPropagation(); adjustBy(-step); } },
    { shortcut: { key: 'ArrowRight' }, preventDefault: false, onShortcut: (e) => { e.stopPropagation(); adjustBy(step); } },
    { shortcut: { key: 'Enter' }, preventDefault: false, onShortcut: (e) => { e.stopPropagation(); select(displayValue); } },
  ]}
>
  <legend class="sr-only">{$t('rating')}</legend>
  <div class="stars" data-testid="half-star-container">
    {#each Array.from({ length: count }) as _, i (i)}
      <div
        class="star-container"
        role="group"
        onmousemove={(e) => {
          if (readOnly) {
            return;
          }
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const isLeft = e.clientX - rect.left < rect.width / 2;
          setHover(i + (isLeft ? 0.5 : 1));
        }}
        aria-label={$t('rating_count', { values: { count: i + 1 } })}
      >
        <Icon icon={starIcon} size={size} strokeWidth={1} color="transparent" strokeColor="#c1cce8" class="star bg" />
        <div class="fill-clip" style={`width:${fills[i]}%`} aria-hidden="true">
          <Icon icon={starIcon} size={size} strokeWidth={1} color="currentcolor" strokeColor="currentcolor" class="star fill" />
        </div>
        {#if !readOnly}
          <!-- 左半星：0.5 分 -->
          <button
            type="button"
            class="hitbox left"
            title={$t('rating_count', { values: { count: i + 0.5 } })}
            onmouseenter={() => setHover(i + 0.5)}
            onclick={() => select(i + 0.5)}
            aria-label={$t('rating_count', { values: { count: i + 0.5 } })}
            tabindex={-1}
          >
            <span class="sr-only">{$t('rating_count', { values: { count: i + 0.5 } })}</span>
          </button>
          <!-- 右半星：整星 -->
          <button
            type="button"
            class="hitbox right"
            title={$t('rating_count', { values: { count: i + 1 } })}
            onmouseenter={() => setHover(i + 1)}
            onclick={() => select(i + 1)}
            aria-label={$t('rating_count', { values: { count: i + 1 } })}
            tabindex={-1}
          >
            <span class="sr-only">{$t('rating_count', { values: { count: i + 1 } })}</span>
          </button>
        {/if}
      </div>
    {/each}
  </div>
</fieldset>
{#if ratingSelection > 0 && !readOnly && showClear}
  <button type="button" onclick={() => select(0)} class="cursor-pointer text-xs text-primary">{$t('rating_clear')}</button>
{/if}

<style>
  .stars {
    display: inline-flex;
    gap: 2px;
    line-height: 0;
  }
  .star-container {
    position: relative;
    display: inline-flex;
  }
  .fill-clip {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    overflow: hidden;
    pointer-events: none;
  }
  .hitbox {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 50%;
    background: transparent;
    cursor: pointer;
  }
  .hitbox.left { left: 0; }
  .hitbox.right { right: 0; }
</style>