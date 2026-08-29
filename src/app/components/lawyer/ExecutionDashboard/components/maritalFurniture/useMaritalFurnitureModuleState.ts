import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import type { MaritalFurnitureDeliveryOutcome, MaritalFurnitureItem } from '@/app/types/maritalFurniture';
import {
    countMaritalFurnitureDeliveryStatus,
    createEmptyMaritalFurnitureItem,
    furnitureDetailsFromItems,
    hasAnyMaritalFurnitureDeliveryRecorded,
    isMaritalFurnitureDeliveryStatusRecorded,
    isMaritalFurnitureItemDeliveryLocked,
    normalizeMaritalFurnitureItems,
    readMaritalFurnitureDeliverySchedule,
    readMaritalFurnitureItems,
    resolveMaritalFurnitureDeliveryOutcome,
    sumDeliveredMaritalFurnitureTotal,
    sumMaritalFurnitureTotal,
    sumRemainingMaritalFurnitureListTotal,
    sumUndeliveredMaritalFurnitureTotal,
} from '@/app/utils/maritalFurniture';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { useExecutionSectionConfirm } from '@/app/components/lawyer/execution/useExecutionSectionConfirm';
import type { MaritalFurnitureModuleProps } from './maritalFurnitureModuleTypes';
import { useMaritalFurnitureDeliveryHandlers } from './useMaritalFurnitureDeliveryHandlers';
import { buildMaritalFurnitureHeaderActions } from './buildMaritalFurnitureHeaderActions';
import {
    countLockedMaritalFurnitureDeliveryItems,
    formatMaritalFurnitureCurrency,
} from './maritalFurnitureModuleUtils';

export function useMaritalFurnitureModuleState(props: MaritalFurnitureModuleProps) {
    const {
        executionData,
        persistExecutionMerge,
        showToast,
        pushTimelineEvent,
        setTimelineEvents,
        timelineEvents = [],
        nextTimelineId,
        todayYmd: todayYmdProp,
        locked = false,
    } = props;

    const { confirm: confirmInSection, dialog: sectionConfirmDialog } = useExecutionSectionConfirm();

    const [workspaceOpen, setWorkspaceOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [draftItems, setDraftItems] = useState<MaritalFurnitureItem[]>([]);
    const [scheduleYmdDraft, setScheduleYmdDraft] = useState('');
    const [earlyDeliveryUnlocked, setEarlyDeliveryUnlocked] = useState(() =>
        Boolean(
            (executionData as { maritalFurnitureEarlyDeliveryUnlocked?: boolean } | null | undefined)
                ?.maritalFurnitureEarlyDeliveryUnlocked,
        ),
    );
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
    const remainingListTotal = useMemo(
        () => sumRemainingMaritalFurnitureListTotal(displayItems),
        [displayItems],
    );
    const deliveryRecorded = useMemo(
        () => hasAnyMaritalFurnitureDeliveryRecorded(displayItems),
        [displayItems],
    );
    const deliveryCounts = useMemo(() => countMaritalFurnitureDeliveryStatus(displayItems), [displayItems]);
    const deliveredTotal = useMemo(() => sumDeliveredMaritalFurnitureTotal(displayItems), [displayItems]);
    const undeliveredTotal = useMemo(() => sumUndeliveredMaritalFurnitureTotal(displayItems), [displayItems]);
    const lockedDeliveryCount = useMemo(
        () => countLockedMaritalFurnitureDeliveryItems(displayItems),
        [displayItems],
    );

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

    useEffect(() => {
        const persisted = Boolean(
            (executionData as { maritalFurnitureEarlyDeliveryUnlocked?: boolean } | null | undefined)
                ?.maritalFurnitureEarlyDeliveryUnlocked,
        );
        const fromItems = displayItems.some(
            (row) => resolveMaritalFurnitureDeliveryOutcome(row) === 'external_delivered',
        );
        if (persisted || fromItems) setEarlyDeliveryUnlocked(true);
    }, [executionData, displayItems]);

    const unlockEarlyDelivery = useCallback(() => {
        setEarlyDeliveryUnlocked(true);
        persistExecutionMerge({ maritalFurnitureEarlyDeliveryUnlocked: true });
    }, [persistExecutionMerge]);

    const scheduleHint = scheduleYmd
        ? scheduleLabel || `موعد: ${scheduleYmd}`
        : 'لم يُحدَّد موعد التسليم بعد';

    const closeWorkspaceNow = useCallback(() => {
        setPendingDelivery(null);
        setWorkspaceOpen(false);
    }, []);

    const requestCloseWorkspace = useCallback(() => {
        if (!isEditing) {
            closeWorkspaceNow();
            return;
        }
        void confirmInSection('لديك تعديلات غير محفوظة. إغلاق مساحة الإدارة؟').then((accepted) => {
            if (!accepted) return;
            cancelEdit();
            closeWorkspaceNow();
        });
    }, [isEditing, cancelEdit, closeWorkspaceNow, confirmInSection]);

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

    const { handleSaveSchedule, requestItemOutcome, confirmPendingDelivery } =
        useMaritalFurnitureDeliveryHandlers({
            locked,
            savingItemId,
            setSavingItemId,
            displayItems,
            setLocalItems,
            persistExecutionMerge,
            showToast,
            pushTimelineEvent,
            setTimelineEvents,
            timelineEvents,
            nextTimelineId,
            executionData,
            scheduleYmdDraft,
            scheduleYmd,
            setLocalSchedule,
            setScheduleYmdDraft,
            setEditingSchedule,
            setSavingSchedule,
            pendingDelivery,
            setPendingDelivery,
        });

    const openWorkspace = useCallback(() => {
        setWorkspaceOpen(true);
    }, []);

    const headerActions = buildMaritalFurnitureHeaderActions({
        locked,
        isEditing,
        handleSave,
        cancelEdit,
        startEdit,
        deliveryRecorded,
        canEditAfterDelivery,
        displayItems,
    });

    return {
        workspaceOpen,
        openWorkspace,
        requestCloseWorkspace,
        search,
        setSearch,
        displayItems,
        visibleItems,
        total,
        remainingListTotal,
        deliveryRecorded,
        deliveryCounts,
        deliveredTotal,
        undeliveredTotal,
        lockedDeliveryCount,
        scheduleHint,
        isEditing,
        draftItems,
        setDraftItems,
        editTotal,
        startEdit,
        cancelEdit,
        handleSave,
        isDeliveredRowLocked,
        scheduleYmd,
        scheduleLabel,
        showScheduleForm,
        scheduleYmdDraft,
        setScheduleYmdDraft,
        editingSchedule,
        setEditingSchedule,
        earlyDeliveryUnlocked,
        setEarlyDeliveryUnlocked,
        unlockEarlyDelivery,
        savingSchedule,
        handleSaveSchedule,
        todayYmd,
        savingItemId,
        pendingDelivery,
        setPendingDelivery,
        requestItemOutcome,
        confirmPendingDelivery,
        canManageDelivery,
        locked,
        headerActions,
        sectionConfirmDialog,
        formatMaritalFurnitureCurrency,
    };
}
