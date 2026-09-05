import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getRepositoryMediaKind } from '@/app/services/forum/repositoryMediaKind';

const MIGRATION = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20260830140000_forum_repository_media_kind.sql'),
    'utf8',
);

function sqlMediaKind(mimeType: string, fileName: string): 'image' | 'pdf' | 'document' {
    const imageExt = /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i;
    const pdfExt = /\.pdf$/i;
    if (mimeType.startsWith('image/') || imageExt.test(fileName)) return 'image';
    if (mimeType === 'application/pdf' || pdfExt.test(fileName)) return 'pdf';
    return 'document';
}

describe('getRepositoryMediaKind يطابق عمود media_kind', () => {
    it('الهجرة تولّد العمود بنفس القواعد', () => {
        expect(MIGRATION).toContain("mime_type LIKE 'image/%'");
        expect(MIGRATION).toContain("mime_type = 'application/pdf'");
        expect(MIGRATION).toContain('jpe?g|png|webp|gif|bmp|heic|heif');
    });

    const cases: Array<{ mime: string; name: string }> = [
        { mime: 'image/jpeg', name: 'x.bin' },
        { mime: 'application/octet-stream', name: 'photo.PNG' },
        { mime: 'application/pdf', name: 'عقد.pdf' },
        { mime: 'application/octet-stream', name: 'حكم.PDF' },
        { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', name: 'مذكرة.docx' },
    ];

    for (const { mime, name } of cases) {
        it(`${name} / ${mime}`, () => {
            expect(getRepositoryMediaKind(mime, name)).toBe(sqlMediaKind(mime, name));
        });
    }
});
