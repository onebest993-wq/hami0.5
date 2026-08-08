import React from 'react';
import { motion } from 'motion/react';
import { X, Bell, CheckCircle, Newspaper } from '@/app/components/ui/lucideIcons';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/execution/executionModalStack';
import { EmployeeAssignmentCoerciveFollowupBlock } from '@/app/components/lawyer/execution/EmployeeAssignmentCoerciveFollowupBlock';
import ConfirmAttendanceModal from './components/ConfirmAttendanceModal';
import { SummonsHubTablighTab } from './components/SummonsHubTablighTab';
import { SummonsHubActiveStatusPanel } from './components/SummonsHubActiveStatusPanel';
import { SummonsInlineDateField } from '@/app/components/lawyer/execution/SummonsInlineDateField';
import {
    HUB_BTN_EMERALD,
    HUB_BTN_VIOLET,
    HUB_BTN_AMBER,
    HUB_BTN_ROSE,
    HUB_BTN_GHOST_ROSE,
    HUB_BTN_GHOST_EMERALD,
    HUB_GLASS_INFO_CYAN,
    HUB_GLASS_INPUT,
} from './summonsHubStyles';
import type { UnifiedSummonsHubModel } from './useUnifiedSummonsHubController';
import {
    computeTaklifDeadlineYmd,
    daysRemainingUntilDeadline,
    isAssignmentDeadlinePassed,
} from '@/app/utils/employeeSummonsAssignment';
import { publicationNoticeDeadlineYmd } from '@/app/utils/publicationNoticeDebtor';
import { getSummonsKindLockReason } from './summonsHubActiveLocks';

export function UnifiedSummonsHubView(model: UnifiedSummonsHubModel) {
    const {
        dateError,
        setDateError,
        setNoticeKindGoal:_setNoticeKindGoal,
        initialNoticeLawyerFeesIncluded:_initialNoticeLawyerFeesIncluded,
        setInitialNoticeLawyerFeesIncluded:_setInitialNoticeLawyerFeesIncluded,
        memoDateOptimistic:_memoDateOptimistic,
        setMemoDateOptimistic,
        memoError:_memoError,
        setMemoError:_setMemoError,
        memoArchivedOptimistic:_memoArchivedOptimistic,
        setMemoArchivedOptimistic:_setMemoArchivedOptimistic,
        memoDateEditing:_memoDateEditing,
        setMemoDateEditing:_setMemoDateEditing,
        executionMemoRegisterMode:_executionMemoRegisterMode,
        setExecutionMemoRegisterMode:_setExecutionMemoRegisterMode,
        confirmAttendanceWithoutNoticeOpen,
        setConfirmAttendanceWithoutNoticeOpen,
        hubMainTab,
        setHubMainTab,
        kindLockError,
        setKindLockError,
        empAssignOptimistic:_empAssignOptimistic,
        setEmpAssignOptimistic,
        pubNoticeOptimistic:_pubNoticeOptimistic,
        setPubNoticeOptimistic,
        taklifPurpose,
        setTaklifPurpose,
        taklifDate,
        setTaklifDate,
        taklifDurationDays,
        setTaklifDurationDays,
        taklifFormError,
        setTaklifFormError,
        tablighTaskOptimistic:_tablighTaskOptimistic,
        setTablighTaskOptimistic:_setTablighTaskOptimistic,
        nashrDate,
        setNashrDate,
        nashrPaper1,
        setNashrPaper1,
        nashrPaper2,
        setNashrPaper2,
        nashrFormError,
        setNashrFormError,
        guarantorNoticeDate,
        setGuarantorNoticeDate,
        guarantorNoticeReason,
        setGuarantorNoticeReason,
        guarantorFormError,
        setGuarantorFormError,
        empStateFingerprint:_empStateFingerprint,
        pubStateFingerprint:_pubStateFingerprint,
        tablighStateFingerprint:_tablighStateFingerprint,
        empAssignResolved:_empAssignResolved,
        publicationStateResolved,
        resolvedTablighTaskEarly:_resolvedTablighTaskEarly,
        activeSnapshot,
        memoArchivedResolved,
        showTaklifOptionInHub:_showTaklifOptionInHub,
        showPublicationTab:_showPublicationTab,
        isGuarantorSummonsContext,
        activePathCount:_activePathCount,
        hubTabOptions,
        trySelectHubKind,
        hasActivePublicationResolved:_hasActivePublicationResolved,
        empAssign,
        empEffectiveDeadlineYmd,
        empPhase,
        memoNoticeDateYmd:_memoNoticeDateYmd,
        memoWindow:_memoWindow,
        summonsTodayYmdMax,
        showLawyerFeesIncludeCheckbox:_showLawyerFeesIncludeCheckbox,
        resolvedTablighTask:_resolvedTablighTask,
        validateDate,
        submitGuarantorNotice,
        validateMemoDate:_validateMemoDate,
        submitExecutionSummonsDate:_submitExecutionSummonsDate,
        markExecutionSummonsArchived,
        handleTaklifConfirm,
        isOpen:_isOpen,
        onClose,
        onDebtorNotification,
        notificationCount,
        onRegisterDebtorVoluntaryAttendance:_onRegisterDebtorVoluntaryAttendance,
        evictionDebtorExecutionStrip:_evictionDebtorExecutionStrip,
        onTerminateTablighTask:_onTerminateTablighTask,
        guarantorNotificationFeature,
        employeeAssignmentFeature,
        publicationNoticeFeature,
        suppressPublicationNotice:_suppressPublicationNotice,
    } = model;

    return (
        <div
            className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG}`}
            style={{ zIndex: EXEC_MODAL_Z.unifiedSummonsAndLegacyNotification }}
            onClick={onClose}
            role="presentation"
        >
            <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 14 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                className="relative w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col rounded-[28px] border border-indigo-400/25 bg-[#0A0F1C]/85 ring-1 ring-white/5 shadow-[0_30px_80px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* توهج علوي خافت — هوية ذهبية/نيلية */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-indigo-500/[0.14] via-transparent to-transparent"
                />
                {/* HEADER */}
                <div className="relative flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-indigo-950/50 via-[#0A0F1C]/30 to-purple-950/40 p-4 backdrop-blur-xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-slate-200 transition-all hover:bg-white/[0.1] hover:text-white"
                        aria-label="إغلاق"
                    >
                        <X size={18} />
                    </button>
                    <h2 className="flex items-center gap-2.5 text-lg font-black text-white">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E6C673]/30 bg-gradient-to-br from-[#E6C673]/20 to-transparent shadow-[0_0_18px_rgba(230,198,115,0.15)]">
                            <Bell size={17} className="text-[#E6C673]" />
                        </span>
                        {isGuarantorSummonsContext ? 'تبليغ / تكليف الكفيل بالحضور' : 'التبليغ'}
                    </h2>
                </div>
    
                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto overscroll-contain p-5">
                    {hubTabOptions.length > 1 && !(!memoArchivedResolved && notificationCount <= 1) && (
                        <div className="mb-4" dir="rtl">
                            <p
                                id="unified-summons-kind-label"
                                className="mb-2 text-right text-[11px] font-bold tracking-wide text-slate-400"
                            >
                                نوع التبليغ
                            </p>
                            <div
                                role="tablist"
                                aria-labelledby="unified-summons-kind-label"
                                className="flex flex-row gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl"
                            >
                                {hubTabOptions.map((o) => {
                                    const selected = hubMainTab === o.value;
                                    return (
                                        <button
                                            key={o.value}
                                            type="button"
                                            role="tab"
                                            aria-selected={selected}
                                            onClick={() => {
                                                trySelectHubKind(o.value);
                                                setTaklifFormError('');
                                                setNashrFormError('');
                                            }}
                                            className={`min-w-fit flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-[11px] font-black transition-all duration-200 ${
                                                selected
                                                    ? 'border border-indigo-300/30 bg-gradient-to-br from-indigo-500/45 to-violet-600/35 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_6px_18px_rgba(99,102,241,0.25)]'
                                                    : 'border border-transparent text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
                                            }`}
                                        >
                                            {o.label}
                                        </button>
                                    );
                                })}
                            </div>
                            {kindLockError ? (
                                <p className="mt-2 rounded-xl border border-amber-400/25 bg-amber-500/[0.08] px-3 py-2 text-right text-[11px] font-semibold text-amber-100 backdrop-blur-md">
                                    {kindLockError}
                                </p>
                            ) : null}
                        </div>
                    )}
    
                    {hubMainTab === 'status' && !isGuarantorSummonsContext && (
                        <motion.div
                            key="status"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-4"
                        >
                            <SummonsHubActiveStatusPanel
                                snapshot={activeSnapshot}
                                onOpenKind={(kind) => trySelectHubKind(kind)}
                            />
                        </motion.div>
                    )}
    
                    {hubMainTab === 'tabligh' && SummonsHubTablighTab(model)}
    
                    {hubMainTab === 'nashr' &&
                        (publicationNoticeFeature ? (
                        <motion.div
                            key="nashr"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-4"
                        >
                            {publicationStateResolved ? (
                                <>
                                    <div className={`${HUB_GLASS_INFO_CYAN} space-y-1.5`}>
                                        <p className="text-cyan-100 text-xs font-bold">
                                            تبليغ بالنشر سارٍ — تاريخ النشر:{' '}
                                            <span className="font-mono tabular-nums">
                                                {publicationStateResolved.publicationDateYmd}
                                            </span>
                                        </p>
                                        <p className="text-slate-300 text-[11px]">
                                            الجريدة ١: {publicationStateResolved.newspaper1}
                                        </p>
                                        <p className="text-slate-300 text-[11px]">
                                            الجريدة ٢: {publicationStateResolved.newspaper2}
                                        </p>
                                        <p className="text-slate-400 text-[10px]">
                                            آخر يوم للمدة:{' '}
                                            <span className="font-mono text-slate-200">
                                                {publicationNoticeDeadlineYmd(
                                                    publicationStateResolved.publicationDateYmd
                                                )}
                                            </span>
                                        </p>
                                        {(() => {
                                            const dl = publicationNoticeDeadlineYmd(
                                                publicationStateResolved.publicationDateYmd
                                            );
                                            const passed = isAssignmentDeadlinePassed(dl);
                                            const rem = daysRemainingUntilDeadline(dl);
                                            return (
                                                <p className="text-emerald-200/90 text-[11px] font-semibold">
                                                    {passed
                                                        ? 'انتهت المدة التقويمية للتبليغ بالنشر.'
                                                        : `متبقٍ تقويمياً: ${rem} يوماً`}
                                                </p>
                                            );
                                        })()}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            publicationNoticeFeature.onDebtorAttended();
                                            setPubNoticeOptimistic(null);
                                            setNashrFormError('');
                                            setHubMainTab('status');
                                        }}
                                        className={HUB_BTN_EMERALD}
                                    >
                                        <CheckCircle size={18} />
                                        حضور المدين
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            publicationNoticeFeature.onTerminate();
                                            setPubNoticeOptimistic(null);
                                            setNashrFormError('');
                                            setHubMainTab('status');
                                        }}
                                        className={HUB_BTN_GHOST_ROSE}
                                    >
                                        إنهاء التبليغ بالنشر
                                    </button>
                                </>
                            ) : (
                                <>
                            <div>
                                <SummonsInlineDateField
                                    id="execution-nashr-publication-date"
                                    label="تاريخ النشر في الجريدة"
                                    value={nashrDate}
                                    max={summonsTodayYmdMax}
                                    accent="violet"
                                    onChange={setNashrDate}
                                />
                            </div>
                                    <div>
                                        <label
                                            htmlFor="execution-nashr-paper-1"
                                            className="block text-gray-300 text-sm font-semibold mb-2 text-right"
                                        >
                                            اسم الجريدة الأولى
                                        </label>
                                        <input
                                            id="execution-nashr-paper-1"
                                            type="text"
                                            value={nashrPaper1}
                                            onChange={(e) => setNashrPaper1(e.target.value)}
                                            className={HUB_GLASS_INPUT}
                                            placeholder=""
                                            dir="rtl"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="execution-nashr-paper-2"
                                            className="block text-gray-300 text-sm font-semibold mb-2 text-right"
                                        >
                                            اسم الجريدة الثانية
                                        </label>
                                        <input
                                            id="execution-nashr-paper-2"
                                            type="text"
                                            value={nashrPaper2}
                                            onChange={(e) => setNashrPaper2(e.target.value)}
                                            className={HUB_GLASS_INPUT}
                                            placeholder=""
                                            dir="rtl"
                                        />
                                    </div>
                                    {(nashrFormError || (hubMainTab === 'nashr' && dateError)) && (
                                        <p className="text-red-400 text-xs text-right">
                                            {nashrFormError || dateError}
                                        </p>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setNashrFormError('');
                                            const d = String(nashrDate ?? '').trim();
                                            if (!d) {
                                                setNashrFormError('أدخل تاريخ النشر في الجريدة');
                                                return;
                                            }
                                            const vr = validateDate(d);
                                            if (!vr.ok) {
                                                setDateError(vr.error || 'تأكد من تاريخ النشر');
                                                setNashrFormError(vr.error || 'تأكد من تاريخ النشر');
                                                return;
                                            }
                                            setDateError('');
                                            const p1 = nashrPaper1.trim();
                                            const p2 = nashrPaper2.trim();
                                            if (!p1 || !p2) {
                                                setNashrFormError('أدخل اسم الجريدتين');
                                                return;
                                            }
                                            const nashrLock = getSummonsKindLockReason('nashr', {
                                                ...activeSnapshot,
                                                nashr: null,
                                            });
                                            if (nashrLock) {
                                                setNashrFormError(nashrLock);
                                                setKindLockError(nashrLock);
                                                setHubMainTab('status');
                                                return;
                                            }
                                            if (!memoArchivedResolved && notificationCount === 0) {
                                                // تسجيل مرساة مذكرة الإخبار عند اعتماد مسار النشر لأول مرة.
                                                // عند وجود مذكرة سارية (count === 1) لا يُعاد التسجيل —
                                                // كان الاستدعاء يرتد بتحذير مضلل ويكتب تاريخاً تفاؤلياً خاطئاً.
                                                onDebtorNotification(
                                                    d,
                                                    'مذكرة الإخبار بالتنفيذ بالنشر',
                                                    false,
                                                    undefined,
                                                    undefined,
                                                    {}
                                                );
                                                setMemoDateOptimistic(d);
                                            }
                                            publicationNoticeFeature.onRegister({
                                                publicationDateYmd: d,
                                                newspaper1: p1,
                                                newspaper2: p2,
                                            });
                                            setPubNoticeOptimistic({
                                                publicationDateYmd: d,
                                                newspaper1: p1,
                                                newspaper2: p2,
                                                recordedAt: new Date().toISOString(),
                                            });
                                            setNashrDate('');
                                            setNashrPaper1('');
                                            setNashrPaper2('');
                                            setDateError('');
                                        }}
                                        className={HUB_BTN_VIOLET}
                                    >
                                        <Newspaper size={18} />
                                        تسجيل التبليغ بالنشر
                                    </button>
                                </>
                            )}
                        </motion.div>
                        ) : (
                        <motion.div
                            key="nashr"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-4"
                        >
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-right" dir="rtl">
                                <p className="text-white text-sm font-bold">التبليغ بالنشر</p>
                                <p className="mt-1 text-[11px] text-slate-400">غير متاح لهذه الإضبارة حالياً.</p>
                            </div>
                        </motion.div>
                        ))}
    
                    {hubMainTab === 'taklif' &&
                        (employeeAssignmentFeature && employeeAssignmentFeature.enabled ? (
                        <motion.div
                            key="taklif"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-4"
                        >
                            {empPhase === 'none' && (
                                <>
                            <div>
                                <label
                                    htmlFor="execution-taklif-purpose"
                                    className="block text-gray-300 text-sm font-semibold mb-2 text-right"
                                >
                                            الغاية من التكليف
                                </label>
                                <textarea
                                            id="execution-taklif-purpose"
                                            value={taklifPurpose}
                                            onChange={(e) => setTaklifPurpose(e.target.value)}
                                            className={`${HUB_GLASS_INPUT} resize-none`}
                                    rows={3}
                                />
                            </div>
                                    <SummonsInlineDateField
                                        id="execution-taklif-notice-date"
                                        label="تاريخ التبليغ بالتكليف"
                                        value={taklifDate}
                                        max={summonsTodayYmdMax}
                                        accent="amber"
                                        onChange={setTaklifDate}
                                    />
                                    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                                        <p className="text-slate-300 text-xs font-semibold mb-2 text-right">
                                            مدة التكليف (بالأيام)
                                        </p>
                                        <div className="flex flex-row-reverse items-center justify-center gap-4">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setTaklifDurationDays((d) => Math.min(30, Math.max(1, d + 1)))
                                                }
                                                className="h-10 w-10 rounded-xl border border-white/10 bg-white/[0.06] text-lg font-bold text-white backdrop-blur-md transition-colors hover:bg-white/[0.12]"
                                            >
                                                +
                                            </button>
                                            <span className="min-w-[2.5rem] text-center text-xl font-black tabular-nums text-white">
                                                {taklifDurationDays}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setTaklifDurationDays((d) => Math.max(1, d - 1))
                                                }
                                                className="h-10 w-10 rounded-xl border border-white/10 bg-white/[0.06] text-lg font-bold text-white backdrop-blur-md transition-colors hover:bg-white/[0.12]"
                                            >
                                                −
                                            </button>
                                        </div>
                                    </div>
                                    {(() => {
                                        const ymd = String(taklifDate || '').trim();
                                        if (!ymd) return null;
                                        if (!validateDate(ymd).ok) return null;
                                        const expiry = computeTaklifDeadlineYmd(ymd, taklifDurationDays);
                                        return (
                                            <p className="text-sky-200/90 text-[11px] font-semibold text-right">
                                                المهلة تنتهي بتاريخ: <span className="font-mono">{expiry}</span>
                                            </p>
                                        );
                                    })()}
                                    {(taklifFormError || dateError) && hubMainTab === 'taklif' ? (
                                        <p className="text-red-400 text-xs text-right">
                                            {taklifFormError || dateError}
                                        </p>
                                    ) : null}
                                    <button
                                        type="button"
                                        onClick={handleTaklifConfirm}
                                        className={HUB_BTN_AMBER}
                                    >
                                        تأكيد التكليف بالحضور
                                    </button>
                                </>
                            )}
    
                            {empPhase === 'active' && (
                                <>
                                    <div className={`${HUB_GLASS_INFO_CYAN} space-y-1`}>
                                        <p className="text-cyan-100 text-xs font-bold">
                                            تكليف سارٍ
                                            {empEffectiveDeadlineYmd ? (
                                                <>
                                                    {' '}
                                                    — حتى{' '}
                                                    <span className="font-mono tabular-nums">
                                                        {empEffectiveDeadlineYmd}
                                                    </span>
                                                </>
                                            ) : null}
                                        </p>
                                        {empEffectiveDeadlineYmd ? (
                                            !isAssignmentDeadlinePassed(empEffectiveDeadlineYmd) ? (
                                                <p className="text-cyan-200/80 text-[11px]">
                                                    متبقٍ تقويمياً:{' '}
                                                    <span className="font-mono font-bold">
                                                        {daysRemainingUntilDeadline(empEffectiveDeadlineYmd)}
                                                    </span>{' '}
                                                    يوماً
                                                </p>
                                            ) : null
                                        ) : null}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            employeeAssignmentFeature.onAttend();
                                            setEmpAssignOptimistic(null);
                                            setHubMainTab('status');
                                        }}
                                        className={HUB_BTN_EMERALD}
                                    >
                                        <CheckCircle size={18} />
                                        حضور المدين
                                    </button>
                                    {empEffectiveDeadlineYmd &&
                                    isAssignmentDeadlinePassed(empEffectiveDeadlineYmd) ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                employeeAssignmentFeature.onDeclareAbsent();
                                                if (empAssign) {
                                                    setEmpAssignOptimistic({
                                                        ...empAssign,
                                                        phase: 'absent_declared',
                                                        periodEndedAt: new Date().toISOString(),
                                                    });
                                                }
                                            }}
                                            className={HUB_BTN_ROSE}
                                        >
                                            انتهاء مدة التكليف
                                        </button>
                                    ) : null}
                                </>
                            )}
    
                            {empAssign &&
                                (empPhase === 'absent_declared' ||
                                    empPhase === 'investigation_pending' ||
                                    empPhase === 'warrant_ui') && (
                                    <>
                                        <EmployeeAssignmentCoerciveFollowupBlock
                                            assignment={empAssign}
                                            onRequestInvestigation={() =>
                                                employeeAssignmentFeature.onRequestInvestigation()
                                            }
                                            onRegisterArrestOrder={() =>
                                                employeeAssignmentFeature.onRegisterArrestOrder()
                                            }
                                            onRequestForcedBring={() =>
                                                employeeAssignmentFeature.onRequestForcedBring()
                                            }
                                            forcedBringPending={
                                                employeeAssignmentFeature.forcedBringPending ?? false
                                            }
                                            forcedBringApprovedAwaitingOutcome={
                                                employeeAssignmentFeature.forcedBringApprovedAwaitingOutcome ??
                                                false
                                            }
                                            forcedBringRejected={
                                                employeeAssignmentFeature.forcedBringRejected ?? false
                                            }
                                            onWarrantDebtorBrought={() => {
                                                employeeAssignmentFeature.onWarrantDebtorBrought();
                                                setEmpAssignOptimistic(null);
                                                setHubMainTab('status');
                                            }}
                                            onWarrantTerminate={() => {
                                                employeeAssignmentFeature.onWarrantTerminate();
                                                setEmpAssignOptimistic(null);
                                                setHubMainTab('status');
                                            }}
                                            onTerminateAssignment={() => {
                                                employeeAssignmentFeature.onAttend();
                                                setEmpAssignOptimistic(null);
                                                setHubMainTab('status');
                                            }}
                                        />
                                        {empPhase === 'investigation_pending' ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    employeeAssignmentFeature.onAttend();
                                                    setEmpAssignOptimistic(null);
                                                    setHubMainTab('status');
                                                }}
                                                className={HUB_BTN_GHOST_EMERALD}
                                            >
                                                حضور المدين
                                            </button>
                                        ) : null}
                                    </>
                                )}
                        </motion.div>
                        ) : (
                        <motion.div
                            key="taklif"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-4"
                        >
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-right" dir="rtl">
                                <p className="text-white text-sm font-bold">التكليف بالحضور</p>
                                <p className="mt-1 text-[11px] text-slate-400">غير متاح لهذه الإضبارة حالياً.</p>
                            </div>
                        </motion.div>
                        ))}
    
                    {hubMainTab === 'guarantor' && guarantorNotificationFeature?.enabled && (
                        <motion.div
                            key="guarantor"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-4"
                        >
                            <div
                                className="rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-500/[0.10] via-[#0A0F1C]/50 to-transparent p-4 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_14px_34px_rgba(0,0,0,0.45)] backdrop-blur-xl"
                                dir="rtl"
                            >
                                <p className="text-amber-200 font-bold text-sm">تبليغ / تكليف الكفيل بالحضور</p>
                                <SummonsInlineDateField
                                    id="execution-guarantor-notice-date"
                                    label="تاريخ التبليغ"
                                    value={guarantorNoticeDate}
                                    max={summonsTodayYmdMax}
                                    accent="amber"
                                    onChange={(next) => {
                                        setGuarantorNoticeDate(next);
                                        setGuarantorFormError('');
                                    }}
                                />
                                <div>
                                    <label
                                        htmlFor="execution-guarantor-notice-reason"
                                        className="mb-2 block text-right text-xs font-semibold text-gray-300"
                                    >
                                        سبب التبليغ / التكليف
                                    </label>
                                    <input
                                        id="execution-guarantor-notice-reason"
                                        type="text"
                                        value={guarantorNoticeReason}
                                        onChange={(e) => {
                                            setGuarantorNoticeReason(e.target.value);
                                            setGuarantorFormError('');
                                        }}
                                        placeholder="أدخل سبب التبليغ أو التكليف بالحضور"
                                        className="w-full rounded-xl border border-white/10 bg-[#0A0F1C]/60 px-4 py-2.5 text-right text-sm text-white backdrop-blur-md transition-colors focus:outline-none focus:border-amber-400/45 focus:ring-1 focus:ring-amber-400/25 placeholder:text-slate-500"
                                    />
                                </div>
                                {guarantorFormError ? (
                                    <p className="text-right text-[11px] font-bold text-rose-400">{guarantorFormError}</p>
                                ) : null}
    
                                {guarantorNotificationFeature.state &&
                                !guarantorNotificationFeature.state.endedAt ? (
                                    <div className="grid grid-cols-1 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                guarantorNotificationFeature.onAttend();
                                                onClose();
                                            }}
                                            className={HUB_BTN_GHOST_EMERALD}
                                        >
                                            حضور الكفيل / إنهاء التبليغ
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                guarantorNotificationFeature.onTerminate();
                                                onClose();
                                            }}
                                            className={HUB_BTN_GHOST_ROSE}
                                        >
                                            إنهاء التبليغ
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={submitGuarantorNotice}
                                        className={HUB_BTN_AMBER}
                                    >
                                        تبليغ / تكليف الكفيل بالحضور
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </div>
                <ConfirmAttendanceModal
                    isOpen={confirmAttendanceWithoutNoticeOpen}
                    onConfirm={() => {
                        setConfirmAttendanceWithoutNoticeOpen(false);
                        markExecutionSummonsArchived('attended');
                    }}
                    onCancel={() => setConfirmAttendanceWithoutNoticeOpen(false)}
                />
            </motion.div>
        </div>
    );
}

