import { describe, expect, it } from 'vitest';
import {
    isAllowedVaultImageMeta,
    isSafeVaultPreviewUrl,
    isScriptableVaultMedia,
    sanitizeVaultPlainNote,
    sanitizeVaultPreviewUrl,
} from '@/app/services/vault/vaultPreviewUrlSafety';

describe('vaultPreviewUrlSafety', () => {
    it('accepts blob, https, and raster data URLs', () => {
        expect(isSafeVaultPreviewUrl('blob:http://localhost:8080/abc')).toBe(true);
        expect(isSafeVaultPreviewUrl('https://cdn.example/doc.pdf')).toBe(true);
        expect(isSafeVaultPreviewUrl('data:image/jpeg;base64,QQ==')).toBe(true);
        expect(isSafeVaultPreviewUrl('data:application/pdf;base64,abc')).toBe(true);
        expect(isSafeVaultPreviewUrl('http://localhost:8080/x')).toBe(true);
    });

    it('rejects javascript, html data, svg, and remote http', () => {
        expect(isSafeVaultPreviewUrl('javascript:alert(1)')).toBe(false);
        expect(isSafeVaultPreviewUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
        expect(isSafeVaultPreviewUrl('data:image/svg+xml,<svg></svg>')).toBe(false);
        expect(isSafeVaultPreviewUrl('http://evil.example/x')).toBe(false);
        expect(sanitizeVaultPreviewUrl('javascript:alert(1)')).toBeNull();
    });

    it('rejects scriptable image types', () => {
        expect(isScriptableVaultMedia('image/svg+xml', 'x.svg')).toBe(true);
        expect(isAllowedVaultImageMeta('image/svg+xml', 'photo.svg')).toBe(false);
        expect(isAllowedVaultImageMeta('image/jpeg', 'photo.jpg')).toBe(true);
        expect(isAllowedVaultImageMeta('image/png', 'scan.png')).toBe(true);
    });

    it('strips tags from vault notes', () => {
        expect(sanitizeVaultPlainNote('<img src=x onerror=alert(1)>سر')).toBe('سر');
        expect(sanitizeVaultPlainNote('javascript:alert(1)')).toBe('alert(1)');
        expect(sanitizeVaultPlainNote('   ')).toBeNull();
    });
});
