import { beforeEach, describe, expect, it, vi } from 'vitest';

const captureMessage = vi.fn(async () => undefined);

vi.mock('@/app/observability/sentryClient', () => ({
    sentryCaptureMessage: captureMessage,
}));

import {
    __resetCorruptStorageSignalForTests,
    signalIfUnreadableProtected,
} from '@/app/services/dossierPersistence/corruptStorageSignal';

const TRUNCATED = '[{"id":"case-1","title":"دعوى';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('إشارة التلف المخزون', () => {
    beforeEach(() => {
        captureMessage.mockClear();
        __resetCorruptStorageSignalForTests();
    });

    it('يُبلِغ عن مفتاح محمي لا يُقرأ', async () => {
        signalIfUnreadableProtected('lawyer_files', TRUNCATED, 'read');
        await flush();

        expect(captureMessage).toHaveBeenCalledTimes(1);
        const [message, extras] = captureMessage.mock.calls[0] as [string, Record<string, unknown>];
        expect(message).toContain('lawyer_files');
        expect(extras.phase).toBe('read');
    });

    it('يُبلِغ مرّة واحدة لكل مفتاح مهما تكرّرت المحاولة', async () => {
        signalIfUnreadableProtected('lawyer_files', TRUNCATED, 'read');
        signalIfUnreadableProtected('lawyer_files', TRUNCATED, 'write');
        signalIfUnreadableProtected('lawyer_files', TRUNCATED, 'read');
        await flush();

        expect(captureMessage).toHaveBeenCalledTimes(1);
    });

    it('يصمت عن البيانات السليمة وعن الفراغ', async () => {
        signalIfUnreadableProtected('lawyer_files', '[{"id":"a"}]', 'read');
        signalIfUnreadableProtected('lawyer_files', '[]', 'read');
        signalIfUnreadableProtected('lawyer_files', null, 'read');
        await flush();

        expect(captureMessage).not.toHaveBeenCalled();
    });

    it('يصمت عن المفاتيح غير المحمية — الضجيج يُدرَّب على تجاهله', async () => {
        signalIfUnreadableProtected('hami:ui:scratch', TRUNCATED, 'read');
        await flush();

        expect(captureMessage).not.toHaveBeenCalled();
    });
});
