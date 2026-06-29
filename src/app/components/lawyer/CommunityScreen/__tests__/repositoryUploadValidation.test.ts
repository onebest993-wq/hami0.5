import { describe, expect, it } from 'vitest';
import {
    REPOSITORY_UPLOAD_MAX_BYTES,
    sanitizeRepositoryUploadDescription,
    sanitizeRepositoryUploadTitle,
    validateRepositoryUploadFile,
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
});
