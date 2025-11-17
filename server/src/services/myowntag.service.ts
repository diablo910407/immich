import fs from 'node:fs';
import path from 'node:path';
import { Injectable } from '@nestjs/common';
import { MyOwnTagLabelsDto } from 'src/dtos/myowntag.dto';

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
  const repoRoot = resolveRepoRoot();
  const dockerRoot = fs.existsSync(path.join(repoRoot, 'docker')) ? path.join(repoRoot, 'docker') : repoRoot;
  const dbDataLocation = process.env.DB_DATA_LOCATION?.trim();
  const base = dbDataLocation && dbDataLocation.length > 0 ? dbDataLocation : './data/postgres';
  const target = path.isAbsolute(base) ? base : path.join(dockerRoot, base);
  console.debug('[myowntag] 数据目录解析:', {
    target,
    base,
    repoRoot,
    dockerRoot,
    source: dbDataLocation ? 'DB_DATA_LOCATION' : 'default',
  });
  return target;
}

const DATA_DIR = resolveDataDir();
const FILE_PATH = path.join(DATA_DIR, 'myowntag-labels.json');

function ensureFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(FILE_PATH)) {
      fs.writeFileSync(FILE_PATH, JSON.stringify({ types: [], skills: [] }), { encoding: 'utf8' });
    }
  } catch (error) {
    console.error('[myowntag] 初始化目录/文件失败', error);
  }
}

@Injectable()
export class MyOwnTagService {
  getLabels(): MyOwnTagLabelsDto {
    ensureFile();
    try {
      const content = fs.readFileSync(FILE_PATH, { encoding: 'utf8' });
      const data = JSON.parse(content);
      const types = Array.isArray(data.types) ? data.types : [];
      const skills = Array.isArray(data.skills) ? data.skills : [];
      return { types, skills };
    } catch (error) {
      console.error('[myowntag] 读取失败', error);
      return { types: [], skills: [] };
    }
  }

  saveLabels(payload: MyOwnTagLabelsDto): void {
    ensureFile();
    try {
      const typeIds = new Set<string>(payload.types.map((t) => t.id));
      const filteredSkills = payload.skills.filter((s) => typeIds.has(s.typeId));
      const data: MyOwnTagLabelsDto = { types: payload.types, skills: filteredSkills };
      fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), { encoding: 'utf8' });
      console.debug('[myowntag] 已保存', { typeCount: data.types.length, skillCount: data.skills.length });
    } catch (error) {
      console.error('[myowntag] 保存失败', error);
      throw error;
    }
  }
}