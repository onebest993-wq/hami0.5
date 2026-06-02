import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

const SOURCE_EXTS = ['.tsx', '.ts', '.jsx', '.js', '.mjs'] as const;

/**
 * When Foo.tsx and Foo/ coexist (common in this codebase), Node/Vite on Windows
 * may resolve `import './Foo'` to the directory. That breaks dev dynamic imports.
 * Prefer the sibling source file when it exists.
 */
export function preferFileOverDirectory(projectRoot: string): Plugin {
  const srcRoot = path.join(projectRoot, 'src');

  return {
    name: 'hami-prefer-file-over-directory',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!importer || source.includes('\0')) return null;
      if (!source.startsWith('.') && !source.startsWith('@/')) return null;
      if (/\.[a-zA-Z0-9?#]+$/.test(source.split('?')[0] ?? source)) return null;

      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!resolved) return null;

      const id = (typeof resolved === 'object' ? resolved.id : resolved)?.split('?')[0];
      if (!id) return null;

      let stat: fs.Stats;
      try {
        stat = fs.statSync(id);
      } catch {
        return null;
      }
      if (!stat.isDirectory()) return null;

      const basePath = source.startsWith('@/')
        ? path.join(srcRoot, source.slice(2))
        : path.resolve(path.dirname(importer.split('?')[0]!), source);

      for (const ext of SOURCE_EXTS) {
        const candidate = `${basePath}${ext}`;
        try {
          if (fs.statSync(candidate).isFile()) return candidate;
        } catch {
          /* try next */
        }
      }

      return null;
    },
  };
}
