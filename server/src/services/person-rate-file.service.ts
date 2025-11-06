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

export function persistPersonRateToFile(personId: string, ownerId: string | undefined, rate: PersonRatePayload) {
  ensureDirs();
  const line = JSON.stringify({ id: personId, ownerId, rate, updatedAt: new Date().toISOString() });
  fs.appendFile(DATA_FILE, line + '\n', { encoding: 'utf8' }, (error) => {
    if (error) {
      // eslint-disable-next-line no-console
      console.error('[person-rate-file] 写入失败', error);
    } else {
      // eslint-disable-next-line no-console
      console.debug('[person-rate-file] 已写入', { personId });
    }
  });
}

export function getPersonRateDataFilePath() {
  return DATA_FILE;
}