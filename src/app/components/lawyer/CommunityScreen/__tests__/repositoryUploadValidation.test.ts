import { describe, expect, it } from 'vitest';
import {
    REPOSITORY_UPLOAD_MAX_BYTES,
    sanitizeRepositoryUploadDescription,
    sanitizeRepositoryUploadTitle,
    validateRepositoryUploadFile,
    validateRepositoryUploadFileContents,
} from '../repositoryUploadValidation';

const makeFile = (name: string, size = 1024): File =>
    new File([new Uint8Array(size)], name, { type: 'application/octet-stream' });

describe('repositoryUploadValidation', () => {
    it('يقبل PDF للمستندات', () => {
        expect(validateRepositoryUploadFile(makeFile('a.pdf'), 'document')).toBeNull();
    });

    it('يرفض امتداداً غير مسموح', () => {
        expect(validateRepositoryUploadFile(makeFile('evil.exe'), 'document')).toMatch(/PDF/);
    });

    it('يرفض الملفات الكبيرة', () => {
        const big = makeFile('big.pdf', REPOSITORY_UPLOAD_MAX_BYTES + 1);
        expect(validateRepositoryUploadFile(big, 'document')).toMatch(/10MB/);
    });

    it('يقصّ العنوان والوصف', () => {
        expect(sanitizeRepositoryUploadTitle(`  ${'أ'.repeat(300)}  `).length).toBe(200);
        expect(sanitizeRepositoryUploadDescription(` ${'ب'.repeat(5000)} `).length).toBe(4000);
    });

    it('يرفض SVG مموّهاً كصورة PNG', async () => {
        const svg = new File(['<svg xmlns="http://www.w3.org/2000/svg"></svg>'], 'a.png', {
            type: 'image/png',
        });
        expect(await validateRepositoryUploadFileContents(svg, 'image')).toMatch(/نوع الملف/);
    });

    it('يقبل PDF ببصمة %PDF', async () => {
        const pdf = new File(['%PDF-1.4\n'], 'a.pdf', { type: 'application/pdf' });
        expect(await validateRepositoryUploadFileContents(pdf, 'document')).toBeNull();
    });
});
