import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** نص `vite.config.mts` — عقد العزل الحي، لا أسماء chunks متقاعدة. */
export function readViteConfigSource(): string {
    return readFileSync(join(process.cwd(), 'vite.config.mts'), 'utf8');
}

/** جسم دالة واحدة في إعداد Vite — يمنع تأكيدات `[\s\S]*` على بقية الملف. */
export function extractViteFunction(src: string, name: string): string {
    const start = src.indexOf(`function ${name}`);
    if (start < 0) return '';
    const brace = src.indexOf('{', start);
    if (brace < 0) return '';
    let depth = 0;
    for (let i = brace; i < src.length; i += 1) {
        const ch = src[i];
        if (ch === '{') depth += 1;
        else if (ch === '}') {
            depth -= 1;
            if (depth === 0) return src.slice(start, i + 1);
        }
    }
    return src.slice(start);
}
