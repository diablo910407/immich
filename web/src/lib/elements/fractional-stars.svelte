<script lang="ts">
  import { Icon } from '@immich/ui';
  const starIcon =
    'M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z';

  // 评分值（0..count），支持小数
  export let value = 0;
  export let count = 5;
  // 与 StarRating 保持一致，使用 em 尺寸以跟随父容器字体缩放
  export let size: string = '1.5em';
  export let title = '';

  $: clamped = Math.max(0, Math.min(count, value));
  // 为每一颗星单独计算填充比例，避免因间距导致的小数显示误差
  $: fills = Array.from({ length: count }, (_, i) => Math.max(0, Math.min(1, clamped - i)) * 100);
</script>

<div class="stars" aria-label={title} title={title}>
  {#each Array.from({ length: count }) as _, i (i)}
    <div class="star-container">
      <Icon icon={starIcon} size={size} strokeWidth={1} color="transparent" strokeColor="#c1cce8" class="star bg" />
      <div class="fill-clip" style={`width:${fills[i]}%`} aria-hidden="true">
        <Icon icon={starIcon} size={size} strokeWidth={1} color="currentcolor" strokeColor="currentcolor" class="star fill" />
      </div>
    </div>
  {/each}
  <slot />
  <!-- 与 StarRating 保持一致：颜色由父元素控制（例如 text-primary） -->
</div>

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
  /* Icon 自身为 inline-flex，无需额外选择器 */
</style>