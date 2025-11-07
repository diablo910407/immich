import type { PersonResponseDto } from '@immich/sdk';
import { personRatingStore } from '$lib/stores/person-rating.store';

/**
 * 列表模式下的人物分组排序：
 * - 先按综合评分 overall 从高到低；
 * - 综合评分相同则按颜值 looks 从高到低；
 * - 其它保持原相对顺序（尽量稳定）。
 */
export function sortPersonGroupsForList(people: PersonResponseDto[]): PersonResponseDto[] {
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