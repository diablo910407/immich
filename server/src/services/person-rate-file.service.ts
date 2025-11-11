import fs from 'node:fs';
import path from 'node:path';

export type PersonRatePayload = {
  looks?: number;
  body?: number;
  content?: number;
  overall?: number;
  updatedAt?: string;
};

// 解析仓库根目录（兼容 dev 容器中 /usr/src/app 以及直接在 server/ 下运行两种情况）
function resolveRepoRoot() {
  const cwd = process.cwd();
  const isRepoRoot = fs.existsSync(path.join(cwd, 'server')) && fs.existsSync(path.join(cwd, 'web'));
  if (isRepoRoot) {
    return cwd;
  }
  const parent = path.resolve(cwd, '..');
  const parentLooksLikeRoot = fs.existsSync(path.join(parent, 'server')) && fs.existsSync(path.join(parent, 'web'));
  return parentLooksLikeRoot ? parent : cwd;
}

function resolveDataDir() {
  // 严格使用 docker/.env 中的 DB_DATA_LOCATION；若未配置，则使用新路径的默认值（data/postgres）
  const repoRoot = resolveRepoRoot();
  // 以 docker 目录为基准进行相对路径解析，保持与 docker-compose 的语义一致
  const dockerRoot = fs.existsSync(path.join(repoRoot, 'docker')) ? path.join(repoRoot, 'docker') : repoRoot;
  const dbDataLocation = process.env.DB_DATA_LOCATION?.trim();
  const base = dbDataLocation && dbDataLocation.length > 0 ? dbDataLocation : './data/postgres';
  const target = path.isAbsolute(base) ? base : path.join(dockerRoot, base);
  // eslint-disable-next-line no-console
  console.debug('[person-rate-file] 数据目录解析:', {
    target,
    base,
    repoRoot,
    dockerRoot,
    source: dbDataLocation ? 'DB_DATA_LOCATION' : 'default',
  });
  return target;
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