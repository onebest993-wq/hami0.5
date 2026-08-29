import {
    loadInitialLawsuitFiles,
    loadInitialLawsuitFilesAsync,
} from '@/app/domain/lawsuit/lawsuitFilesRepository';
import type { FileData } from '@/app/domain/lawsuit/lawsuitFileTypes';
import { lawsuitSegmentsNeedWarm } from '@/app/domain/lawsuit/lawsuitSegmentStorage';
import {
    markLawsuitArchivePerf,
    reportLawsuitArchivePerf,
} from '@/app/services/alerts/lawsuitArchivePerfMetrics';

const EAGER_HYDRATE_TIMEOUT_MS = 2_500;

let inFlight: Promise<FileData[]> | null = null;
let lastResult: FileData[] | null = null;
/** اكتمل مسار async بنجاح أو فشل نهائي — لا نعتمد نتيجة مهلة فارغة كحقيقة */
let hydrateSettled = false;

export function resetLawsuitFilesEagerHydrateForTests(): void {
    inFlight = null;
    lastResult = null;
    hydrateSettled = false;
}

export function getLawsuitFilesEagerHydrateIfReady(): FileData[] | null {
    return lastResult;
}

export function isLawsuitFilesEagerHydrateSettled(): boolean {
    return hydrateSettled;
}

function preferRicher(a: FileData[], b: FileData[]): FileData[] {
    return a.length >= b.length ? a : b;
}

function adoptResult(rows: FileData[], settled: boolean): FileData[] {
    const next = Array.isArray(rows) ? rows : [];
    if (lastResult && lastResult.length > next.length) {
        if (settled) {
            hydrateSettled = true;
            markLawsuitArchivePerf('hydrate-done');
            reportLawsuitArchivePerf();
        }
        return lastResult;
    }
    lastResult = next;
    if (settled) {
        hydrateSettled = true;
        markLawsuitArchivePerf('hydrate-done');
        reportLawsuitArchivePerf();
    }
    return next;
}

/** يبدأ فكّ تشفير/قراءة إضابير الدعوى مبكراً — قبل فتح المخزن */
export function startLawsuitFilesEagerHydrate(): void {
    if (typeof window === 'undefined') return;
    if (inFlight) return;

    inFlight = loadInitialLawsuitFilesAsync()
        .then((rows) => {
            const adopted = adoptResult(rows, true);
            inFlight = null;
            return adopted;
        })
        .catch(() => {
            const syncFallback = loadInitialLawsuitFiles();
            const adopted = adoptResult(syncFallback, true);
            inFlight = null;
            return adopted;
        });
}

/**
 * انتظار التحميل مع مهلة.
 * مهلة فارغة لا تُثبَّت كـ lastResult إن كان التحميل الحقيقي ما زال جارياً أو التخزين بارداً.
 * (`[]` قيمة truthy — كانت تُعاد فوراً وتمنع أي إعادة تحميل بعد سباق المهلة.)
 */
export function awaitLawsuitFilesEagerHydrate(
    timeoutMs = EAGER_HYDRATE_TIMEOUT_MS,
): Promise<FileData[]> {
    if (hydrateSettled && lastResult !== null) return Promise.resolve(lastResult);
    if (lastResult !== null && lastResult.length > 0) return Promise.resolve(lastResult);

    startLawsuitFilesEagerHydrate();

    const hydratePromise = inFlight ?? Promise.resolve(loadInitialLawsuitFiles());

    if (timeoutMs <= 0) {
        return hydratePromise.then((rows) => adoptResult(rows, true));
    }

    const timeoutPromise = new Promise<FileData[]>((resolve) => {
        setTimeout(() => {
            const sync = loadInitialLawsuitFiles();
            /*
             * لا نعتبر المهلة «استقراراً» إذا النتيجة فارغة وما زال هناك احتمال بيانات باردة،
             * أو إذا inFlight لم يكتمل — وإلا تُثبَّت [] وتمسح الواجهة/القرص.
             */
            if (sync.length > 0) {
                resolve(adoptResult(sync, true));
                return;
            }
            if (inFlight || lawsuitSegmentsNeedWarm()) {
                resolve(lastResult && lastResult.length > 0 ? lastResult : sync);
                return;
            }
            resolve(adoptResult(sync, true));
        }, timeoutMs);
    });

    return Promise.race([hydratePromise, timeoutPromise]).then((rows) => {
        const richer = preferRicher(
            Array.isArray(rows) ? rows : [],
            lastResult ?? [],
        );
        if (hydrateSettled || richer.length > 0 || (!inFlight && !lawsuitSegmentsNeedWarm())) {
            return adoptResult(richer, hydrateSettled || richer.length > 0 || !inFlight);
        }
        return richer;
    });
}

/** بعد استبدال/استيراد — أبطل الكاش */
export function invalidateLawsuitFilesEagerHydrate(): void {
    lastResult = null;
    inFlight = null;
    hydrateSettled = false;
}
