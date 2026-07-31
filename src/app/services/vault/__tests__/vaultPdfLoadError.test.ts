import { describe, expect, it } from 'vitest';
import {
    classifyVaultPdfLoadError,
    VaultPdfLoadError,
} from '@/app/services/vault/vaultPdfDocument';

describe('classifyVaultPdfLoadError', () => {
    it('classifies pdf.js password and invalid exceptions', () => {
        expect(classifyVaultPdfLoadError({ name: 'PasswordException', message: 'x' })).toBe('password');
        expect(classifyVaultPdfLoadError({ name: 'InvalidPDFException', message: 'x' })).toBe('invalid');
    });

    it('keeps the kind of VaultPdfLoadError instances', () => {
        expect(classifyVaultPdfLoadError(new VaultPdfLoadError('timeout', 'pdf load timeout'))).toBe('timeout');
        expect(classifyVaultPdfLoadError(new VaultPdfLoadError('invalid', 'pdf empty'))).toBe('invalid');
    });

    it('classifies empty/structurally broken payload messages as invalid', () => {
        expect(classifyVaultPdfLoadError(new Error('pdf empty'))).toBe('invalid');
        expect(classifyVaultPdfLoadError(new Error('Invalid PDF structure.'))).toBe('invalid');
    });

    it('treats unknown failures as transient (retryable)', () => {
        expect(classifyVaultPdfLoadError(new Error('Failed to fetch'))).toBe('transient');
        expect(classifyVaultPdfLoadError(undefined)).toBe('transient');
    });
});
