<script lang="ts">
  import HalfStarRating from '$lib/elements/HalfStarRating.svelte';
  import FractionalStars from '$lib/elements/fractional-stars.svelte';
  import type { PersonResponseDto } from '@immich/sdk';
  import { personRatingStore } from '$lib/stores/person-rating.store';
  import { updatePersonRate } from '$lib/services/person-rate.service';
  import { handleError } from '$lib/utils/handle-error';
  import { t } from 'svelte-i18n';
  import { onMount, onDestroy } from 'svelte';

  export let person: PersonResponseDto;

  const labels = {
    looks: '颜值',
    body: '身材',
    content: '内容',
    overall: '综合',
  } as const;

  let rating = personRatingStore.ensure(person.id);
  let unsubscribe: (() => void) | undefined;

  // 统一四行星星尺寸，并适当加大前三行的星星
  const starSize: string = '1.65em';
  const starColor = {
    looks: '#FF69B4',
    body: '#FF7F50',
    content: '#4169E1',
    overall: '#FFD700',
  } as const;

  onMount(() => {
    unsubscribe = personRatingStore.subscribe((state) => {
      rating = state[person.id] ?? personRatingStore.ensure(person.id);
    });
  });
  onDestroy(() => unsubscribe?.());

  async function set(dim: 'looks' | 'body' | 'content', value: number) {
    personRatingStore.setDimension(person.id, dim, value);
    const current = personRatingStore.ensure(person.id);
    try {
      await updatePersonRate(person.id, current);
    } catch (error) {
      handleError(error, $t('errors.cant_apply_changes'));
    }
  }
</script>

<div class="rating-box">
  <div class="row text-primary">
    <span class="label">{labels.looks}：</span>
    <div class="stars-wrap" style={`color:${starColor.looks}`}>
      <HalfStarRating count={5} rating={rating.looks} showClear={false} size={starSize} color={starColor.looks} onRating={(v: number) => void set('looks', v)} />
    </div>
  </div>
  <div class="row text-primary">
    <span class="label">{labels.body}：</span>
    <div class="stars-wrap" style={`color:${starColor.body}`}>
      <HalfStarRating count={5} rating={rating.body} showClear={false} size={starSize} color={starColor.body} onRating={(v: number) => void set('body', v)} />
    </div>
  </div>
  <div class="row text-primary">
    <span class="label">{labels.content}：</span>
    <div class="stars-wrap" style={`color:${starColor.content}`}>
      <HalfStarRating count={5} rating={rating.content} showClear={false} size={starSize} color={starColor.content} onRating={(v: number) => void set('content', v)} />
    </div>
  </div>
  <div class="row text-primary" data-overall={rating.overall.toFixed(2)}>
    <span class="label">{labels.overall}：</span>
    <div class="stars-wrap" style={`color:${starColor.overall}`}>
      <FractionalStars value={rating.overall} count={5} size={starSize} />
    </div>
  </div>
</div>

<style>
  .rating-box {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding-top: 3px;
    /* 缩小整体字体以让星星在窄卡片上不溢出 */
    font-size: 0.76rem;
    line-height: 1.1;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .label {
    min-width: 32px;
    color: var(--immich-fg-muted, #666);
    font-size: 0.875rem;
    font-weight: 600; /* 维度标签加粗：颜值、身材、内容、综合 */
  }
  .stars-wrap {
    flex: 0 0 auto;
    min-width: 0; /* 允许在 flex 布局中收缩，避免溢出 */
    display: inline-flex;
  }
  /* 综合分数不再显示，但通过 data-overall 保留两位小数以便后续使用 */
</style>