import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { isExecutionHandlerStubLeaf } from '../hooks/executionHandlerClusterStubs';
import { executionHandlerNotReadyFallback } from '../hooks/executionHandlerClusterStubs';
import {
    markPublicationNoticeDebtorAttended,
    registerPublicationNoticeForDebtor,
    terminatePublicationNoticeForDebtor,
} from '@/app/utils/publicationNoticeRegistration';
import { registerDebtorVoluntaryAttendanceForDebtor } from '@/app/utils/debtorVoluntaryAttendanceRegistration';
import { toastAfterExecutionPersist } from '../helpers/toastAfterExecutionPersist';

export function buildUnifiedSummonsSafeHandlers(input: {
    handleNotifyDebtor: unknown;
    setSummonsHubInitialMainTab?: ((tab: null) => void) | undefined;
    setSummonsContextDebtorKey?: ((key: null) => void) | undefined;
    onCloseUnifiedSummonsModal?: (() => void) | undefined;
    setShowUnifiedSummonsModal?: ((show: boolean) => void) | undefined;
    employeeAssignmentTabEnabled: boolean;
    activeDebtorIsEmployee: boolean;
    isEvictionExecutionModule: boolean;
    executionData: ExecutionFile | null | undefined;
    unifiedSummonsTargetDebtorKey: string | null | undefined;
    primaryDebtorKeyResolved: string | null | undefined;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    showToast: (message: string, type?: string) => void;
    pushTimelineEvent: (event: TimelineEvent) => void;
    handlePublicationNoticeRegister?: unknown;
    handlePublicationNoticeTerminate?: unknown;
    handlePublicationNoticeDebtorAttended?: unknown;
    registerDebtorVoluntaryAttendance?: unknown;
    activeDebtorNoticeScope: {
        notificationDate?: string | null;
        memoAnchorDate?: string | null;
    };
    summoningRound: unknown;
    setTimelineEvents: unknown;
}) {
    const {
        handleNotifyDebtor,
        setSummonsHubInitialMainTab,
        setSummonsContextDebtorKey,
        onCloseUnifiedSummonsModal,
        setShowUnifiedSummonsModal,
        employeeAssignmentTabEnabled,
        activeDebtorIsEmployee,
        isEvictionExecutionModule,
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        pushTimelineEvent,
        handlePublicationNoticeRegister,
        handlePublicationNoticeTerminate,
        handlePublicationNoticeDebtorAttended,
        registerDebtorVoluntaryAttendance,
        activeDebtorNoticeScope,
        summoningRound,
        setTimelineEvents,
    } = input;

const notifyDebtorSafe =
        typeof handleNotifyDebtor === 'function'
            ? handleNotifyDebtor
            : (executionHandlerNotReadyFallback('handleNotifyDebtor') as typeof handleNotifyDebtor);

    const closeUnifiedSummonsModal = () => {
        setSummonsHubInitialMainTab?.(null);
        setSummonsContextDebtorKey?.(null);
        if (typeof onCloseUnifiedSummonsModal === 'function') {
            onCloseUnifiedSummonsModal();
        } else {
            setShowUnifiedSummonsModal?.(false);
        }
    };

    const employeeTaklifHubEnabled =
        employeeAssignmentTabEnabled && activeDebtorIsEmployee && !isEvictionExecutionModule;

    const publicationNoticeDeps = () => ({
        executionData,
        debtorKey: unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        pushTimelineEvent: (event: TimelineEvent) => {
            pushTimelineEvent(event);
        },
    });

    const registerPublicationNoticeSafe = (p: {
        publicationDateYmd: string;
        newspaper1: string;
        newspaper2: string;
    }) => {
        if (
            typeof handlePublicationNoticeRegister === 'function' &&
            !isExecutionHandlerStubLeaf(handlePublicationNoticeRegister)
        ) {
            handlePublicationNoticeRegister(p);
            return;
        }
        registerPublicationNoticeForDebtor(publicationNoticeDeps(), p);
    };

    const terminatePublicationNoticeSafe = () => {
        if (
            typeof handlePublicationNoticeTerminate === 'function' &&
            !isExecutionHandlerStubLeaf(handlePublicationNoticeTerminate)
        ) {
            handlePublicationNoticeTerminate();
            return;
        }
        terminatePublicationNoticeForDebtor(publicationNoticeDeps());
    };

    const attendPublicationNoticeSafe = () => {
        if (
            typeof handlePublicationNoticeDebtorAttended === 'function' &&
            !isExecutionHandlerStubLeaf(handlePublicationNoticeDebtorAttended)
        ) {
            handlePublicationNoticeDebtorAttended();
            return;
        }
        markPublicationNoticeDebtorAttended(publicationNoticeDeps());
    };

    const registerDebtorVoluntaryAttendanceSafe = (): boolean => {
        if (
            typeof registerDebtorVoluntaryAttendance === 'function' &&
            !isExecutionHandlerStubLeaf(registerDebtorVoluntaryAttendance)
        ) {
            registerDebtorVoluntaryAttendance();
            return true;
        }
        return registerDebtorVoluntaryAttendanceForDebtor({
            executionData,
            debtorKey: unifiedSummonsTargetDebtorKey,
            primaryDebtorKeyResolved,
            notificationDateYmd: activeDebtorNoticeScope.notificationDate,
            memoAnchorDateYmd:
                activeDebtorNoticeScope.memoAnchorDate ??
                (executionData as { execution_memo_anchor_date?: string })?.execution_memo_anchor_date,
            voluntaryAttendanceCount: executionData?.voluntaryAttendanceCount,
            summoningRound,
            nextTimelineId,
            setTimelineEvents,
            persistExecutionMerge,
            pushTimelineEvent,
            showToast,
        });
    };

    return {
        notifyDebtorSafe,
        closeUnifiedSummonsModal,
        employeeTaklifHubEnabled,
        registerPublicationNoticeSafe,
        terminatePublicationNoticeSafe,
        attendPublicationNoticeSafe,
        registerDebtorVoluntaryAttendanceSafe,
    };
}

export function buildGuarantorNotificationFeature(input: {
    executionData: ExecutionFile | null | undefined;
    summonsHubInitialMainTab: string | null | undefined;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    pushTimelineEvent: (event: TimelineEvent) => void;
    nextTimelineId: () => string;
    showToast: (message: string, type?: string) => void;
    isGuarantorSummonsEligible: (executionData: ExecutionFile | null | undefined) => boolean;
}) {
    const {
        executionData,
        summonsHubInitialMainTab,
        persistExecutionMerge,
        pushTimelineEvent,
        nextTimelineId,
        showToast,
        isGuarantorSummonsEligible,
    } = input;

    return {
        enabled: isGuarantorSummonsEligible(executionData),
        contextOnly: summonsHubInitialMainTab === 'guarantor',
        state: executionData?.guarantor_notification ?? null,
        onRegister: (p: { noticeDateYmd?: string; reason?: string }) => {
            const d = String(p.noticeDateYmd || '').trim();
            const r = String(p.reason || '').trim();
            if (!d || !r) {
                showToast('أكمل تاريخ التبليغ وسبب التكليف بالحضور.', 'warning');
                return;
            }
            const persisted = persistExecutionMerge({
                guarantor_notification: {
                    noticeDateYmd: d,
                    reason: r,
                    endedAt: null,
                    attendedAt: null,
                },
            });
            if (persisted === false) {
                showToast('تعذّر تسجيل تبليغ الكفيل — أعد المحاولة', 'error');
                return;
            }
            const ts = new Date().toISOString();
            pushTimelineEvent({
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: 'تبليغ / تكليف الكفيل بالحضور',
                description: `تاريخ التبليغ: ${d}\nالسبب: ${r}`,
                type: 'procedure',
                source: 'مركز التبليغ',
            });
            toastAfterExecutionPersist(persisted, showToast, 'تم تسجيل تبليغ / تكليف الكفيل بالحضور.');
        },
        onAttend: () => {
            const now = new Date().toISOString();
            const prev = executionData?.guarantor_notification;
            const persisted = persistExecutionMerge({
                guarantor_notification: {
                    noticeDateYmd: String(prev?.noticeDateYmd || '').trim(),
                    reason: String(prev?.reason || '').trim(),
                    endedAt: now,
                    attendedAt: now,
                },
            });
            if (persisted === false) {
                showToast('تعذّر إنهاء تبليغ الكفيل — أعد المحاولة', 'error');
                return;
            }
            pushTimelineEvent({
                id: nextTimelineId(),
                date: now.slice(0, 10),
                timestamp: now,
                title: 'حضور الكفيل / إنهاء التبليغ',
                description: 'تم إنهاء تبليغ الكفيل بعد تسجيل الحضور.',
                type: 'procedure',
                source: 'مركز التبليغ',
            });
            toastAfterExecutionPersist(persisted, showToast, 'تم إنهاء تبليغ الكفيل.');
        },
        onTerminate: () => {
            const now = new Date().toISOString();
            const prev = executionData?.guarantor_notification;
            const persisted = persistExecutionMerge({
                guarantor_notification: {
                    noticeDateYmd: String(prev?.noticeDateYmd || '').trim(),
                    reason: String(prev?.reason || '').trim(),
                    endedAt: now,
                    attendedAt: null,
                },
            });
            if (persisted === false) {
                showToast('تعذّر إنهاء تبليغ الكفيل — أعد المحاولة', 'error');
                return;
            }
            pushTimelineEvent({
                id: nextTimelineId(),
                date: now.slice(0, 10),
                timestamp: now,
                title: 'إنهاء تبليغ الكفيل',
                description: 'تم إنهاء تبليغ الكفيل.',
                type: 'procedure',
                source: 'مركز التبليغ',
            });
            toastAfterExecutionPersist(persisted, showToast, 'تم إنهاء تبليغ الكفيل.');
        },
    };
}
