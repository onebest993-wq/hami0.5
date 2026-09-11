import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/services/settings/lawyerWorkCloudGate', () => ({
    isLawyerWorkCloudLive: vi.fn(() => true),
}));

vi.mock('@/app/services/settings/cloudSyncBucket', () => ({
    isLiveCloudSyncBucketEnabled: vi.fn(() => true),
}));

vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: {
        fetchSecure: vi.fn(async () => ({ ok: true })),
    },
}));

vi.mock('@/app/services/CryptoService', () => ({
    CryptoService: {
        initialize: vi.fn(async () => undefined),
        encryptData: vi.fn(async (plain: string) => `enc:${plain.length}`),
        generateDataSignature: vi.fn(async () => 'sig'),
        hasMasterKey: vi.fn(() => true),
        verifyDataSignature: vi.fn(async () => true),
        decryptData: vi.fn(async (cipher: string) => {
            if (cipher.startsWith('plain:')) return cipher.slice(6);
            return '{}';
        }),
    },
}));

vi.mock('@/app/infrastructure/persistence/LocalStorageRepository', () => ({
    persistenceRepository: {
        loadAsync: vi.fn(async () => []),
        save: vi.fn(),
    },
}));

vi.mock('@/app/utils/executionFilesStorage', () => ({
    saveExecutionFilesRawImmediate: vi.fn(),
    resolveExecutionFilesStorageKey: vi.fn(() => 'hami:execution:v1:u1'),
}));

vi.mock('@/app/utils/liveAuthUserId', () => ({
    resolveLiveAuthUserIdForStorage: vi.fn(() => 'u1'),
}));

vi.mock('@/app/domain/lawsuit/lawsuitSegmentStorage', () => ({
    collectLawsuitLocalRowsForSync: vi.fn(() => [{ id: 'ls-1' }]),
    applyLawsuitMonolithicMergeToSegments: vi.fn(),
}));

vi.mock('@/app/observability/sentryClient', () => ({
    sentryCaptureMessage: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/app/services/cloud/workCloudCheckpointCalendar', () => ({
    parseCalendarCheckpointSlice: (raw: { calendar?: unknown; calendarTombstones?: unknown }) => ({
        events: Array.isArray(raw.calendar) ? raw.calendar : [],
        tombstones:
            raw.calendarTombstones && typeof raw.calendarTombstones === 'object'
                ? raw.calendarTombstones
                : {},
    }),
    collectCalendarCheckpointSlice: vi.fn(async () => ({ events: [], tombstones: {} })),
    applyCalendarCheckpointSlice: vi.fn(async () => 0),
}));

import {
    cancelScheduledWorkCloudCheckpoint,
    parseWorkCloudCheckpointPayload,
    pushWorkCloudCheckpointNow,
    pushWorkCloudCheckpointNowRetryingOnce,
    restoreLastWorkCloudCheckpoint,
    scheduleWorkCloudCheckpoint,
} from '@/app/services/cloud/workCloudCheckpoint';
import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { isLawyerWorkCloudLive } from '@/app/services/settings/lawyerWorkCloudGate';
import { isLiveCloudSyncBucketEnabled } from '@/app/services/settings/cloudSyncBucket';
import { saveExecutionFilesRawImmediate } from '@/app/utils/executionFilesStorage';
import { STORAGE_KEYS } from '@/app/utils/constants';
import { CALENDAR_EVENTS_STORAGE_KEY } from '@/app/services/calendar/calendarStorageKeys';
import { CryptoService } from '@/app/services/CryptoService';
import { sentryCaptureMessage } from '@/app/observability/sentryClient';
import {
    applyLawsuitMonolithicMergeToSegments,
    collectLawsuitLocalRowsForSync,
} from '@/app/domain/lawsuit/lawsuitSegmentStorage';
import {
    applyCalendarCheckpointSlice,
    collectCalendarCheckpointSlice,
} from '@/app/services/cloud/workCloudCheckpointCalendar';

describe('parseWorkCloudCheckpointPayload', () => {
    it('يرفض الحمولة بلا إصدار', () => {
        expect(parseWorkCloudCheckpointPayload({ lawsuits: [] })).toBeNull();
    });

    it('يقبل نقطة العمل v1', () => {
        const parsed = parseWorkCloudCheckpointPayload({
            v: 1,
            savedAt: '2026-08-29T12:00:00.000Z',
            lawsuits: [{ id: 'a' }],
            execution: [],
            notes: [{ id: 'n' }],
        });
        expect(parsed).toEqual({
            v: 1,
            savedAt: '2026-08-29T12:00:00.000Z',
            lawsuits: [{ id: 'a' }],
            execution: [],
            notes: [{ id: 'n' }],
            calendar: [],
            calendarTombstones: {},
            calendarOmittedForBudget: false,
            calendarSlicePresent: false,
        });
    });

    it('يقبل نقطة v1 قديمة بلا حقل تقويم', () => {
        const parsed = parseWorkCloudCheckpointPayload({
            v: 1,
            savedAt: '2026-08-29T12:00:00.000Z',
            lawsuits: [{ id: 'a' }],
            execution: [],
            notes: [],
        });
        expect(parsed?.calendar).toEqual([]);
        expect(parsed?.calendarTombstones).toEqual({});
        expect(parsed?.calendarSlicePresent).toBe(false);
        expect(parsed?.calendarOmittedForBudget).toBe(false);
    });

    it('يحفظ المواعيد داخل الحزمة لا كمفتاح KV', () => {
        const parsed = parseWorkCloudCheckpointPayload({
            v: 1,
            savedAt: '2026-08-29T12:00:00.000Z',
            lawsuits: [],
            execution: [],
            notes: [],
            calendar: [{ id: 'ev-1', userId: 'u1', title: 'جلسة', date: '2026-09-01', type: 'hearing', createdAt: '', updatedAt: '' }],
            calendarTombstones: { u1: [{ eventId: 'gone', deletedAt: '2026-08-01T00:00:00.000Z' }] },
        });
        expect(parsed?.calendar).toHaveLength(1);
        expect(parsed?.calendarTombstones).toHaveProperty('u1');
        expect(parsed?.calendarSlicePresent).toBe(true);
    });
});

describe('pushWorkCloudCheckpointNow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(isLawyerWorkCloudLive).mockReturnValue(true);
        vi.mocked(isLiveCloudSyncBucketEnabled).mockImplementation(() => true);
        vi.mocked(collectLawsuitLocalRowsForSync).mockReturnValue([{ id: 'ls-1' }]);
        vi.mocked(CryptoService.encryptData).mockImplementation(async (plain: string) => `enc:${plain.length}`);
        vi.mocked(collectCalendarCheckpointSlice).mockResolvedValue({ events: [], tombstones: {} });
        vi.mocked(applyCalendarCheckpointSlice).mockResolvedValue(0);
        vi.mocked(persistenceRepository.loadAsync).mockImplementation(async (key: string) => {
            if (String(key).includes('execution')) return [{ id: 'ex-1' }];
            if (String(key).includes('notes') || String(key).includes('NOTES')) return [{ id: 'n-1' }];
            return [];
        });
    });

    afterEach(() => {
        cancelScheduledWorkCloudCheckpoint();
        vi.useRealTimers();
    });

    it('يلغي النقطة المؤجّلة قبل الدفع الفوري — لا رفع مزدوج', async () => {
        vi.useFakeTimers();
        scheduleWorkCloudCheckpoint();
        const result = await pushWorkCloudCheckpointNow();
        expect(result).toEqual({ pushed: true, skipped: false, failed: false, retryable: false });
        expect(SecureAPIClient.fetchSecure).toHaveBeenCalledTimes(1);
        const posted = JSON.parse(
            String(vi.mocked(SecureAPIClient.fetchSecure).mock.calls[0]?.[1]?.body ?? '{}'),
        ) as { keep_anchor?: boolean };
        expect(posted.keep_anchor).toBe(true);
        await vi.advanceTimersByTimeAsync(5_000);
        expect(SecureAPIClient.fetchSecure).toHaveBeenCalledTimes(1);
    });

    it('يرفض الحمولة العربية الضخمة بقياس البايتات لا المحارف', async () => {
        const arabicChunk = 'محامي'.repeat(280_000);
        vi.mocked(persistenceRepository.loadAsync).mockResolvedValue([
            { id: 'huge', note: arabicChunk },
        ]);
        const { collectLawsuitLocalRowsForSync } = await import(
            '@/app/domain/lawsuit/lawsuitSegmentStorage'
        );
        vi.mocked(collectLawsuitLocalRowsForSync).mockReturnValue([
            { id: 'huge', note: arabicChunk } as never,
        ]);

        const result = await pushWorkCloudCheckpointNow();
        expect(result).toEqual({ pushed: false, skipped: false, failed: true, retryable: false });
        expect(SecureAPIClient.fetchSecure).not.toHaveBeenCalled();
    });

    it('إن تجاوز التقويم السقف تُحفظ الإضابير دون عناوين الجلسات', async () => {
        const hugeTitle = 'موعد'.repeat(400_000);
        const { collectLawsuitLocalRowsForSync } = await import(
            '@/app/domain/lawsuit/lawsuitSegmentStorage'
        );
        vi.mocked(collectLawsuitLocalRowsForSync).mockReturnValue([{ id: 'ls-1' } as never]);
        vi.mocked(collectCalendarCheckpointSlice).mockResolvedValue({
            events: [
                {
                    id: 'ev-huge',
                    userId: 'u1',
                    title: hugeTitle,
                    date: '2026-09-01',
                    type: 'hearing',
                    createdAt: '',
                    updatedAt: '',
                },
            ],
            tombstones: {},
        });

        const result = await pushWorkCloudCheckpointNow();
        expect(result).toEqual({ pushed: true, skipped: false, failed: false, retryable: false });
        expect(SecureAPIClient.fetchSecure).toHaveBeenCalledTimes(1);
        const plain = String(vi.mocked(CryptoService.encryptData).mock.calls[0]?.[0] ?? '');
        expect(plain).toContain('ls-1');
        expect(plain).not.toContain(hugeTitle);
        expect(plain).toContain('"calendar":[]');
        expect(plain).toContain('calendarOmittedForBudget');
        const posted = JSON.parse(
            String(vi.mocked(SecureAPIClient.fetchSecure).mock.calls[0]?.[1]?.body ?? '{}'),
        ) as { keep_anchor?: boolean };
        expect(posted.keep_anchor).toBe(false);
    });

    it('لا يدفع إن السحابة غير حيّة', async () => {
        vi.mocked(isLawyerWorkCloudLive).mockReturnValue(false);
        const result = await pushWorkCloudCheckpointNow();
        expect(result).toEqual({ pushed: false, skipped: true, failed: false, retryable: false });
        expect(SecureAPIClient.fetchSecure).not.toHaveBeenCalled();
    });

    it('لا يرفع دعاوى إن سلة الملفات مطفأة', async () => {
        const { isLiveCloudSyncBucketEnabled } = await import(
            '@/app/services/settings/cloudSyncBucket'
        );
        vi.mocked(isLiveCloudSyncBucketEnabled).mockImplementation(
            (bucket: 'notes' | 'files' | 'execution') => bucket !== 'files',
        );
        const result = await pushWorkCloudCheckpointNow();
        expect(result.pushed).toBe(true);
        const plain = String(vi.mocked(CryptoService.encryptData).mock.calls[0]?.[0] ?? '');
        expect(plain).not.toContain('ls-1');
        expect(plain).toContain('ex-1');
    });

    it('ciphertext فوق سقف BFF يُرفض قبل POST', async () => {
        vi.mocked(CryptoService.encryptData).mockResolvedValue('x'.repeat(1_800_001));
        const result = await pushWorkCloudCheckpointNow();
        expect(result).toEqual({ pushed: false, skipped: false, failed: true, retryable: false });
        expect(SecureAPIClient.fetchSecure).not.toHaveBeenCalled();
    });

    it('إن تجاوز ciphertext السقف يُعاد التشفير بلا تقويم', async () => {
        vi.mocked(collectCalendarCheckpointSlice).mockResolvedValue({
            events: [
                {
                    id: 'ev-1',
                    userId: 'u1',
                    title: 'جلسة',
                    date: '2026-09-01',
                    type: 'hearing',
                    createdAt: '',
                    updatedAt: '',
                },
            ],
            tombstones: {},
        });
        let encrypts = 0;
        vi.mocked(CryptoService.encryptData).mockImplementation(async (plain: string) => {
            encrypts += 1;
            if (encrypts === 1) return 'x'.repeat(1_800_001);
            return `enc:${plain.length}`;
        });
        const result = await pushWorkCloudCheckpointNow();
        expect(result.pushed).toBe(true);
        expect(SecureAPIClient.fetchSecure).toHaveBeenCalledTimes(1);
        const secondPlain = String(vi.mocked(CryptoService.encryptData).mock.calls[1]?.[0] ?? '');
        expect(secondPlain).toContain('ls-1');
        expect(secondPlain).toContain('"calendar":[]');
        expect(secondPlain).toContain('calendarOmittedForBudget');
        expect(secondPlain).not.toContain('جلسة');
    });

    it('يرفع التقويم وحده إن السحابة حيّة والسلال مطفأة', async () => {
        vi.mocked(isLiveCloudSyncBucketEnabled).mockReturnValue(false);
        vi.mocked(collectLawsuitLocalRowsForSync).mockReturnValue([]);
        vi.mocked(persistenceRepository.loadAsync).mockResolvedValue([]);
        vi.mocked(collectCalendarCheckpointSlice).mockResolvedValue({
            events: [
                {
                    id: 'ev-only',
                    userId: 'u1',
                    title: 'جلسة',
                    date: '2026-09-01',
                    type: 'hearing',
                    createdAt: '',
                    updatedAt: '',
                },
            ],
            tombstones: {},
        });
        const result = await pushWorkCloudCheckpointNow();
        expect(result.pushed).toBe(true);
        const plain = String(vi.mocked(CryptoService.encryptData).mock.calls[0]?.[0] ?? '');
        expect(plain).toContain('جلسة');
        expect(plain).toContain('"lawsuits":[]');
    });

    it('يُرحّل شريحة السلة المطفأة من النقطة السابقة — لا تظليل للنسخة', async () => {
        vi.mocked(isLiveCloudSyncBucketEnabled).mockImplementation(
            (bucket: 'notes' | 'files' | 'execution') => bucket !== 'files',
        );
        const previous = {
            v: 1,
            savedAt: '2026-08-01T00:00:00.000Z',
            lawsuits: [{ id: 'ls-prev' }],
            execution: [],
            notes: [],
            calendar: [],
            calendarTombstones: {},
        };
        vi.mocked(SecureAPIClient.fetchSecure)
            .mockResolvedValueOnce({
                ok: true,
                checkpoint: {
                    encrypted_data: `plain:${JSON.stringify(previous)}`,
                    data_signature: 'sig',
                },
            })
            .mockResolvedValueOnce({ ok: true });

        const result = await pushWorkCloudCheckpointNow();
        expect(result.pushed).toBe(true);
        const plain = String(vi.mocked(CryptoService.encryptData).mock.calls[0]?.[0] ?? '');
        expect(plain).toContain('ls-prev');
        expect(plain).toContain('ex-1');
        expect(plain).not.toContain('ls-1');
    });

    it('لا يكتب نقطة ناقصة إن تعذّر قراءة السابقة', async () => {
        vi.mocked(isLiveCloudSyncBucketEnabled).mockImplementation(
            (bucket: 'notes' | 'files' | 'execution') => bucket !== 'files',
        );
        vi.mocked(SecureAPIClient.fetchSecure).mockResolvedValueOnce({ ok: false });
        const result = await pushWorkCloudCheckpointNow();
        expect(result).toEqual({ pushed: false, skipped: false, failed: true, retryable: true });
        expect(SecureAPIClient.fetchSecure).toHaveBeenCalledTimes(1);
        expect(CryptoService.encryptData).not.toHaveBeenCalled();
    });

    it('لا يقرأ النقطة السابقة إن كانت كل السلال حيّة', async () => {
        const result = await pushWorkCloudCheckpointNow();
        expect(result.pushed).toBe(true);
        expect(SecureAPIClient.fetchSecure).toHaveBeenCalledTimes(1);
        expect(vi.mocked(SecureAPIClient.fetchSecure).mock.calls[0]?.[1]?.method).toBe('POST');
    });

    it('إعادة محاولة واحدة بعد فشل الشبكة', async () => {
        vi.mocked(SecureAPIClient.fetchSecure)
            .mockResolvedValueOnce({ ok: false })
            .mockResolvedValueOnce({ ok: true });
        const result = await pushWorkCloudCheckpointNowRetryingOnce();
        expect(result.pushed).toBe(true);
        expect(SecureAPIClient.fetchSecure).toHaveBeenCalledTimes(2);
    });

    it('لا يعيد محاولة فشل الحجم الحتمي', async () => {
        const arabicChunk = 'محامي'.repeat(280_000);
        vi.mocked(collectLawsuitLocalRowsForSync).mockReturnValue([
            { id: 'huge', note: arabicChunk } as never,
        ]);
        const result = await pushWorkCloudCheckpointNowRetryingOnce();
        expect(result).toEqual({ pushed: false, skipped: false, failed: true, retryable: false });
        expect(collectLawsuitLocalRowsForSync).toHaveBeenCalledTimes(1);
        expect(SecureAPIClient.fetchSecure).not.toHaveBeenCalled();

        /*
         * ورفضُ الحجم حتميّ: يتكرّر في كل دفعة ما دامت الإضابير فوق السقف. والمسار
         * التلقائي يرمي النتيجة بـ`void`، فبلا بلاغٍ يعمل المحامي بلا نسخة ولا يدري.
         */
        /* الاستيراد الديناميّ للمُبلِّغ لا يُنتظَر داخل الدفع — يلزمه دور microtask */
        await vi.waitFor(() =>
            expect(sentryCaptureMessage).toHaveBeenCalledWith(
                'work-checkpoint-push:over-size-ceiling',
                expect.objectContaining({ ceilingBytes: 1_300_000 }),
            ),
        );
    });

    it('إن رمى جمع الدعاوى يقرأ المخزن المحلي بدلاً منه', async () => {
        vi.mocked(collectLawsuitLocalRowsForSync).mockImplementation(() => {
            throw new Error('segment storage unavailable');
        });
        vi.mocked(persistenceRepository.loadAsync).mockImplementation(async (key: string) => {
            if (String(key) === STORAGE_KEYS.LAWYER_FILES) return [{ id: 'fallback-ls' }];
            if (String(key).includes('execution')) return [{ id: 'ex-1' }];
            if (String(key).includes('notes') || String(key).includes('NOTES')) return [{ id: 'n-1' }];
            return [];
        });
        const result = await pushWorkCloudCheckpointNow();
        expect(result.pushed).toBe(true);
        const plain = String(vi.mocked(CryptoService.encryptData).mock.calls[0]?.[0] ?? '');
        expect(plain).toContain('fallback-ls');
        expect(plain).not.toContain('ls-1');
    });
});

describe('restoreLastWorkCloudCheckpoint', () => {
    const payload = {
        v: 1 as const,
        savedAt: '2026-08-29T12:00:00.000Z',
        lawsuits: [{ id: 'ls-1' }],
        execution: [{ id: 'ex-1' }],
        notes: [{ id: 'n-1' }],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(isLawyerWorkCloudLive).mockReturnValue(true);
        vi.mocked(isLiveCloudSyncBucketEnabled).mockImplementation(() => true);
        vi.mocked(collectLawsuitLocalRowsForSync).mockReturnValue([{ id: 'ls-1' }]);
        vi.mocked(applyLawsuitMonolithicMergeToSegments).mockImplementation(() => undefined);
        vi.mocked(applyCalendarCheckpointSlice).mockResolvedValue(0);
        vi.mocked(collectCalendarCheckpointSlice).mockResolvedValue({ events: [], tombstones: {} });
        vi.mocked(CryptoService.decryptData).mockImplementation(async (cipher: string) => {
            if (cipher.startsWith('plain:')) return cipher.slice(6);
            return '{}';
        });
        vi.mocked(SecureAPIClient.fetchSecure).mockResolvedValue({
            ok: true,
            checkpoint: {
                encrypted_data: `plain:${JSON.stringify(payload)}`,
                data_signature: 'sig',
            },
        });
    });

    it('يكتب التنفيذ ويضع مفتاحه في data-imported حتى لا يطمسه auto-save', async () => {
        const dispatch = vi.spyOn(window, 'dispatchEvent');
        const result = await restoreLastWorkCloudCheckpoint();
        expect(result).toEqual({ applied: true, lawsuits: 1, execution: 1, notes: 1, calendar: 0, failed: false });
        expect(saveExecutionFilesRawImmediate).toHaveBeenCalledWith(payload.execution);
        expect(persistenceRepository.save).toHaveBeenCalledWith('hami:execution:v1:u1', payload.execution);
        expect(persistenceRepository.save).toHaveBeenCalledWith(STORAGE_KEYS.LAWYER_NOTES, payload.notes);
        expect(persistenceRepository.save).toHaveBeenCalledWith(STORAGE_KEYS.LAWYER_FILES, payload.lawsuits);

        const imported = dispatch.mock.calls
            .map(([event]) => event as Event)
            .find((event) => event.type === 'hami:data-imported') as CustomEvent<{ keys?: string[] }>;
        expect(imported?.detail?.keys).toEqual([
            STORAGE_KEYS.LAWYER_FILES,
            'hami:execution:v1:u1',
            STORAGE_KEYS.LAWYER_NOTES,
        ]);
        dispatch.mockRestore();
    });

    /**
     * الحزمة وصلت وفُكّ تشفيرها وفيها محتوى، ثم رُفضت كل كتابة محلية.
     *
     * هذا ليس فرضاً: النداء الوحيد الذي يراه المحامي يأتي من
     * `dataCloudSyncToggle` بـ`onlyIfLocalEmpty` — أي على جهازٍ فارغ، وهو الموضع
     * الذي يرفض فيه المخزن البارد الكتابة. وذلك الملفّ يقرأ `failed` ليُحذّر:
     * فإن بقيت `false` مرّ فقدُ الاستعادة **بلا تحذير**، وهو أسوأ من فشلٍ معلن.
     */
    it('يُبلّغ عن الفشل حين تُرفض كل كتابة محلية — لا صمت', async () => {
        const save = vi.mocked(persistenceRepository.save);
        save.mockImplementation(() => {
            throw new Error('cold store refused');
        });
        try {
            const result = await restoreLastWorkCloudCheckpoint();
            expect(result.applied).toBe(false);
            expect(result.failed).toBe(true);
        } finally {
            /* clearAllMocks يمحو النداءات لا التنفيذ — بلا هذا يتسرّب الرمي لما بعده */
            save.mockReset();
        }
    });

    /**
     * قرارٌ مقصود يُثبَّت هنا: الاستعادة الجزئية **فشلٌ يُبلَّغ عنه** لا نجاحٌ ناقص.
     * محامٍ استُعيدت دعاواه وضاعت ملاحظاته يستحقّ أن يعرف، لا أن يرى «تمّ».
     */
    it('شريحة واحدة مرفوضة: يُطبَّق ما نجح ويبقى failed صادقة', async () => {
        const merge = vi.mocked(applyLawsuitMonolithicMergeToSegments);
        merge.mockImplementation(() => {
            throw new Error('segments refused');
        });
        try {
            const result = await restoreLastWorkCloudCheckpoint();
            expect(result.lawsuits).toBe(0);
            expect(result.execution).toBe(1);
            expect(result.notes).toBe(1);
            expect(result.applied).toBe(true);
            expect(result.failed).toBe(true);
        } finally {
            merge.mockReset();
        }
    });

    it('يستعيد المواعيد من الحزمة المشفّرة عبر /api/work-checkpoints لا KV', async () => {
        const calPayload = {
            ...payload,
            calendar: [{ id: 'ev-1', userId: 'u1', title: 'جلسة' }],
            calendarTombstones: { u1: [{ eventId: 'gone' }] },
        };
        vi.mocked(SecureAPIClient.fetchSecure).mockResolvedValue({
            ok: true,
            checkpoint: {
                encrypted_data: `plain:${JSON.stringify(calPayload)}`,
                data_signature: 'sig',
            },
        });
        vi.mocked(applyCalendarCheckpointSlice).mockResolvedValue(1);
        const dispatch = vi.spyOn(window, 'dispatchEvent');
        const result = await restoreLastWorkCloudCheckpoint();
        expect(result).toEqual({ applied: true, lawsuits: 1, execution: 1, notes: 1, calendar: 1, failed: false });
        expect(applyCalendarCheckpointSlice).toHaveBeenCalledWith({
            events: calPayload.calendar,
            tombstones: calPayload.calendarTombstones,
        });
        expect(SecureAPIClient.fetchSecure).toHaveBeenCalledWith(
            '/api/work-checkpoints',
            expect.objectContaining({ method: 'GET' }),
        );
        const imported = dispatch.mock.calls
            .map(([event]) => event as Event)
            .find((event) => event.type === 'hami:data-imported') as CustomEvent<{ keys?: string[] }>;
        expect(imported?.detail?.keys).toContain(CALENDAR_EVENTS_STORAGE_KEY);
        dispatch.mockRestore();
    });

    it('نقطة أسقطت التقويم لفيض الحجم تستعيد المواعيد من الصف الأقدم', async () => {
        const latest = {
            ...payload,
            calendar: [],
            calendarTombstones: {},
            calendarOmittedForBudget: true,
        };
        const older = {
            ...payload,
            lawsuits: [{ id: 'ls-old' }],
            calendar: [{ id: 'ev-keep', userId: 'u1', title: 'جلسة', date: '2026-09-01' }],
            calendarTombstones: { u1: [{ eventId: 'gone' }] },
            calendarSlicePresent: true,
        };
        vi.mocked(SecureAPIClient.fetchSecure).mockResolvedValue({
            ok: true,
            checkpoint: {
                encrypted_data: `plain:${JSON.stringify(latest)}`,
                data_signature: 'sig',
            },
            checkpoints: [
                { encrypted_data: `plain:${JSON.stringify(latest)}`, data_signature: 'sig' },
                { encrypted_data: `plain:${JSON.stringify(older)}`, data_signature: 'sig' },
            ],
        });
        vi.mocked(applyCalendarCheckpointSlice).mockResolvedValue(1);
        const result = await restoreLastWorkCloudCheckpoint();
        expect(result.lawsuits).toBe(1);
        expect(result.calendar).toBe(1);
        expect(applyCalendarCheckpointSlice).toHaveBeenCalledWith({
            events: older.calendar,
            tombstones: older.calendarTombstones,
        });
        expect(persistenceRepository.save).toHaveBeenCalledWith(
            STORAGE_KEYS.LAWYER_FILES,
            latest.lawsuits,
        );
    });

    it('تقويم محلي وحده لا يمنع onlyIfLocalEmpty من سحب الإضابير', async () => {
        const { collectLawsuitLocalRowsForSync } = await import(
            '@/app/domain/lawsuit/lawsuitSegmentStorage'
        );
        vi.mocked(collectLawsuitLocalRowsForSync).mockReturnValue([]);
        vi.mocked(persistenceRepository.loadAsync).mockResolvedValue([]);
        vi.mocked(collectCalendarCheckpointSlice).mockResolvedValue({
            events: [{ id: 'local-ev', userId: 'u1', title: 'جلسة', date: '2026-09-01', type: 'hearing', createdAt: '', updatedAt: '' }],
            tombstones: {},
        });
        const result = await restoreLastWorkCloudCheckpoint({ onlyIfLocalEmpty: true });
        expect(SecureAPIClient.fetchSecure).toHaveBeenCalled();
        expect(result.applied).toBe(true);
        expect(result.lawsuits).toBe(1);
    });

    it('إضبارة محلية تمنع onlyIfLocalEmpty من الكتابة فوق الجهاز', async () => {
        const { collectLawsuitLocalRowsForSync } = await import(
            '@/app/domain/lawsuit/lawsuitSegmentStorage'
        );
        vi.mocked(collectLawsuitLocalRowsForSync).mockReturnValue([{ id: 'local-ls' } as never]);
        const result = await restoreLastWorkCloudCheckpoint({ onlyIfLocalEmpty: true });
        expect(result).toEqual({ applied: false, lawsuits: 0, execution: 0, notes: 0, calendar: 0, failed: false });
        expect(SecureAPIClient.fetchSecure).not.toHaveBeenCalled();
    });

    it('فشل تطبيق التقويم لا يلغي استعادة الإضابير', async () => {
        vi.mocked(applyCalendarCheckpointSlice).mockRejectedValue(new Error('calendar apply failed'));
        const calPayload = {
            ...payload,
            calendar: [{ id: 'ev-1', userId: 'u1', title: 'جلسة', date: '2026-09-01' }],
            calendarTombstones: {},
        };
        vi.mocked(SecureAPIClient.fetchSecure).mockResolvedValue({
            ok: true,
            checkpoint: {
                encrypted_data: `plain:${JSON.stringify(calPayload)}`,
                data_signature: 'sig',
            },
        });
        const result = await restoreLastWorkCloudCheckpoint();
        expect(result.applied).toBe(true);
        expect(result.lawsuits).toBe(1);
        expect(result.calendar).toBe(0);
        expect(persistenceRepository.save).toHaveBeenCalledWith(STORAGE_KEYS.LAWYER_FILES, payload.lawsuits);
    });

    it('نقطة بلا توقيع لا تُفك ولا تُطبَّق', async () => {
        vi.mocked(SecureAPIClient.fetchSecure).mockResolvedValue({
            ok: true,
            checkpoint: {
                encrypted_data: `plain:${JSON.stringify(payload)}`,
                data_signature: '',
            },
        });
        const result = await restoreLastWorkCloudCheckpoint();
        expect(result.applied).toBe(false);
        expect(result.failed).toBe(true);
        expect(persistenceRepository.save).not.toHaveBeenCalled();
        expect(CryptoService.decryptData).not.toHaveBeenCalled();
    });

    it('GET غير ناجح يُعلن failed', async () => {
        vi.mocked(SecureAPIClient.fetchSecure).mockResolvedValue({ ok: false });
        const result = await restoreLastWorkCloudCheckpoint();
        expect(result).toEqual({
            applied: false,
            lawsuits: 0,
            execution: 0,
            notes: 0,
            calendar: 0,
            failed: true,
        });
        expect(persistenceRepository.save).not.toHaveBeenCalled();
    });

    it('فشل دمج الدعاوى لا يمنع كتابة التنفيذ', async () => {
        const { applyLawsuitMonolithicMergeToSegments } = await import(
            '@/app/domain/lawsuit/lawsuitSegmentStorage'
        );
        vi.mocked(applyLawsuitMonolithicMergeToSegments).mockImplementation(() => {
            throw new Error('lawsuit merge failed');
        });
        const result = await restoreLastWorkCloudCheckpoint();
        expect(result.lawsuits).toBe(0);
        expect(result.execution).toBe(1);
        expect(result.applied).toBe(true);
        expect(saveExecutionFilesRawImmediate).toHaveBeenCalled();
    });

    it('إضبارة محلية تمنع الاستعادة حتى وسلة الملفات مطفأة', async () => {
        const { collectLawsuitLocalRowsForSync } = await import(
            '@/app/domain/lawsuit/lawsuitSegmentStorage'
        );
        const { isLiveCloudSyncBucketEnabled } = await import(
            '@/app/services/settings/cloudSyncBucket'
        );
        vi.mocked(collectLawsuitLocalRowsForSync).mockReturnValue([{ id: 'local-ls' } as never]);
        vi.mocked(isLiveCloudSyncBucketEnabled).mockReturnValue(false);
        const result = await restoreLastWorkCloudCheckpoint({ onlyIfLocalEmpty: true });
        expect(result.applied).toBe(false);
        expect(SecureAPIClient.fetchSecure).not.toHaveBeenCalled();
    });
});
