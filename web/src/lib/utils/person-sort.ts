import type { PersonResponseDto } from '@immich/sdk';
import { personRatingStore } from '$lib/stores/person-rating.store';

/**
 * 根据本地评分对人物进行排序：
 * 1) overall 为 0（未评分）排在最前；
 * 2) 其余按 overall 从高到低；
 * 3) overall 两位小数相同则按 looks 从高到低；
 * 4) 其它保持原相对顺序（稳定排序行为依赖运行环境）。
 */
export function sortPeopleByRating(people: PersonResponseDto[]): PersonResponseDto[] {
  const arr = people.slice();

  arr.sort((a, b) => {
    const ra = personRatingStore.get(a.id);
    const rb = personRatingStore.get(b.id);

    const overallA = ra?.overall ?? 0;
    const overallB = rb?.overall ?? 0;

    const isZeroA = overallA === 0;
    const isZeroB = overallB === 0;

    // overall 为 0 的未评分卡片靠前
    if (isZeroA !== isZeroB) {
      return isZeroA ? -1 : 1;
    }

    // 都为 0：相对顺序不重要，返回 0 以尽可能保持原顺序
    if (isZeroA && isZeroB) {
      return 0;
    }

    // 其余按 overall 从高到低
    if (overallA !== overallB) {
      return overallB - overallA;
    }

    // overall 两位小数完全一致时，按 looks 从高到低
    const looksA = ra?.looks ?? 0;
    const looksB = rb?.looks ?? 0;
    return looksB - looksA;
  });

  return arr;
}