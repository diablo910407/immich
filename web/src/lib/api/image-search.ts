// 以图搜图前端 API（调用后端真实接口）
// 注意：后端接口路径为 '/api/image-search'，表单需包含 file(File) 与 mode('face'|'similar')

export type ImageSearchRequest = FormData;
export type ImageSearchAsset = { id: string; fileName?: string };
export type ImageSearchScores = { overall?: number; face?: number; color?: number; content?: number };
export type ImageSearchItem = { personName?: string; scores?: ImageSearchScores; assets: ImageSearchAsset[] };
export type ImageSearchResponse = { results: ImageSearchItem[] };

export async function searchByImage(body: ImageSearchRequest): Promise<ImageSearchResponse> {
  const res = await fetch('/api/image-search', { method: 'POST', body });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`image search failed: ${res.status} ${text}`);
  }
  return (await res.json()) as ImageSearchResponse;
}