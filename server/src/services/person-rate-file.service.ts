import fs from 'node:fs';
import path from 'node:path';

export type PersonRatePayload = {
  looks?: number;
  body?: number;
  content?: number;
  overall?: number;
  updatedAt?: string;
};

function resolveDataDir() {
  const cwd = process.cwd();
  // 优先使用仓库根目录下的 server/resources/local-data（适用于开发绑定挂载）
  const candidateA = path.join(cwd, 'server', 'resources', 'local-data');
  const serverDirExists = fs.existsSync(path.join(cwd, 'server'));
  if (serverDirExists) {
    return candidateA;
  }
  // 回退：使用当前工作目录下的 resources/local-data（适用于生产打包到 dist 下运行）
  return path.join(cwd, 'resources', 'local-data');
}

const DATA_DIR = resolveDataDir();
const DATA_FILE = path.join(DATA_DIR, 'person-ratings.ndjson');

function ensureDirs() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, '', { encoding: 'utf8' });
    }
  } catch (error) {
    // 不抛出阻止主流程，仅记录
    // eslint-disable-next-line no-console
    console.error('[person-rate-file] 初始化目录/文件失败', error);
  }
}

// 维护一个内存缓存，按人物 ID 覆盖更新，落盘时写回整文件，确保每人仅一条记录
type PersonRateRecord = { id: string; ownerId?: string; rate: PersonRatePayload; updatedAt: string };
let cache: Map<string, PersonRateRecord> | undefined;

function loadCache() {
  ensureDirs();
  if (cache) return;
  cache = new Map<string, PersonRateRecord>();
  try {
    const content = fs.readFileSync(DATA_FILE, { encoding: 'utf8' });
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    for (const line of lines) {
      try {
        const obj = JSON.parse(line) as PersonRateRecord;
        if (obj?.id) {
          cache.set(obj.id, obj);
        }
      } catch {
        // 跳过坏行
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[person-rate-file] 读取缓存失败', error);
  }
}

function flushCache() {
  if (!cache) return;
  try {
    const lines = Array.from(cache.values()).map((r) => JSON.stringify(r));
    const content = lines.length > 0 ? lines.join('\n') + '\n' : '';
    fs.writeFileSync(DATA_FILE, content, { encoding: 'utf8' });
    // eslint-disable-next-line no-console
    console.debug('[person-rate-file] 已覆盖写回', { count: cache.size });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[person-rate-file] 覆盖写回失败', error);
  }
}

export function persistPersonRateToFile(personId: string, ownerId: string | undefined, rate: PersonRatePayload) {
  ensureDirs();
  loadCache();
  const prev = cache!.get(personId);
  const record: PersonRateRecord = {
    id: personId,
    ownerId: ownerId ?? prev?.ownerId,
    rate,
    updatedAt: new Date().toISOString(),
  };
  cache!.set(personId, record);
  flushCache();
}

export function getPersonRateDataFilePath() {
  return DATA_FILE;
}