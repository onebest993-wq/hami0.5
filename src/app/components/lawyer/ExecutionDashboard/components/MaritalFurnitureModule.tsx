import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from 'react';
import { createPortal } from 'react-dom';
import { Calendar, CheckCircle, ChevronLeft, Lock, Pencil, Search, Sofa, Truck, X, XCircle } from 'lucide-react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { MaritalFurnitureDeliveryOutcome, MaritalFurnitureItem } from '@/app/types/maritalFurniture';
import { MaritalFurnitureSetupSection } from '@/app/components/lawyer/ExecutionCreationView/components/MaritalFurnitureSetupSection';
import { parseMoneyInput } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/execution/executionModalStack';
import {
    formatMoneyIntegerDisplay,
    handleMoneyInputChange,
} from '@/app/utils/moneyInput';
import {
    applyMaritalFurnitureDeliveryOutcome,
    countMaritalFurnitureDeliveryStatus,
    createEmptyMaritalFurnitureItem,
    formatMaritalFurnitureIqd,
    furnitureDetailsFromItems,
    hasAnyMaritalFurnitureDeliveryRecorded,
    isMaritalFurnitureDeliveryStatusRecorded,
    isMaritalFurnitureItemDeliveryLocked,
    lineTotalIqd,
    normalizeMaritalFurnitureItems,
    readMaritalFurnitureDeliverySchedule,
    readMaritalFurnitureItems,
    resolveMaritalFurnitureDeliveryOutcome,
    sumDeliveredMaritalFurnitureTotal,
    sumMaritalFurnitureTotal,
    sumUndeliveredMaritalFurnitureTotal,
} from '@/app/utils/maritalFurniture';
import { buildArabicScheduleLabel, isScheduleYmdReached } from '@/app/utils/maritalFurnitureDeliveryWorkflow';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    runPersistMaritalFurnitureDeliverySchedule,
    runPersistMaritalFurnitureItemDeliveryOutcome,
} from '@/app/utils/maritalFurnitureDeliveryPersistence';

export interface MaritalFurnitureModuleProps {
    executionData: ExecutionFile | null | undefined;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    pushTimelineEvent?: (
        event: TimelineEvent,
        options?: { mergePatch?: Record<string, unknown> },
    ) => boolean | void;
    setTimelineEvents?: Dispatch<SetStateAction<TimelineEvent[]>>;
    timelineEvents?: TimelineEvent[];
    nextTimelineId?: () => string;
    todayYmd?: string;
    locked?: boolean;
}

const SEARCH_MIN = 10;
const WORKSPACE_Z = EXEC_MODAL_Z.nestedOverFollowUpPortal;

function countLockedDeliveryItems(rows: MaritalFurnitureItem[]): number {
    const stats = countMaritalFurnitureDeliveryStatus(rows);
    return stats.delivered + stats.failed + stats.external;
}

function formatCurrency(value: string): string {
    return formatMoneyIntegerDisplay(value);
}

const DELIVERY_BTN =
    'w-full rounded-lg border px-1.5 py-1 text-[9px] font-bold leading-tight text-center touch-manipulation transition-colors disabled:opacity-45 min-h-[28px]';

const TABLE_GRID =
    'grid grid-cols-[minmax(0,1.1fr)_2rem_minmax(0,3.25rem)_minmax(0,3.5rem)_minmax(4.75rem,1.05fr)] gap-1 px-2.5 sm:gap-1.5 sm:px-3';

function DeliveryStatusCell({ row }: { row: MaritalFurnitureItem }) {
    const outcome = resolveMaritalFurnitureDeliveryOutcome(row);
    if (outcome === 'pending') {
        return <span className="text-[9px] font-bold text-slate-500 text-center block">—</span>;
    }
    if (outcome === 'delivered') {
        return (
            <span className="inline-flex max-w-full items-center justify-center gap-0.5 rounded-lg bg-emerald-500/15 px-1.5 py-1 text-[9px] font-bold text-emerald-300 ring-1 ring-emerald-500/30 leading-tight">
                <CheckCircle size={11} className="shrink-0" aria-hidden />
                <span className="truncate">مُسلَّم</span>
            </span>
        );
    }
    if (outcome === 'external_delivered') {
        return (
            <span
                className="inline-flex max-w-full flex-col items-center justify-center rounded-lg bg-sky-500/15 px-1.5 py-1 text-[8px] font-bold text-sky-300 ring-1 ring-sky-500/30 leading-[1.15] text-center"
                title="تسليم خارجي — مقفل"
            >
                <Truck size={11} className="shrink-0" aria-hidden />
                <span className="mt-0.5">خارجي</span>
            </span>
        );
    }
    return (
        <span className="inline-flex max-w-full items-center justify-center gap-0.5 rounded-lg bg-rose-500/15 px-1.5 py-1 text-[9px] font-bold text-rose-300 ring-1 ring-rose-500/30 leading-tight">
            <XCircle size={11} className="shrink-0" aria-hidden />
            <span className="truncate">تعذّر</span>
        </span>
    );
}

function DeliveryRowActions({
    row,
    scheduleYmd,
    todayYmd,
    earlyDeliveryUnlocked,
    busy,
    locked,
    isPendingConfirm,
    onConfirmPending,
    onCancelPending,
    onRequestOutcome,
}: {
    row: MaritalFurnitureItem;
    scheduleYmd: string;
    todayYmd: string;
    earlyDeliveryUnlocked: boolean;
    busy: boolean;
    locked: boolean;
    isPendingConfirm: boolean;
    onConfirmPending: () => void;
    onCancelPending: () => void;
    onRequestOutcome: (itemId: string, outcome: MaritalFurnitureDeliveryOutcome) => void;
}) {
    const outcome = resolveMaritalFurnitureDeliveryOutcome(row);
    if (outcome !== 'pending') {
        return (
            <div className="flex min-w-0 w-full items-center justify-center">
                <DeliveryStatusCell row={row} />
            </div>
        );
    }
    if (locked) {
        return (
            <div className="min-w-0 w-full text-center">
                <span className="text-[9px] font-bold text-slate-500 leading-tight">مقفل</span>
            </div>
        );
    }

    if (isPendingConfirm) {
        return (
            <div
                className="flex min-w-0 w-full flex-col gap-1"
                data-testid="marital-furniture-pending-outcome"
            >
                <div className="flex gap-1">
                    <button
                        type="button"
                        data-testid="marital-furniture-confirm-outcome"
                        onClick={onConfirmPending}
                        className={`${DELIVERY_BTN} flex-1 border-emerald-500/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25`}
                    >
                        نعم
                    </button>
                    <button
                        type="button"
                        data-testid="marital-furniture-cancel-outcome"
                        onClick={onCancelPending}
                        className={`${DELIVERY_BTN} flex-1 border-white/12 bg-white/5 text-slate-300 hover:bg-white/10`}
                    >
                        لا
                    </button>
                </div>
            </div>
        );
    }

    const scheduleReached = scheduleYmd
        ? isScheduleYmdReached(scheduleYmd, todayYmd) || earlyDeliveryUnlocked
        : false;
    const beforeSchedule = !scheduleYmd || !scheduleReached;

    if (beforeSchedule) {
        return (
            <div className="min-w-0 w-full">
                <button
                    type="button"
                    disabled={busy}
                    data-testid={`marital-furniture-external-${row.id}`}
                    onClick={() => onRequestOutcome(row.id, 'external_delivered')}
                    className={`${DELIVERY_BTN} border-sky-500/35 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20`}
                >
                    تسليم خارجي
                </button>
            </div>
        );
    }

    return (
        <div className="flex min-w-0 w-full flex-col gap-1">
            <button
                type="button"
                disabled={busy}
                data-testid={`marital-furniture-deliver-${row.id}`}
                onClick={() => onRequestOutcome(row.id, 'delivered')}
                className={`${DELIVERY_BTN} border-emerald-500/35 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20`}
            >
                تسليم
            </button>
            <button
                type="button"
                disabled={busy}
                data-testid={`marital-furniture-fail-${row.id}`}
                onClick={() => onRequestOutcome(row.id, 'failed')}
                className={`${DELIVERY_BTN} border-rose-500/35 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20`}
            >
                تعذّر
            </button>
        </div>
    );
}

function MaritalFurnitureLauncherCard({
    itemCount,
    lockedCount,
    totalLabel,
    scheduleHint,
    onOpen,
    locked,
}: {
    itemCount: number;
    lockedCount: number;
    totalLabel: string;
    scheduleHint: string;
    onOpen: () => void;
    locked: boolean;
}) {
    return (
        <button
            type="button"
            data-testid="marital-furniture-launcher"
            onClick={onOpen}
            className="mx-3 mt-2 w-[calc(100%-1.5rem)] rounded-2xl border border-[#E6C673]/25 bg-gradient-to-br from-[#E6C673]/10 via-[#0B1120]/90 to-[#0B1120]/90 px-3.5 py-3 text-right ring-1 ring-white/[0.04] transition-colors hover:border-[#E6C673]/40 hover:bg-[#E6C673]/12 touch-manipulation"
            dir="rtl"
        >
            <div className="flex items-start justify-between gap-3 flex-row-reverse">
                <div className="flex items-center gap-2 flex-row-reverse min-w-0">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E6C673]/30 bg-[#E6C673]/12 text-[#E6C673]">
                        <Sofa size={18} strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-[#E6C673]">الأثاث الزوجية</p>
                        <p className="mt-0.5 text-[10px] text-slate-400 truncate">{scheduleHint}</p>
                    </div>
                </div>
                <ChevronLeft size={18} className="shrink-0 text-[#E6C673]/55 rotate-180" aria-hidden />
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2 flex-row-reverse text-[10px]">
                <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 font-bold text-slate-200">
                    {itemCount} قطعة
                </span>
                {lockedCount > 0 ? (
                    <span className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 font-bold text-emerald-200">
                        {lockedCount} مُسجَّل
                    </span>
                ) : null}
                <span className="rounded-lg border border-[#E6C673]/20 bg-[#E6C673]/8 px-2 py-1 font-mono font-bold text-[#E6C673]">
                    {totalLabel} د.ع
                </span>
                {locked ? (
                    <span className="rounded-lg border border-slate-500/25 bg-slate-500/10 px-2 py-1 font-bold text-slate-300">
                        للعرض فقط
                    </span>
                ) : (
                    <span className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-2 py-1 font-bold text-sky-200">
                        فتح الإدارة
                    </span>
                )}
            </div>
        </button>
    );
}

function MaritalFurnitureWorkspaceSheet({
    open,
    onClose,
    headerActions,
    children,
}: {
    open: boolean;
    onClose: () => void;
    headerActions: ReactNode;
    children: ReactNode;
}) {
    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className={`fixed inset-0 flex flex-col ${EXEC_MODAL_BACKDROP_STRONG}`}
            style={{ zIndex: WORKSPACE_Z }}
            role="dialog"
            aria-modal="true"
            aria-label="إدارة الأثاث الزوجية"
            data-testid="marital-furniture-workspace"
            onClick={onClose}
        >
            <div
                className="mt-auto flex h-[min(96dvh,100%)] w-full max-w-lg flex-col self-center overflow-hidden rounded-t-3xl border border-[#E6C673]/25 bg-[#0B1120] shadow-2xl sm:my-auto sm:h-[min(92dvh,820px)] sm:rounded-3xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
                onClick={(e) => e.stopPropagation()}
                dir="rtl"
            >
                <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-[#0A0F1C]/95 px-3 py-3 backdrop-blur-md flex-row-reverse">
                    <button
                        type="button"
                        data-testid="marital-furniture-close"
                        onClick={onClose}
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 touch-manipulation"
                        aria-label="إغلاق"
                    >
                        <X size={18} />
                    </button>
                    <div className="min-w-0 flex-1 text-right">
                        <p className="text-sm font-bold text-[#E6C673]">إدارة الأثاث الزوجية</p>
                        <p className="text-[10px] text-slate-500">القائمة · الموعد · التسليم الميداني</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 flex-row-reverse">{headerActions}</div>
                </div>
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4">
                    {children}
                </div>
            </div>
        </div>,
        document.body,
    );
}

export const MaritalFurnitureModule: React.FC<MaritalFurnitureModuleProps> = ({
    executionData,
    persistExecutionMerge,
    showToast,
    pushTimelineEvent,
    setTimelineEvents,
    timelineEvents = [],
    nextTimelineId,
    todayYmd: todayYmdProp,
    locked = false,
}) => {
    const [workspaceOpen, setWorkspaceOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [draftItems, setDraftItems] = useState<MaritalFurnitureItem[]>([]);
    const [scheduleYmdDraft, setScheduleYmdDraft] = useState('');
    const [earlyDeliveryUnlocked, setEarlyDeliveryUnlocked] = useState(false);
    const [savingSchedule, setSavingSchedule] = useState(false);
    const [savingItemId, setSavingItemId] = useState<string | null>(null);
    const [localItems, setLocalItems] = useState<MaritalFurnitureItem[]>([]);
    const [localSchedule, setLocalSchedule] = useState<{ ymd: string; label: string }>({
        ymd: '',
        label: '',
    });
    const [editingSchedule, setEditingSchedule] = useState(false);
    const [pendingDelivery, setPendingDelivery] = useState<{
        itemId: string;
        outcome: Exclude<MaritalFurnitureDeliveryOutcome, 'pending'>;
        itemName: string;
    } | null>(null);
    const materializedRef = useRef(false);

    const todayYmd = todayYmdProp ?? getLocalTodayYmd();

    const items = useMemo(
        () => readMaritalFurnitureItems(executionData as MaritalFurnitureModuleProps['executionData']),
        [executionData],
    );

    const itemsDeliverySig = useMemo(
        () =>
            items
                .map(
                    (row) =>
                        `${row.id}:${row.deliveryOutcome ?? ''}:${row.delivered ?? ''}:${row.deliveryRecordedAt ?? ''}`,
                )
                .join('|'),
        [items],
    );

    useEffect(() => {
        setLocalItems((prev) => {
            if (items.length === 0) return prev.length > 0 ? prev : items;
            const merged = items.map((serverRow) => {
                const localRow = prev.find((p) => String(p.id) === String(serverRow.id));
                if (!localRow) return serverRow;
                const serverLocked = isMaritalFurnitureItemDeliveryLocked(serverRow);
                const localLocked = isMaritalFurnitureItemDeliveryLocked(localRow);
                if (localLocked && !serverLocked) return localRow;
                if (serverLocked) return serverRow;
                return localRow.deliveryRecordedAt ? localRow : serverRow;
            });
            return merged;
        });
    }, [items, itemsDeliverySig]);

    const deliverySchedule = useMemo(
        () => readMaritalFurnitureDeliverySchedule(executionData),
        [executionData],
    );

    useEffect(() => {
        setLocalSchedule((prev) => {
            if (deliverySchedule.ymd) return deliverySchedule;
            if (prev.ymd) return prev;
            return deliverySchedule;
        });
        if (deliverySchedule.ymd) setEditingSchedule(false);
    }, [deliverySchedule.ymd, deliverySchedule.label]);

    useEffect(() => {
        if (locked || materializedRef.current || !executionData) return;
        if (hasAnyMaritalFurnitureDeliveryRecorded(items)) return;
        const stored = (executionData as { maritalFurnitureItems?: MaritalFurnitureItem[] })
            .maritalFurnitureItems;
        if (Array.isArray(stored) && stored.length > 0) return;
        const details = String(
            (executionData as { furnitureDetails?: string }).furnitureDetails || '',
        ).trim();
        if (!details || items.length === 0) return;
        materializedRef.current = true;
        const furnitureValue = sumMaritalFurnitureTotal(items);
        const ok = persistExecutionMerge({
            maritalFurnitureItems: items,
            furnitureValue,
            furnitureDetails: furnitureDetailsFromItems(items),
        });
        if (ok === false) materializedRef.current = false;
    }, [executionData, items, locked, persistExecutionMerge]);

    const displayItems = localItems.length > 0 ? localItems : items;
    const total = useMemo(() => sumMaritalFurnitureTotal(displayItems), [displayItems]);
    const deliveryRecorded = useMemo(
        () => isMaritalFurnitureDeliveryStatusRecorded(executionData),
        [executionData],
    );
    const deliveryCounts = useMemo(() => countMaritalFurnitureDeliveryStatus(displayItems), [displayItems]);
    const deliveredTotal = useMemo(() => sumDeliveredMaritalFurnitureTotal(displayItems), [displayItems]);
    const undeliveredTotal = useMemo(() => sumUndeliveredMaritalFurnitureTotal(displayItems), [displayItems]);
    const lockedDeliveryCount = useMemo(() => countLockedDeliveryItems(displayItems), [displayItems]);

    const visibleItems = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return displayItems;
        return displayItems.filter((row) => row.name.toLowerCase().includes(q));
    }, [displayItems, search]);

    const undeliveredItems = useMemo(
        () => displayItems.filter((row) => row.delivered === false),
        [displayItems],
    );
    const canEditAfterDelivery = deliveryRecorded && undeliveredItems.length > 0;

    const isDeliveredRowLocked = useCallback(
        (row: MaritalFurnitureItem) => deliveryRecorded && row.delivered === true,
        [deliveryRecorded],
    );

    const startEdit = useCallback(() => {
        if (deliveryRecorded && undeliveredItems.length === 0) {
            showToast('جميع القطع مُسلَّمة — لا يمكن التعديل', 'info');
            return;
        }
        setDraftItems(
            items.length > 0 ? items.map((row) => ({ ...row })) : [createEmptyMaritalFurnitureItem()],
        );
        setIsEditing(true);
    }, [items, deliveryRecorded, undeliveredItems.length, showToast]);

    const cancelEdit = useCallback(() => {
        setIsEditing(false);
        setDraftItems([]);
    }, []);

    const handleSave = useCallback(() => {
        const hasDeliveryRecorded = isMaritalFurnitureDeliveryStatusRecorded(executionData);
        const normalized = normalizeMaritalFurnitureItems(draftItems).map((row) => {
            const src = draftItems.find((d) => d.id === row.id);
            if (typeof src?.delivered === 'boolean') {
                return { ...row, delivered: src.delivered };
            }
            return row;
        });
        if (normalized.length === 0) {
            showToast('أضف قطعة واحدة على الأقل باسم صالح', 'warning');
            return;
        }
        if (hasDeliveryRecorded) {
            const missingDelivered = items.filter(
                (row) => row.delivered === true && !normalized.some((n) => n.id === row.id),
            );
            if (missingDelivered.length > 0) {
                showToast('لا يمكن حذف القطع المُسلَّمة', 'warning');
                return;
            }
            for (const row of normalized) {
                if (row.delivered !== true) continue;
                const original = items.find((i) => i.id === row.id);
                if (!original) continue;
                if (
                    row.name !== original.name ||
                    row.quantity !== original.quantity ||
                    row.unitPriceIqd !== original.unitPriceIqd
                ) {
                    showToast('القطع المُسلَّمة مقفلة — التعديل للغير مُسلَّم فقط', 'warning');
                    return;
                }
            }
        }
        const furnitureValue = sumMaritalFurnitureTotal(normalized);
        const financialAmount = hasDeliveryRecorded
            ? sumUndeliveredMaritalFurnitureTotal(normalized)
            : 0;
        const ok = persistExecutionMerge({
            maritalFurnitureItems: normalized,
            furnitureValue,
            furnitureDetails: furnitureDetailsFromItems(normalized),
            totalAmount: financialAmount,
            debtAmount: financialAmount,
        });
        if (ok === false) {
            showToast('تعذّر حفظ قائمة الأثاث — تحقق من الإضبارة', 'error');
            return;
        }
        setLocalItems(normalized);
        setIsEditing(false);
        setDraftItems([]);
        showToast(
            hasDeliveryRecorded ? 'تم حفظ تعديلات غير المُسلَّم' : 'تم حفظ قائمة الأثاث',
            'success',
        );
    }, [draftItems, executionData, items, persistExecutionMerge, showToast]);

    const editTotal = useMemo(() => sumMaritalFurnitureTotal(draftItems), [draftItems]);

    const canManageDelivery = !locked && displayItems.length > 0 && !isEditing;
    const scheduleYmd = localSchedule.ymd || deliverySchedule.ymd;
    const scheduleLabel = localSchedule.label || deliverySchedule.label;
    const showScheduleForm = canManageDelivery && (!scheduleYmd || editingSchedule);

    const scheduleHint = scheduleYmd
        ? scheduleLabel || `موعد: ${scheduleYmd}`
        : 'لم يُحدَّد موعد التسليم بعد';

    const requestCloseWorkspace = useCallback(() => {
        if (isEditing) {
            if (!window.confirm('لديك تعديلات غير محفوظة. إغلاق مساحة الإدارة؟')) return;
            cancelEdit();
        }
        setPendingDelivery(null);
        setWorkspaceOpen(false);
    }, [isEditing, cancelEdit]);

    useEffect(() => {
        if (!workspaceOpen) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') requestCloseWorkspace();
        };
        window.addEventListener('keydown', onKeyDown);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [workspaceOpen, requestCloseWorkspace]);

    const timelineDeps = useMemo(
        () => ({
            persistExecutionMerge,
            pushTimelineEvent,
            setTimelineEvents,
            getTimelineEvents: () => timelineEvents,
            nextTimelineId,
        }),
        [
            persistExecutionMerge,
            pushTimelineEvent,
            setTimelineEvents,
            timelineEvents,
            nextTimelineId,
        ],
    );

    const handleSaveSchedule = useCallback(() => {
        if (typeof persistExecutionMerge !== 'function') {
            showToast('تعذّر الحفظ — الإضبارة غير جاهزة', 'error');
            return;
        }
        const ymd = (scheduleYmdDraft || scheduleYmd).trim();
        if (!ymd) {
            showToast('اختر تاريخ موعد التسليم', 'warning');
            return;
        }
        setSavingSchedule(true);
        try {
            const nextScheduleLabel = buildArabicScheduleLabel(ymd);
            const ok = runPersistMaritalFurnitureDeliverySchedule(
                { ymd, displayAr: ymd, scheduleLabel: nextScheduleLabel },
                timelineDeps,
            );
            if (!ok) {
                showToast('تعذّر حفظ موعد التسليم — تحقق من الإضبارة', 'error');
                return;
            }
            setLocalSchedule({ ymd, label: nextScheduleLabel });
            setScheduleYmdDraft('');
            setEditingSchedule(false);
            showToast('تم حفظ موعد التسليم الميداني', 'success');
        } finally {
            setSavingSchedule(false);
        }
    }, [scheduleYmdDraft, scheduleYmd, timelineDeps, showToast]);

    const executeItemOutcome = useCallback(
        (itemId: string, outcome: Exclude<MaritalFurnitureDeliveryOutcome, 'pending'>) => {
            if (locked || savingItemId) return;
            if (typeof persistExecutionMerge !== 'function') {
                showToast('تعذّر الحفظ — الإضبارة غير جاهزة', 'error');
                return;
            }
            const row = displayItems.find((r) => String(r.id) === String(itemId));
            if (!row || isMaritalFurnitureItemDeliveryLocked(row)) return;

            const ts = new Date().toISOString();
            const previousItems = displayItems;
            const optimisticItems = previousItems.map((item) =>
                String(item.id) === String(itemId)
                    ? applyMaritalFurnitureDeliveryOutcome(item, outcome, ts)
                    : item,
            );
            setLocalItems(optimisticItems);
            setSavingItemId(itemId);
            try {
                const ok = runPersistMaritalFurnitureItemDeliveryOutcome(
                    { itemId, outcome },
                    {
                        executionData,
                        items: optimisticItems,
                        showToast,
                        ...timelineDeps,
                    },
                );
                if (!ok) {
                    setLocalItems(previousItems);
                    showToast('تعذّر حفظ حالة التسليم — تحقق من الإضبارة', 'error');
                }
            } catch {
                setLocalItems(previousItems);
                showToast('تعذّر حفظ حالة التسليم', 'error');
            } finally {
                setSavingItemId(null);
            }
        },
        [
            displayItems,
            locked,
            savingItemId,
            executionData,
            timelineDeps,
            showToast,
            persistExecutionMerge,
        ],
    );

    const requestItemOutcome = useCallback(
        (itemId: string, outcome: MaritalFurnitureDeliveryOutcome) => {
            if (locked || savingItemId || outcome === 'pending') return;
            const row = displayItems.find((r) => String(r.id) === String(itemId));
            if (!row || isMaritalFurnitureItemDeliveryLocked(row)) return;
            setPendingDelivery({
                itemId,
                outcome: outcome as Exclude<MaritalFurnitureDeliveryOutcome, 'pending'>,
                itemName: row.name,
            });
        },
        [displayItems, locked, savingItemId],
    );

    const confirmPendingDelivery = useCallback(() => {
        if (!pendingDelivery) return;
        const { itemId, outcome } = pendingDelivery;
        setPendingDelivery(null);
        executeItemOutcome(itemId, outcome);
    }, [pendingDelivery, executeItemOutcome]);

    const headerActions = !locked ? (
        isEditing ? (
            <>
                <button
                    type="button"
                    data-testid="marital-furniture-save-list"
                    onClick={handleSave}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-bold text-emerald-200 hover:bg-emerald-500/25 touch-manipulation"
                >
                    حفظ
                </button>
                <button
                    type="button"
                    data-testid="marital-furniture-cancel-edit"
                    onClick={cancelEdit}
                    className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-slate-300 hover:bg-white/10 touch-manipulation"
                >
                    إلغاء
                </button>
            </>
        ) : deliveryRecorded && !canEditAfterDelivery ? null : (
            <button
                type="button"
                data-testid="marital-furniture-start-edit"
                onClick={startEdit}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/10 px-3 py-1.5 text-[11px] font-bold text-[#E6C673] hover:bg-[#E6C673]/20 touch-manipulation"
            >
                <Pencil size={12} />
                {displayItems.length === 0 ? 'إضافة' : deliveryRecorded ? 'تعديل غير المُسلَّم' : 'تعديل'}
            </button>
        )
    ) : null;

    const workspaceBody = (
        <div className="space-y-4">
            {isEditing ? (
                <>
                    {deliveryRecorded ? (
                        <p className="text-[11px] text-amber-300/90 text-right rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                            القطع المُسلَّمة مقفلة — يمكنك تعديل أو حذف غير المُسلَّم فقط.
                        </p>
                    ) : null}
                    <MaritalFurnitureSetupSection
                        items={draftItems}
                        onChange={setDraftItems}
                        formatCurrency={formatCurrency}
                        onPriceInput={(e, onParsed) => {
                            handleMoneyInputChange(e.target.value, (raw) => {
                                onParsed(parseMoneyInput(raw));
                            });
                        }}
                        isRowLocked={isDeliveredRowLocked}
                        allowAddRows={!deliveryRecorded}
                    />
                    <div className="rounded-xl border border-[#E6C673]/25 bg-[#E6C673]/8 px-4 py-3 text-right">
                        <p className="text-[10px] text-slate-400">المجموع الكلي (قبل الحفظ)</p>
                        <p className="text-xl font-black text-[#E6C673] font-mono">
                            {formatMaritalFurnitureIqd(editTotal)} <span className="text-xs">د.ع</span>
                        </p>
                    </div>
                </>
            ) : displayItems.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-8 text-center">
                    <p className="text-sm text-slate-400">لم تُسجَّل قطع الأثاث بعد.</p>
                    {!locked ? (
                        <button
                            type="button"
                            onClick={startEdit}
                            className="mt-4 inline-flex min-h-[44px] items-center rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/10 px-4 py-2 text-xs font-bold text-[#E6C673] hover:bg-[#E6C673]/20 touch-manipulation"
                        >
                            إضافة أول قطعة
                        </button>
                    ) : null}
                </div>
            ) : (
                <>
                    {canManageDelivery && (scheduleYmd || showScheduleForm) ? (
                        <div className="rounded-xl border border-sky-500/25 bg-sky-500/6 px-3 py-3 text-right space-y-2">
                            <p className="text-[11px] font-bold text-sky-200">موعد التسليم الميداني</p>
                            {showScheduleForm ? (
                                <div className="flex flex-col gap-2">
                                    <input
                                        type="date"
                                        value={scheduleYmdDraft || scheduleYmd}
                                        min={todayYmd}
                                        onChange={(e) => setScheduleYmdDraft(e.target.value)}
                                        className="w-full bg-black/30 border border-white/12 text-white text-sm px-3 py-2.5 rounded-xl focus:border-sky-400/45 outline-none text-right min-h-[44px]"
                                    />
                                    <div className="flex flex-row-reverse gap-2">
                                        <button
                                            type="button"
                                            data-testid="marital-furniture-save-schedule"
                                            disabled={savingSchedule || !(scheduleYmdDraft || scheduleYmd).trim()}
                                            onClick={handleSaveSchedule}
                                            className="inline-flex flex-1 min-h-[44px] items-center justify-center rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 py-2 text-xs font-bold text-sky-100 hover:bg-sky-500/25 disabled:opacity-45 touch-manipulation"
                                        >
                                            حفظ الموعد
                                        </button>
                                        {scheduleYmd ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingSchedule(false);
                                                    setScheduleYmdDraft('');
                                                }}
                                                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 touch-manipulation"
                                            >
                                                إلغاء
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 flex-row-reverse justify-between">
                                    <div className="flex items-center gap-2 flex-row-reverse min-w-0">
                                        <Calendar size={15} className="text-sky-300 shrink-0" />
                                        <p className="text-xs text-sky-100/95 leading-snug">{scheduleLabel}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setScheduleYmdDraft(scheduleYmd);
                                            setEditingSchedule(true);
                                        }}
                                        className="shrink-0 inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-[10px] font-bold text-sky-200 hover:bg-sky-500/18 touch-manipulation"
                                    >
                                        <Pencil size={11} />
                                        تعديل
                                    </button>
                                </div>
                            )}
                            {scheduleYmd &&
                            !showScheduleForm &&
                            !isScheduleYmdReached(scheduleYmd, todayYmd) &&
                            !earlyDeliveryUnlocked ? (
                                <button
                                    type="button"
                                    onClick={() => setEarlyDeliveryUnlocked(true)}
                                    className="w-full text-[10px] font-bold text-amber-300/90 underline underline-offset-2 text-right touch-manipulation min-h-[36px]"
                                >
                                    تفعيل التسليم قبل الموعد
                                </button>
                            ) : null}
                        </div>
                    ) : null}

                    {deliveryRecorded ? (
                        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 space-y-1 text-[11px]">
                            <p className="text-emerald-300/90">
                                مُسلَّم / خارجي: {deliveryCounts.delivered + deliveryCounts.external}{' '}
                                قطعة — {formatMaritalFurnitureIqd(deliveredTotal)} د.ع
                            </p>
                            <p className="text-rose-300/90">
                                تعذّر (المركز المالي): {deliveryCounts.failed} قطعة —{' '}
                                {formatMaritalFurnitureIqd(undeliveredTotal)} د.ع
                            </p>
                        </div>
                    ) : null}

                    {displayItems.length >= SEARCH_MIN ? (
                        <div className="relative">
                            <Search
                                size={15}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                            />
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="بحث في قائمة الأثاث…"
                                className="w-full bg-black/30 border border-white/10 text-white text-sm pr-10 pl-3 py-2.5 rounded-xl focus:border-[#E6C673]/40 outline-none text-right min-h-[44px]"
                            />
                        </div>
                    ) : null}

                    <p className="text-[10px] text-slate-400 text-right leading-relaxed px-0.5">
                        {scheduleYmd && !isScheduleYmdReached(scheduleYmd, todayYmd) && !earlyDeliveryUnlocked
                            ? 'قبل الموعد: «تسليم خارجي» فقط — يُقفل الصف ولا يدخل المركز المالي.'
                            : 'بعد الموعد: «تسليم» أو «تعذّر» — التعذّر فقط ينتقل للمركز المالي.'}
                    </p>

                    <div className="overflow-hidden rounded-2xl border border-white/10">
                        <div className="max-h-[min(42vh,300px)] overflow-y-auto overscroll-contain">
                            <div
                                className={`sticky top-0 z-10 ${TABLE_GRID} py-2 bg-[#0A0F1C]/98 border-b border-white/10 text-[10px] font-bold text-slate-400 text-right backdrop-blur-sm items-center`}
                            >
                                <span>اسم الأثاث</span>
                                <span className="text-center">العدد</span>
                                <span>السعر</span>
                                <span>الإجمالي</span>
                                <span className="text-center">التسليم</span>
                            </div>
                            {visibleItems.length === 0 ? (
                                <p className="px-3 py-8 text-center text-sm text-slate-500">لا توجد نتائج</p>
                            ) : (
                                visibleItems.map((row) => {
                                    const rowDeliveryLocked =
                                        isMaritalFurnitureItemDeliveryLocked(row);
                                    return (
                                    <div
                                        key={row.id}
                                        className={`${TABLE_GRID} py-2.5 min-h-[44px] border-b border-white/5 text-right even:bg-white/[0.015] items-center ${
                                            rowDeliveryLocked
                                                ? 'bg-white/[0.02] opacity-90'
                                                : ''
                                        }`}
                                    >
                                        <span className="font-bold text-white text-[11px] leading-snug break-words min-w-0 flex items-start gap-1 justify-end">
                                            {rowDeliveryLocked ? (
                                                <Lock
                                                    size={10}
                                                    className="shrink-0 text-slate-500 mt-0.5"
                                                    aria-hidden
                                                />
                                            ) : null}
                                            <span className={rowDeliveryLocked ? 'text-slate-300' : ''}>
                                                {row.name}
                                            </span>
                                        </span>
                                        <span className="text-slate-300 font-mono text-[11px] text-center">
                                            {row.quantity}
                                        </span>
                                        <span className="text-slate-300 font-mono text-[10px] tabular-nums truncate">
                                            {formatMaritalFurnitureIqd(row.unitPriceIqd)}
                                        </span>
                                        <span className="text-[#E6C673] font-bold font-mono text-[10px] tabular-nums truncate">
                                            {formatMaritalFurnitureIqd(lineTotalIqd(row))}
                                        </span>
                                        <DeliveryRowActions
                                            row={row}
                                            scheduleYmd={scheduleYmd}
                                            todayYmd={todayYmd}
                                            earlyDeliveryUnlocked={earlyDeliveryUnlocked}
                                            busy={savingItemId === row.id}
                                            locked={locked}
                                            isPendingConfirm={
                                                pendingDelivery?.itemId === row.id
                                            }
                                            onConfirmPending={() => {
                                                if (pendingDelivery?.itemId === row.id) {
                                                    confirmPendingDelivery();
                                                }
                                            }}
                                            onCancelPending={() => {
                                                if (pendingDelivery?.itemId === row.id) {
                                                    setPendingDelivery(null);
                                                }
                                            }}
                                            onRequestOutcome={requestItemOutcome}
                                        />
                                    </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="rounded-xl border border-[#E6C673]/25 bg-[#E6C673]/8 px-4 py-3 text-right space-y-1">
                        <p className="text-[10px] text-slate-400">المجموع الكلي للقائمة</p>
                        <p className="text-xl font-black text-[#E6C673] font-mono">
                            {formatMaritalFurnitureIqd(total)} <span className="text-xs">د.ع</span>
                        </p>
                        {deliveryRecorded ? (
                            <p className="text-[11px] text-rose-300/90 pt-1 border-t border-white/5">
                                المتبقي في المركز المالي:{' '}
                                <span className="font-bold font-mono">
                                    {formatMaritalFurnitureIqd(undeliveredTotal)} د.ع
                                </span>
                            </p>
                        ) : null}
                    </div>
                </>
            )}
        </div>
    );

    return (
        <>
            <MaritalFurnitureLauncherCard
                itemCount={displayItems.length}
                lockedCount={lockedDeliveryCount}
                totalLabel={formatMaritalFurnitureIqd(total)}
                scheduleHint={scheduleHint}
                onOpen={() => setWorkspaceOpen(true)}
                locked={locked}
            />
            <MaritalFurnitureWorkspaceSheet
                open={workspaceOpen}
                onClose={requestCloseWorkspace}
                headerActions={headerActions}
            >
                {workspaceBody}
            </MaritalFurnitureWorkspaceSheet>
        </>
    );
};
