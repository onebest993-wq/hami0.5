import { describe, expect, it } from 'vitest';
import { VAULT_MAX_FILE_SIZE } from '@/app/services/vaultUploadService';
import {
    COMPOSE_SAVE_BLOCK_TOAST,
    resolveComposeSaveBlock,
} from '@/app/components/lawyer/SmartRepository/hooks/repositoryComposeSaveRules';

function file(name: string, type: string, size = 8): File {
    const blob = new File(['x'], name, { type });
    if (size === blob.size) return blob;
    Object.defineProperty(blob, 'size', { value: size });
    return blob;
}

describe('repositoryComposeSaveRules', () => {
    it('يرفض المسودة الفارغة', () => {
        expect(resolveComposeSaveBlock({ title: '  ', plain: '', attachmentFile: null })).toBe(
            'empty',
        );
        expect(COMPOSE_SAVE_BLOCK_TOAST.empty).toContain('عنواناً');
    });

    it('يقبل عنواناً أو نصاً بلا مرفق', () => {
        expect(resolveComposeSaveBlock({ title: 'مذكرة', plain: '', attachmentFile: null })).toBeNull();
        expect(resolveComposeSaveBlock({ title: '', plain: 'نص', attachmentFile: null })).toBeNull();
    });

    it('يرفض SVG وأي نوع غير صورة/PDF', () => {
        expect(
            resolveComposeSaveBlock({
                title: 'مسح',
                plain: '',
                attachmentFile: file('logo.svg', 'image/svg+xml'),
            }),
        ).toBe('type');
        expect(
            resolveComposeSaveBlock({
                title: 'ملف',
                plain: '',
                attachmentFile: file('note.exe', 'application/octet-stream'),
            }),
        ).toBe('type');
        expect(COMPOSE_SAVE_BLOCK_TOAST.type).toContain('PDF');
    });

    it('يقبل JPEG وPDF ضمن الحد', () => {
        expect(
            resolveComposeSaveBlock({
                title: '',
                plain: '',
                attachmentFile: file('scan.jpg', 'image/jpeg'),
            }),
        ).toBeNull();
        expect(
            resolveComposeSaveBlock({
                title: '',
                plain: '',
                attachmentFile: file('brief.pdf', 'application/pdf'),
            }),
        ).toBeNull();
    });

    it('يرفض ما يتجاوز 50 م.ب', () => {
        expect(
            resolveComposeSaveBlock({
                title: 'كبير',
                plain: '',
                attachmentFile: file('huge.pdf', 'application/pdf', VAULT_MAX_FILE_SIZE + 1),
            }),
        ).toBe('size');
        expect(COMPOSE_SAVE_BLOCK_TOAST.size).toContain('50');
    });
});
