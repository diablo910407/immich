// 以图搜图接口预留（前端占位，无后端实现）
// 说明：为避免改动现有 SDK 与服务器，仅提供一个简单的 fetch 占位，
// 后续后端实现后，将该路径替换为真实接口（如 /api/search/image 或 /api/images/search）。

export type ImageSearchRequest = FormData; // 需要包含 image(File) 与 mode('face'|'similar')
export type ImageSearchResponse = { queryId: string };

export async function searchByImage(body: ImageSearchRequest): Promise<ImageSearchResponse> {
  // 仅预留：当前返回一个随机查询 ID；
  // 后续接入后端时，替换为真实 fetch 调用并返回结果。
  // 示例：
  // const res = await fetch('/api/image-search', { method: 'POST', body });
  // if (!res.ok) throw new Error('image search failed');
  // return (await res.json()) as ImageSearchResponse;

  const queryId = `Q_${Date.now()}`;
  return Promise.resolve({ queryId });
}