/**
 * تقرير إقلاع أصلي — يُعرَّض على window للفحص من Android Studio / logcat.
 * لا يُرسل شبكة؛ للقراءة اليدوية فقط.
 */
import {
    getBootTimeline,
    getDashboardToFirstTabOpenMs,
    getFirstTabOpenMs,
    type BootTimelineRow,
} from '@/app/bootstrap/bootMetrics';
import { getDashboardInteractiveMs } from '@/app/bootstrap/dashboardInteractiveMark';

export type NativeBootTelemetryReport = {
    v: 1;
    at: string;
    native: 1;
    platform: string;
    ttfiMs: number | null;
    firstTabOpenMs: number | null;
    dashboardToFirstTabMs: number | null;
    hubBootSettling: '0' | '1' | 'unknown';
    timeline: BootTimelineRow[];
};

const SESSION_KEY = 'hami:native-boot-report:v1';

function readHubBootSettling(): '0' | '1' | 'unknown' {
    if (typeof document === 'undefined') return 'unknown';
    const card = document.querySelector('[data-testid="home-hub-card"]');
    if (card instanceof HTMLElement) {
        const value = card.getAttribute('data-hub-boot-settling');
        if (value === '0' || value === '1') return value;
    }
    if (document.querySelector('[data-testid="home-hub-card-skeleton"]')) return '1';
    return 'unknown';
}

export function isNativeBootTelemetryTarget(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.dataset.hamiNative === '1';
}

export function buildNativeBootTelemetryReport(): NativeBootTelemetryReport {
    const platform = document.documentElement.dataset.hamiPlatform ?? 'unknown';
    return {
        v: 1,
        at: new Date().toISOString(),
        native: 1,
        platform,
        ttfiMs: getDashboardInteractiveMs(),
        firstTabOpenMs: getFirstTabOpenMs(),
        dashboardToFirstTabMs: getDashboardToFirstTabOpenMs(),
        hubBootSettling: readHubBootSettling(),
        timeline: getBootTimeline(),
    };
}

export function publishNativeBootTelemetry(): void {
    if (typeof window === 'undefined' || !isNativeBootTelemetryTarget()) return;

    const report = buildNativeBootTelemetryReport();
    try {
        (window as Window & { __hamiNativeBootReport?: NativeBootTelemetryReport }).__hamiNativeBootReport =
            report;
    } catch {
        /* ignore */
    }

    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(report));
    } catch {
        /* ignore */
    }
}

/** للاختبارات */
export function resetNativeBootTelemetryForTests(): void {
    if (typeof window === 'undefined') return;
    delete (window as Window & { __hamiNativeBootReport?: NativeBootTelemetryReport }).__hamiNativeBootReport;
    try {
        sessionStorage.removeItem(SESSION_KEY);
    } catch {
        /* ignore */
    }
}
