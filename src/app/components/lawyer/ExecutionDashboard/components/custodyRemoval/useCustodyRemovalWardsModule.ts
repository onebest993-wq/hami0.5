import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { CustodyWardDeliveryBundle, CustodyWardDeliveryRecord } from '@/app/types/custodyWardDelivery';
import {
    isInabaSubFileId,
    stampInabaTimelineEventMetadata,
    stampParentTimelineEventMetadata,
} from '@/app/stores/executionDashboardStore';
import { useExecutionSectionConfirm } from '@/app/components/lawyer/execution/useExecutionSectionConfirm';
import {
    buildCustodyWardTimelineBackfillSpecs,
    commitCustodyWardTimelineAction,
    type CustodyWardTimelineEventKind,
    enrichCustodyWardsFromTimeline,
    mergeCustodyWardRecords,
    patchCustodyWardRecord,
    readCustodyWardDeliveryBundle,
    restartCustodyWardBundleAfterMissedDelivery,
    wardDeliveryIsClosed,
} from '@/app/utils/custodyWardDeliveryEngine';
import type { CustodyRemovalWardsModuleProps } from './custodyRemovalWardsModuleTypes';

export function useCustodyRemovalWardsModule({
    executionId,
    parentDossierId,
    activeSubFileId,
    isInabaActive = false,
    executionData,
    custodyWardNames,
    timelineEvents,
    todayYmd,
    setTimelineEvents,
    persistExecutionMerge,
    nextTimelineId,
    showToast,
}: CustodyRemovalWardsModuleProps) {
    const serverBundle = useMemo(
        () => readCustodyWardDeliveryBundle(executionData as ExecutionFile | null | undefined),
        [executionData],
    );
    const [bundleOverride, setBundleOverride] = useState<CustodyWardDeliveryBundle | null>(null);
    useEffect(() => {
        if (!bundleOverride || !serverBundle) return;
        if (JSON.stringify(bundleOverride.wards) === JSON.stringify(serverBundle.wards)) {
            setBundleOverride(null);
        }
    }, [bundleOverride, serverBundle]);
    const effectiveBundle = bundleOverride ?? serverBundle;
    const wards = useMemo(() => {
        const merged = mergeCustodyWardRecords(custodyWardNames, effectiveBundle);
        return enrichCustodyWardsFromTimeline(merged, timelineEvents);
    }, [custodyWardNames, effectiveBundle, timelineEvents]);

    /** أكثر من 3 محضونين — الطي التلقائي لتخفيف طول الشاشة */
    const shouldAutoCollapseModule = wards.length > 3;
    const [moduleExpanded, setModuleExpanded] = useState(() => !shouldAutoCollapseModule);
    const prevWardCountRef = useRef(wards.length);
    useEffect(() => {
        const prev = prevWardCountRef.current;
        prevWardCountRef.current = wards.length;
        if (prev === 0 && wards.length > 3) {
            setModuleExpanded(false);
        }
    }, [wards.length]);

    const [expandedKey, setExpandedKey] = useState<string | null>(null);
    const [dateDraftByKey, setDateDraftByKey] = useState<Record<string, string>>({});
    const [showDatePickerByKey, setShowDatePickerByKey] = useState<Record<string, boolean>>({});
    const { confirm: confirmInSection, dialog: sectionConfirmDialog } = useExecutionSectionConfirm();

    const deliveredCount = useMemo(
        () => wards.filter((w) => wardDeliveryIsClosed(w.status)).length,
        [wards],
    );

    const stampTimelineEvent = useCallback(
        (event: TimelineEvent): TimelineEvent => {
            const subId = String(activeSubFileId || '').trim();
            const parentForStamp = String(parentDossierId || executionId || executionData?.id || '').trim();
            if (isInabaActive && subId && isInabaSubFileId(subId) && parentForStamp) {
                return stampInabaTimelineEventMetadata(event, subId, parentForStamp);
            }
            if (parentForStamp) {
                return stampParentTimelineEventMetadata(event, parentForStamp);
            }
            return event;
        },
        [activeSubFileId, executionData?.id, executionId, isInabaActive, parentDossierId],
    );

    const commitWardAction = useCallback(
        (
            ward: CustodyWardDeliveryRecord,
            kind: CustodyWardTimelineEventKind,
            bundlePatch: CustodyWardDeliveryBundle,
        ): boolean => {
            if (!executionData?.id) {
                showToast('تعذر الحفظ — بيانات الإضبارة غير جاهزة.', 'error');
                return false;
            }
            let persistPatch: Record<string, unknown> | null = null;
            setTimelineEvents((prev) => {
                const committed = commitCustodyWardTimelineAction({
                    ward,
                    kind,
                    bundle: bundlePatch,
                    prevTimelineEvents: prev,
                    nextTimelineId,
                    todayYmd,
                    stampEvent: stampTimelineEvent,
                });
                persistPatch = committed.persistPatch;
                return committed.nextTimelineEvents;
            });
            if (!persistPatch) return false;
            const persisted = persistExecutionMerge(persistPatch);
            if (persisted === false) {
                showToast('تعذر مزامنة السجل الزمني — أعد المحاولة.', 'error');
                return false;
            }
            setBundleOverride(bundlePatch);
            return true;
        },
        [
            executionData?.id,
            nextTimelineId,
            persistExecutionMerge,
            setTimelineEvents,
            showToast,
            stampTimelineEvent,
            todayYmd,
        ],
    );

    const backfillSigRef = useRef('');
    useEffect(() => {
        const specs = buildCustodyWardTimelineBackfillSpecs(wards, timelineEvents);
        if (specs.length === 0) {
            backfillSigRef.current = '';
            return;
        }
        const sig = specs.map((s) => `${s.ward.wardKey}:${s.kind}`).join('|');
        if (backfillSigRef.current === sig) return;
        const first = specs[0];
        if (!first) return;
        let cancelled = false;
        const runBackfill = () => {
            if (cancelled) return;
            const ok = commitWardAction(first.ward, first.kind, { wards });
            if (ok) backfillSigRef.current = sig;
        };
        const ric = globalThis.requestIdleCallback;
        const cancelRic = globalThis.cancelIdleCallback;
        if (typeof ric === 'function') {
            const idleId = ric(runBackfill, { timeout: 1200 });
            return () => {
                cancelled = true;
                if (typeof cancelRic === 'function') cancelRic(idleId);
            };
        }
        const timeoutId = window.setTimeout(runBackfill, 0);
        return () => {
            cancelled = true;
            window.clearTimeout(timeoutId);
        };
    }, [commitWardAction, timelineEvents, wards]);

    const saveAppointment = useCallback(
        (wardKey: string, _name: string, ymdInput: string) => {
            const ymd = String(ymdInput || dateDraftByKey[wardKey] || '').trim();
            if (!ymd) {
                showToast('اختر تاريخ موعد التسليم', 'warning');
                return;
            }
            if (ymd < todayYmd) {
                showToast('لا يمكن اختيار تاريخ موعد في الماضي', 'warning');
                return;
            }
            const next = patchCustodyWardRecord(effectiveBundle, custodyWardNames, wardKey, {
                appointmentYmd: ymd,
                status: 'scheduled',
            });
            const ward = next.wards.find((w) => w.wardKey === wardKey);
            if (!ward) return;
            if (!commitWardAction(ward, 'appointment', next)) return;
            showToast('تم حفظ موعد التسليم', 'success');
            setShowDatePickerByKey((prev) => ({ ...prev, [wardKey]: false }));
            setDateDraftByKey((prev) => {
                const copy = { ...prev };
                delete copy[wardKey];
                return copy;
            });
        },
        [effectiveBundle, commitWardAction, custodyWardNames, dateDraftByKey, showToast, todayYmd],
    );

    const markEarlyReceipt = useCallback(
        async (wardKey: string, name: string) => {
            const accepted = await confirmInSection(
                `تأكيد استلام المحضون «${name}» خارج الدائرة أو قبل الموعد المحدد؟`,
            );
            if (!accepted) return;
            const ts = new Date().toISOString();
            const next = patchCustodyWardRecord(effectiveBundle, custodyWardNames, wardKey, {
                status: 'received_early',
                statusAt: ts,
            });
            const ward = next.wards.find((w) => w.wardKey === wardKey);
            if (!ward) return;
            if (!commitWardAction(ward, 'received_early', next)) return;
            showToast('تم تسجيل الاستلام المبكر', 'success');
            setExpandedKey(null);
            setShowDatePickerByKey((prev) => {
                const copy = { ...prev };
                delete copy[wardKey];
                return copy;
            });
        },
        [effectiveBundle, commitWardAction, custodyWardNames, showToast, confirmInSection],
    );

    const markReceived = useCallback(
        (wardKey: string, _name: string) => {
            const ts = new Date().toISOString();
            const next = patchCustodyWardRecord(effectiveBundle, custodyWardNames, wardKey, {
                status: 'received',
                statusAt: ts,
            });
            const ward = next.wards.find((w) => w.wardKey === wardKey);
            if (!ward) return;
            if (!commitWardAction(ward, 'received', next)) return;
            showToast('تم تسجيل الاستلام', 'success');
            setExpandedKey(null);
            setShowDatePickerByKey((prev) => {
                const copy = { ...prev };
                delete copy[wardKey];
                return copy;
            });
        },
        [effectiveBundle, commitWardAction, custodyWardNames, showToast],
    );

    const markNotReceived = useCallback(
        async (wardKey: string, name: string) => {
            const accepted = await confirmInSection(`تأكيد عدم استلام المحضون «${name}» في الموعد؟`);
            if (!accepted) return;
            const ts = new Date().toISOString();
            const missed = patchCustodyWardRecord(effectiveBundle, custodyWardNames, wardKey, {
                status: 'not_received',
                statusAt: ts,
            });
            const missedWard = missed.wards.find((w) => w.wardKey === wardKey);
            const restarted = restartCustodyWardBundleAfterMissedDelivery(missed, wardKey);
            if (missedWard) {
                if (!commitWardAction(missedWard, 'not_received', restarted)) return;
            }
            showToast('تم التسجيل — حدّد موعد تسليم جديد', 'warning');
            setExpandedKey(wardKey);
            setShowDatePickerByKey((prev) => ({ ...prev, [wardKey]: false }));
            setDateDraftByKey((prev) => ({ ...prev, [wardKey]: '' }));
        },
        [effectiveBundle, commitWardAction, custodyWardNames, showToast, confirmInSection],
    );

    const toggleWardRow = useCallback(
        (wardKey: string, hasAppointment: boolean, awaitingReschedule: boolean) => {
            setExpandedKey((prev) => {
                const next = prev === wardKey ? null : wardKey;
                if (next === wardKey && !hasAppointment && !awaitingReschedule) {
                    setShowDatePickerByKey((p) => ({ ...p, [wardKey]: true }));
                } else if (next !== wardKey) {
                    setShowDatePickerByKey((p) => {
                        if (!p[wardKey]) return p;
                        const copy = { ...p };
                        delete copy[wardKey];
                        return copy;
                    });
                }
                return next;
            });
        },
        [],
    );

    const setDateDraft = useCallback((wardKey: string, value: string) => {
        setDateDraftByKey((prev) => ({ ...prev, [wardKey]: value }));
    }, []);

    const openRescheduleCalendar = useCallback((wardKey: string) => {
        setShowDatePickerByKey((prev) => ({ ...prev, [wardKey]: true }));
    }, []);

    return {
        wards,
        timelineEvents,
        todayYmd,
        moduleExpanded,
        setModuleExpanded,
        expandedKey,
        dateDraftByKey,
        showDatePickerByKey,
        deliveredCount,
        sectionConfirmDialog,
        saveAppointment,
        markEarlyReceipt,
        markReceived,
        markNotReceived,
        toggleWardRow,
        setDateDraft,
        openRescheduleCalendar,
    };
}
