import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
    buildNativeBootTelemetryReport,
    publishNativeBootTelemetry,
    resetNativeBootTelemetryForTests,
} from '@/app/runtime/nativeBootTelemetry';

describe('nativeBootTelemetry', () => {
    beforeEach(() => {
        resetNativeBootTelemetryForTests();
        document.documentElement.dataset.hamiNative = '1';
        document.documentElement.dataset.hamiPlatform = 'android';
    });

    afterEach(() => {
        resetNativeBootTelemetryForTests();
        delete document.documentElement.dataset.hamiNative;
        delete document.documentElement.dataset.hamiPlatform;
    });

    it('لا ينشر على الويب', () => {
        delete document.documentElement.dataset.hamiNative;
        publishNativeBootTelemetry();
        expect((window as Window & { __hamiNativeBootReport?: unknown }).__hamiNativeBootReport).toBeUndefined();
    });

    it('ينشر تقريراً على الأصلي', () => {
        publishNativeBootTelemetry();
        const report = (window as Window & { __hamiNativeBootReport?: ReturnType<typeof buildNativeBootTelemetryReport> })
            .__hamiNativeBootReport;
        expect(report?.native).toBe(1);
        expect(report?.platform).toBe('android');
        expect(sessionStorage.getItem('hami:native-boot-report:v1')).toContain('"native":1');
    });
});
