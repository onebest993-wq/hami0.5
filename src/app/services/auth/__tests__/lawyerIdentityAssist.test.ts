import { describe, expect, it } from 'vitest';
import { assessFaceAssistPresence } from '@/app/services/auth/lawyerIdentityAssist';

describe('lawyerIdentityAssist', () => {
    it('assesses face assist presence honestly', () => {
        expect(
            assessFaceAssistPresence({
                idFrontDataUrl: null,
                faceSelfieDataUrl: 'x'.repeat(1000),
            }).ready,
        ).toBe(false);
        expect(
            assessFaceAssistPresence({
                idFrontDataUrl: 'data:image/png;base64,id',
                faceSelfieDataUrl: 'short',
            }).ready,
        ).toBe(false);
        expect(
            assessFaceAssistPresence({
                idFrontDataUrl: 'data:image/png;base64,id',
                faceSelfieDataUrl: 'x'.repeat(1000),
            }).ready,
        ).toBe(true);
    });
});
