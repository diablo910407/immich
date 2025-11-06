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
  <div class="row text-primary">
    <span class="label">{labels.overall}：</span>
    <div class="stars-wrap">
      <FractionalStars value={rating.overall} count={5} size="1.5em" />
    </div>
    <span class="score">{rating.overall.toFixed(2)}</span>
  </div>
</div>

<style>
  .rating-box {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 6px;
    /* 缩小整体字体以让星星在窄卡片上不溢出 */
    font-size: 0.85rem;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .label {
    min-width: 36px;
    color: var(--immich-fg-muted, #666);
    font-size: 0.875rem;
    font-weight: 600; /* 维度标签加粗：颜值、身材、内容、综合 */
  }
  .stars-wrap {
    flex: 0 0 auto;
    min-width: 0; /* 允许在 flex 布局中收缩，避免溢出 */
    display: inline-flex;
  }
  .score {
    margin-left: 4px;
    color: var(--immich-fg-default, #222);
    font-size: 0.875rem;
    flex-shrink: 0;
    font-weight: 500; /* 综合分数字体与人物名一致（font-medium） */
  }
</style>