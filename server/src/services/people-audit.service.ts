import { Injectable } from '@nestjs/common';
import path from 'node:path';
import fs from 'node:fs';
import { StorageCore } from 'src/cores/storage.core';
import { BaseService } from 'src/services/base.service';
import { AuthDto } from 'src/dtos/auth.dto';
import { PeoplePathAuditResponseDto } from 'src/dtos/people-audit.dto';

@Injectable()
export class PeopleAuditService extends BaseService {
  private volumeMappings: { container: string; host: string }[] | null = null;

  private loadComposeMappings(): { container: string; host: string }[] {
    if (this.volumeMappings) {
      return this.volumeMappings;
    }
    try {
      const projectRoot = path.resolve(__dirname, '../../../');
      const composePath = path.join(projectRoot, 'docker', 'docker-compose.dev.yml');
      const envPath = path.join(projectRoot, 'docker', '.env');
      const compose = fs.readFileSync(composePath, 'utf8');
      const env: Record<string, string> = {};
      try {
        const envContent = fs.readFileSync(envPath, 'utf8');
        for (const line of envContent.split(/\r?\n/)) {
          const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
          if (m) env[m[1]] = m[2];
        }
      } catch {}

      const maps: { container: string; host: string }[] = [];
      const lines = compose.split(/\r?\n/);
      let inServices = false;
      let servicesIndent = -1;
      let inServer = false;
      let serverIndent = -1;
      for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const indent = (raw.match(/^\s*/)?.[0].length) ?? 0;
        const line = raw.trim();

        // enter services section
        if (!inServices && line === 'services:') {
          inServices = true;
          servicesIndent = indent;
          continue;
        }

        if (!inServices) continue;

        // detect service headers (same indent level under services)
        if (line.endsWith(':') && indent > servicesIndent) {
          const name = line.slice(0, -1);
          if (name === 'immich-server') {
            inServer = true;
            serverIndent = indent;
            continue;
          }
          // leaving immich-server block when next service encountered
          if (inServer && indent === serverIndent) {
            inServer = false;
          }
        }

        if (!inServer) continue;

        // find volumes within immich-server block
        if (line === 'volumes:' && indent > serverIndent) {
          const volumesIndent = indent;
          // collect following hyphen lines with deeper indent
          for (let j = i + 1; j < lines.length; j++) {
            const raw2 = lines[j];
            const indent2 = (raw2.match(/^\s*/)?.[0].length) ?? 0;
            const line2 = raw2.trim();
            if (indent2 <= volumesIndent) {
              break;
            }
            if (!line2.startsWith('-')) {
              continue;
            }
            let vol = line2.replace(/^-\s*/, '');
            vol = vol.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
            vol = vol.split('#')[0].trim();
            const sepIdx = vol.lastIndexOf(':/');
            if (sepIdx > 1) {
              let host = vol.slice(0, sepIdx);
              const rest = vol.slice(sepIdx + 1); // starts with /container[:mode]
              const container = rest.split(':')[0];
              host = host.replace(/\$\{([^}]+)\}/g, (_, v) => env[v] ?? process.env[v] ?? '');
              if (container.startsWith('/')) {
                maps.push({ container, host });
              }
            }
          }
        }
      }
      // sort longest container prefix first
      maps.sort((a, b) => b.container.length - a.container.length);
      this.volumeMappings = maps;
      return maps;
    } catch {
      return [];
    }
  }

  private toHostAbsolute(abs: string): string {
    const maps = this.loadComposeMappings();
    for (const { container, host } of maps) {
      if (abs === container || abs.startsWith(container + '/')) {
        const sub = abs.slice(container.length).replace(/^\//, '');
        const joined = path.win32.join(host, sub).replace(/\\/g, '/');
        const isWindows = /^[A-Za-z]:\\/.test(joined) || joined.startsWith('\\\\');
        if (isWindows) {
          return joined;
        }
        return joined;
      }
    }
    return abs;
  }
  async getPeopleMultiPath(auth: AuthDto): Promise<PeoplePathAuditResponseDto> {
    const map = new Map<string, { name: string; paths: Set<string>; ownerId: string }>();

    const rows = this.personRepository.streamPersonAssetOriginalPaths(auth.user.id);
    const users = await this.userRepository.getList();
    const storageLabelMap = new Map<string, string | null>();
    for (const u of users) {
      storageLabelMap.set(u.id, u.storageLabel || null);
    }
    let count = 0;
    for await (const row of rows as any) {
      count++;
      const personId: string = row.personId;
      const ownerId: string = row.ownerId;
      const personName: string = row.personName ?? '';
      const originalPath: string = row.originalPath ?? '';
      const isExternal: boolean = !!row.isExternal;
      if (!personId || !originalPath) continue;
      const dir = originalPath.replace(/[\\\/][^\\\/]*$/, '');
      let abs = dir;
      if (!/^([A-Za-z]:\/|\\\\|\/)/.test(dir)) {
        const base = StorageCore.getLibraryFolder({ id: ownerId, storageLabel: storageLabelMap.get(ownerId) || null });
        abs = path.normalize(path.join(base, dir));
      }
      abs = this.toHostAbsolute(abs);
      const entry = map.get(personId) ?? { name: personName, paths: new Set<string>(), ownerId };
      entry.paths.add(abs);
      map.set(personId, entry);
      if (count % 100000 === 0) {
        this.logger.debug(`PeopleAudit: processed ${count} rows`);
      }
    }

    const result: PeoplePathAuditResponseDto = [];
    for (const [id, { name, paths }] of map) {
      if (paths.size > 1) {
        result.push({ id, name, paths: Array.from(paths) });
      }
    }
    this.logger.debug(`PeopleAudit: found ${result.length} people with multi-path assets`);
    return result;
  }
}
