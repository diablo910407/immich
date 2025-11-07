import { updatePerson } from '@immich/sdk';
import type { PersonRatingDimensions } from '$lib/stores/person-rating.store';

/**
 * 将评分写回后端 person.rate，隔离类型不兼容问题并统一日志输出。
 * 注意：不触发前端即时排序，排序仅在重新进入页面或列表变化时刷新。
 */
export async function updatePersonRate(personId: string, rate: PersonRatingDimensions): Promise<void> {
  const payload: any = { rate };
  try {
    // 由于本地 store 类型与 SDK DTO 可能未完全同步，这里使用 any 进行隔离
    await updatePerson({ id: personId, personUpdateDto: payload as any });
    console.debug('[person-rate] 后端写入成功', { personId, rate });
  } catch (error) {
    console.error('[person-rate] 后端写入失败', error);
    throw error;
  }
}