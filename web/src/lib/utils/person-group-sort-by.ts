import type { PersonResponseDto } from '@immich/sdk';
import { personRatingStore } from '$lib/stores/person-rating.store';

// 仅允许可视排序维度
export type PersonSortDimension = 'overall' | 'looks' | 'body' | 'content';

/**
 * 根据指定的评分维度对人物分组排序。
 * - 主排序：按维度分数从高到低；
 * - 二级排序：遇到维度分数相同，按综合分数（overall）从高到低；
 * - 稳定性：在分数均相同的情况下，保持原相对顺序（稳定排序）。
 */
export function sortPersonGroupsBy(
  people: PersonResponseDto[],
  dimension: PersonSortDimension = 'overall',
): PersonResponseDto[] {
  const arr = people.slice();

  arr.sort((a, b) => {
    const ra = personRatingStore.get(a.id);
    const rb = personRatingStore.get(b.id);

    const dimA = (ra?.[dimension] ?? 0) as number;
    const dimB = (rb?.[dimension] ?? 0) as number;

    if (dimA !== dimB) {
      return dimB - dimA;
    }

    const overallA = ra?.overall ?? 0;
    const overallB = rb?.overall ?? 0;
    if (overallA !== overallB) {
      return overallB - overallA;
    }

    return 0;
  });

  return arr;
}

/**
 * 保持原有默认逻辑：
 * - 先按 overall 从高到低；
 * - overall 相同则按 looks 从高到低。
 */
export function sortPersonGroupsDefault(people: PersonResponseDto[]): PersonResponseDto[] {
  const arr = people.slice();

  arr.sort((a, b) => {
    const ra = personRatingStore.get(a.id);
    const rb = personRatingStore.get(b.id);

    const overallA = ra?.overall ?? 0;
    const overallB = rb?.overall ?? 0;

    if (overallA !== overallB) {
      return overallB - overallA;
    }

    const looksA = ra?.looks ?? 0;
    const looksB = rb?.looks ?? 0;
    if (looksA !== looksB) {
      return looksB - looksA;
    }

    return 0;
  });

  return arr;
}