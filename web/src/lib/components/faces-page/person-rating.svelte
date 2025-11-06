<script lang="ts">
  import StarRating from '$lib/elements/StarRating.svelte';
  import FractionalStars from '$lib/elements/fractional-stars.svelte';
  import type { PersonResponseDto } from '@immich/sdk';
  import { personRatingStore } from '$lib/stores/person-rating.store';
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

  onMount(() => {
    unsubscribe = personRatingStore.subscribe((state) => {
      rating = state[person.id] ?? personRatingStore.ensure(person.id);
    });
  });
  onDestroy(() => unsubscribe?.());

  function set(dim: 'looks' | 'body' | 'content', value: number) {
    personRatingStore.setDimension(person.id, dim, value);
  }
</script>

<div class="rating-box">
  <div class="row text-primary">
    <span class="label">{labels.looks}：</span>
    <div class="stars-wrap">
      <StarRating count={5} rating={rating.looks} showClear={false} onRating={(v) => set('looks', v)} />
    </div>
  </div>
  <div class="row text-primary">
    <span class="label">{labels.body}：</span>
    <div class="stars-wrap">
      <StarRating count={5} rating={rating.body} showClear={false} onRating={(v) => set('body', v)} />
    </div>
  </div>
  <div class="row text-primary">
    <span class="label">{labels.content}：</span>
    <div class="stars-wrap">
      <StarRating count={5} rating={rating.content} showClear={false} onRating={(v) => set('content', v)} />
    </div>
  </div>
  <div class="row text-primary" data-overall={rating.overall.toFixed(2)}>
    <span class="label">{labels.overall}：</span>
    <div class="stars-wrap">
      <FractionalStars value={rating.overall} count={5} size="1.35em" />
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