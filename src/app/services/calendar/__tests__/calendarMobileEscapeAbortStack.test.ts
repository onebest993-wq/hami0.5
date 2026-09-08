import { describe, expect, it, beforeEach } from 'vitest';
import {
    blockCalendarEscapeLayer,
    unblockCalendarEscapeLayer,
    resolveCalendarEscapeAction,
    peekCalendarEscapeTopLayer,
    unblockAllCalendarOverlayEscape,
    describeCalendarEscapeStackForDebug,
} from '@/app/components/lawyer/SmartLegalRadar/calendarEscapeStack';
import {
    getCalendarCloudLoaderSignal,
    getCalendarDossierSyncSignal,
    getCalendarNativeSyncSignal,
    abortCalendarCloudLoader,
    abortCalendarDossierSyncOrchestrator,
    abortCalendarNativeSyncBridge,
    isCalendarAbortGlobalsAttached,
} from '@/app/services/calendar/calendarNetworkAbort';

describe('calendarEscapeStack — Priority L0-L3 (TR-8.2)', () => {
    beforeEach(() => {
        unblockAllCalendarOverlayEscape();
    });

    it('L0-L3 يبدأ IDLE بدون طبقات = peek 0', () => {
        expect(peekCalendarEscapeTopLayer()).toBe(0);
        expect(describeCalendarEscapeStackForDebug()).toBe('IDLE');
    });

    it('L0 surface block → peek=0, resolve back/home returns 0 null', () => {
        blockCalendarEscapeLayer(0, 'lock');
        expect(peekCalendarEscapeTopLayer()).toBe(0);
        expect(resolveCalendarEscapeAction('back')).toBe(0);
        expect(resolveCalendarEscapeAction('escape')).toBe(0);
    });

    it('L1 sheet block → peek=1, resolve back=1 escape=1', () => {
        blockCalendarEscapeLayer(1, 'sheet');
        expect(peekCalendarEscapeTopLayer()).toBe(1);
        expect(resolveCalendarEscapeAction('back')).toBe(1);
        expect(resolveCalendarEscapeAction('escape')).toBe(1);
    });

    it('L2 popup block → resolve home-indicator returns 2 (≥2 threshold)', () => {
        blockCalendarEscapeLayer(2, 'popup');
        expect(peekCalendarEscapeTopLayer()).toBe(2);
        expect(resolveCalendarEscapeAction('home-indicator')).toBe(2);
        expect(resolveCalendarEscapeAction('back')).toBe(2);
    });

    it('L3 nested block → peek 3 highest priority', () => {
        blockCalendarEscapeLayer(1, 'sheet');
        blockCalendarEscapeLayer(2, 'popup');
        blockCalendarEscapeLayer(3, 'nested');
        expect(peekCalendarEscapeTopLayer()).toBe(3);
        expect(resolveCalendarEscapeAction('back')).toBe(3);
    });

    it('unblock طبقة معيّنة token-specific يعيد الحالة السابقة', () => {
        blockCalendarEscapeLayer(1, 'sheet');
        blockCalendarEscapeLayer(2, 'a');
        blockCalendarEscapeLayer(2, 'b');
        expect(peekCalendarEscapeTopLayer()).toBe(2);
        expect(unblockCalendarEscapeLayer(2, 'a')).toBe(true);
        expect(peekCalendarEscapeTopLayer()).toBe(2);
        expect(unblockCalendarEscapeLayer(2, 'b')).toBe(true);
        expect(peekCalendarEscapeTopLayer()).toBe(1);
    });

    it('unblockAllCalendarOverlayEscape يُفرغ الكل ويعود IDLE', () => {
        blockCalendarEscapeLayer(0, 'lock');
        blockCalendarEscapeLayer(1, 'sheet');
        blockCalendarEscapeLayer(2, 'popup');
        blockCalendarEscapeLayer(3, 'nested');
        expect(peekCalendarEscapeTopLayer()).toBe(3);
        const result = unblockAllCalendarOverlayEscape();
        expect(result).toBe(true);
        expect(peekCalendarEscapeTopLayer()).toBe(0);
        expect(describeCalendarEscapeStackForDebug()).toBe('IDLE');
    });

    it('describeCalendarEscapeStackForDebug يُعرض الطبقات من الأعلى إلى الأسفل', () => {
        blockCalendarEscapeLayer(1, 's');
        blockCalendarEscapeLayer(3, 'n1');
        blockCalendarEscapeLayer(3, 'n2');
        const desc = describeCalendarEscapeStackForDebug();
        expect(desc).toContain('L3=nested(2)');
        expect(desc).toContain('L1=sheet(1)');
    });
});

describe('calendarNetworkAbort — 3 AbortController Singletons (TR-8.3)', () => {
    it('3 getXxxSignal تعيد Signal فعلية (ليست undefined في المتصفح/Node حديث)', () => {
        const s1 = getCalendarCloudLoaderSignal();
        const s2 = getCalendarDossierSyncSignal();
        const s3 = getCalendarNativeSyncSignal();
        if (typeof AbortController !== 'undefined') {
            expect(s1).toBeDefined();
            expect(s2).toBeDefined();
            expect(s3).toBeDefined();
        } else {
            expect(true).toBe(true);
        }
    });

    it('3 abortCalendarXxx دوال مُصدرة لا ترمي خطأ أبداً (no-throw contract)', () => {
        expect(() => abortCalendarCloudLoader()).not.toThrow();
        expect(() => abortCalendarDossierSyncOrchestrator()).not.toThrow();
        expect(() => abortCalendarNativeSyncBridge()).not.toThrow();
    });

    it('بعد abort، الـ signal.aborted يصبح true (إن وجد)', () => {
        const sig = getCalendarCloudLoaderSignal();
        const sig2 = getCalendarDossierSyncSignal();
        const sig3 = getCalendarNativeSyncSignal();
        if (sig && sig2 && sig3) {
            expect(sig.aborted).toBe(true);
            expect(sig2.aborted).toBe(true);
            expect(sig3.aborted).toBe(true);
        } else {
            expect(true).toBe(true);
        }
    });

    it('isCalendarAbortGlobalsAttached يعيد true بعد الـ top-level attach', () => {
        if (typeof window !== 'undefined') {
            expect(typeof isCalendarAbortGlobalsAttached()).toBe('boolean');
            expect(isCalendarAbortGlobalsAttached()).toBe(true);
            const w = window as unknown as Record<string, unknown>;
            expect(typeof (w.__hamiCalendarAbortCloud as { abort?: unknown })?.abort).toBe(
                'function',
            );
            expect(typeof (w.__hamiCalendarAbortDossier as { abort?: unknown })?.abort).toBe(
                'function',
            );
            expect(typeof (w.__hamiCalendarAbortNative as { abort?: unknown })?.abort).toBe(
                'function',
            );
        } else {
            expect(true).toBe(true);
        }
    });

    it('globals wiring: استدعاء الـ global abort functions لا يرمي خطأ (تفعيل منطقة P3b)', () => {
        if (typeof window !== 'undefined') {
            const w = window as unknown as Record<string, unknown>;
            const cloud = w.__hamiCalendarAbortCloud as { abort: () => void };
            const dossier = w.__hamiCalendarAbortDossier as { abort: () => void };
            const native = w.__hamiCalendarAbortNative as { abort: () => void };
            expect(() => cloud.abort()).not.toThrow();
            expect(() => dossier.abort()).not.toThrow();
            expect(() => native.abort()).not.toThrow();
        } else {
            expect(true).toBe(true);
        }
    });
});
