import React, { Suspense } from 'react';
import {
    Scale,
    Clock,
    ShieldCheck,
    AlertTriangle,
    ArrowRightLeft,
    RotateCcw,
    PauseCircle,
} from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    LazySmartHeader,
    LazyFinancialCard,
    LazyQuickActions,
    LazyToDoList,
    LazyFastTrackPetitionsList,
    LazyAttachmentShieldCard,
    LazyIncidentalCasesManager,
    LazyTimelineFeed,
} from '../lazySmartFileModalWidgets';

import type { CaseStage, IncidentalStatus, Task, TimelineEvent } from '../../LawyerShared';
import type { SmartFileParentData } from '../smartFile/parentDataInit';

export type SmartFileMainPanelProps = {
    file: Record<string, unknown>;
    status: string;
    isViewingArchived: boolean;
    isPaused: boolean;
    pauseReason: string;
    isInterrupted: boolean;
    interruptionData: Record<string, unknown> | null;
    linkedCaseNo: string;
    parentData: SmartFileParentData;
    displayStage: CaseStage;
    displayTimeline: TimelineEvent[];
    currentStage: CaseStage;
    stages: CaseStage[];
    activeStageIndex: number;
    viewingStageIndex: number;
    isPleadingsClosed: boolean | undefined;
    lastJudgmentType: string | undefined;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    handleResumeAbandonment: () => void;
    handleResume: () => void;
    handleToggleClient: () => void;
    handleStageSelect: (stageId: string) => void;
    handleInterruptionToggle: () => void;
    handleAbandonment: () => void;
    handleToggleNotification: () => void;
    handleCassationDecision: (decision: 'ratified' | 'quashed') => void;
    handleClosePleadings: () => void;
    handleReopenPleadings: () => void;
    handleDefaultObjection: () => void;
    handleWaiveObjection: () => void;
    handleOtherAppeals: () => void;
    handleExportPDF: () => void;
    setShowMaterialErrorModal: (v: string | null) => void;
    setShowObjectionJudgmentModal: (v: boolean) => void;
    setShowAppealModal: (v: boolean) => void;
    setShowProvisionalOrderModal: (v: boolean) => void;
    setShowExtraordinaryAppealModal: (v: boolean | string) => void;
    setShowJudgeRecusalModal: (v: boolean) => void;
    setShowTransferJurisdictionModal: (v: boolean) => void;
    setShowCaseConsolidationModal: (v: boolean) => void;
    setShowAttorneyResignationModal: (v: boolean) => void;
    setShowExecutionTransferModal: (v: boolean) => void;
    handleResolveIncidentalCase: (id: string, status: IncidentalStatus) => void;
    setShowIncidentalModal: (v: boolean) => void;
    setShowDocModal: (v: boolean) => void;
    setShowApptModal: (v: boolean) => void;
    setIsActionsMenuOpen: (v: boolean) => void;
    handleQuickAction: (action: string) => void;
    setShowPauseModal: (v: boolean) => void;
    setShowResumeInterruptionModal: (v: boolean) => void;
    setShowNotificationModal: (v: boolean) => void;
    setShowPaymentModal: (v: boolean) => void;
    setParentData: Dispatch<SetStateAction<SmartFileParentData>>;
    setShowTaskModal: (v: boolean) => void;
    handleToggleTask: (taskId: string) => void;
    setEditingTask: (t: Task | null) => void;
    setEditingFastTrack: (v: Record<string, unknown> | null) => void;
    setShowFastTrackModal: (v: boolean) => void;
    setEditingAttachment: (v: Record<string, unknown> | null) => void;
    setShowAttachmentModal: (v: boolean) => void;
    handleDeleteEvent: (eventId: string) => void;
    handleEditEvent: (eventId: string) => void;
    setShowCrossAppealModal: (v: boolean) => void;
    setShowJudgmentModal: (v: boolean) => void;
    handleCancelCrossAppeal: () => void;
    handleAddCrossAppeal: () => void;
    stepperStages: unknown[];
    currentStageId: string;
};

/** Scrollable lawsuit file body (banners, widgets, timeline). Props mirror SmartFileModalContent scope. */
export function SmartFileMainPanel(p: SmartFileMainPanelProps) {
    const {
        file,
        status,
        isViewingArchived,
        isPaused,
        pauseReason,
        isInterrupted,
        interruptionData,
        linkedCaseNo,
        parentData,
        displayStage,
        displayTimeline,
        currentStage,
        stages,
        activeStageIndex,
        viewingStageIndex,
        isPleadingsClosed,
        lastJudgmentType,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        handleResumeAbandonment,
        handleResume,
        handleToggleClient,
        handleStageSelect,
        handleInterruptionToggle,
        handleAbandonment,
        handleToggleNotification,
        handleCassationDecision,
        handleClosePleadings,
        handleReopenPleadings,
        handleDefaultObjection,
        handleWaiveObjection,
        handleOtherAppeals,
        handleExportPDF,
        setShowMaterialErrorModal,
        setShowObjectionJudgmentModal,
        setShowAppealModal,
        setShowProvisionalOrderModal,
        setShowExtraordinaryAppealModal,
        setShowJudgeRecusalModal,
        setShowTransferJurisdictionModal,
        setShowCaseConsolidationModal,
        setShowAttorneyResignationModal,
        setShowExecutionTransferModal,
        handleResolveIncidentalCase,
        setShowIncidentalModal,
        setShowDocModal,
        setShowApptModal,
        setIsActionsMenuOpen,
        handleQuickAction,
        setShowPauseModal,
        setShowResumeInterruptionModal,
        setShowNotificationModal,
        setShowPaymentModal,
        setParentData,
        setShowTaskModal,
        handleToggleTask,
        setEditingTask,
        setEditingFastTrack,
        setShowFastTrackModal,
        setEditingAttachment,
        setShowAttachmentModal,
        handleDeleteEvent,
        handleEditEvent,
        setShowCrossAppealModal,
        setShowJudgmentModal,
        handleCancelCrossAppeal,
        handleAddCrossAppeal,
        stepperStages,
        currentStageId,
    } = p;

    return (
                        <div 
                            className="flex-1 overflow-y-auto scrollbar-hide p-3 pb-2 sm:p-6 print:overflow-visible print:max-h-max"
                            onTouchStart={onTouchStart}
                            onTouchMove={onTouchMove}
                            onTouchEnd={onTouchEnd}
                        >

                            {/* PRINT HEADER */}
                            <div className="hidden print:block text-center mb-8 border-b-2 border-black pb-4">
                                <h1 className="text-2xl font-bold">تقرير حالة دعوى قضائية</h1>
                                <p className="text-sm mt-2">تاريخ الإصدار: {new Date().toLocaleDateString('ar-IQ')}</p>
                            </div>
                            
                            {/* --- WARNING RADAR: ABANDONMENT & INTERRUPTION --- */}
                            
                            {/* 1. VOIDED STATE (إبطال العريضة) - HIGHEST PRIORITY */}
                            {displayStage?.isVoided && (
                                <div className="w-full bg-slate-900 border-2 border-slate-600 text-slate-400 p-6 rounded-lg text-center font-bold text-lg mb-4" dir="rtl">
                                    ❌ تم إبطال عريضة الدعوى قانوناً 
                                    <div className="text-xs font-normal mt-2 text-slate-500">(بسبب تركها للمراجعة للمرة الثانية أو لمرور المدة القانونية)</div>
                                </div>
                            )}

                            {/* 2. ABANDONMENT WARNING (First Time) */}
                            {displayStage?.abandonmentDate && !displayStage?.isVoided && (
                                <div className="w-full bg-amber-900/20 border border-amber-500/50 text-amber-300 p-3 rounded-lg flex justify-between items-center mb-4" dir="rtl">
                                    <span className="font-bold text-sm flex items-center gap-2">
                                        <AlertTriangle size={18} className="text-amber-300" />
                                        ⚠️ تنبيه إجرائي: الدعوى متروكة للمراجعة. تبطل عريضتها بعد 10 أيام.
                                    </span>
                                    <button type="button" 
                                        onClick={handleResumeAbandonment}
                                        className="bg-amber-600/20 border border-amber-500/50 text-amber-400 px-3 py-1 rounded font-extrabold text-xs hover:bg-amber-600/40 transition-colors"
                                    >
                                        🔄 تجديد الدعوى
                                    </button>
                                </div>
                            )}

                            {displayStage?.interruptionDate && !displayStage?.abandonmentDate && (
                                <div className="w-full bg-rose-900 text-rose-100 p-3 rounded-lg flex justify-between items-center mb-4 border border-rose-500" dir="rtl">
                                    <span className="font-bold text-sm flex items-center gap-2">
                                        <PauseCircle size={18} />
                                        🛑 انقطاع السير في الدعوى. تبطل عريضتها بعد 6 أشهر!
                                    </span>
                                    <button type="button" 
                                        onClick={() => setShowResumeInterruptionModal(true)}
                                        className="bg-rose-100 text-rose-900 px-3 py-1 rounded font-extrabold text-xs hover:bg-white transition-colors shadow-sm"
                                    >
                                        ▶️ استئناف السير
                                    </button>
                                </div>
                            )}

                            {/* 🔥 NEW: 3. LITIGATION INCIDENTS WARNINGS */}
                            {status === 'متروكة للمراجعة' && (
                                <div className="w-full bg-rose-900/20 border-2 border-rose-500/50 text-rose-300 p-4 rounded-lg flex justify-between items-center mb-4" dir="rtl">
                                    <span className="font-bold text-sm flex items-center gap-2">
                                        <AlertTriangle size={20} className="text-rose-400" />
                                        🚨 تحذير: الدعوى متروكة للمراجعة! يجب تجديدها خلال 10 أيام لمنع إبطالها.
                                    </span>
                                </div>
                            )}

                            {status === 'موقوفة اتفاقياً' && (
                                <div className="w-full bg-amber-900/20 border-2 border-amber-500/50 text-amber-300 p-4 rounded-lg flex justify-between items-center mb-4" dir="rtl">
                                    <span className="font-bold text-sm flex items-center gap-2">
                                        <PauseCircle size={20} className="text-amber-400" />
                                        ⏸️ الدعوى موقوفة اتفاقياً. يجب استئناف السير قبل مرور 15 يوماً من تاريخ انتهاء الوقف.
                                    </span>
                                    {!isViewingArchived && (
                                        <button type="button" 
                                            onClick={handleResume}
                                            className="bg-amber-600/20 border border-amber-500/50 text-amber-400 px-3 py-1 rounded font-extrabold text-xs hover:bg-amber-600/40 transition-colors"
                                        >
                                            ▶️ استئناف السير
                                        </button>
                                    )}
                                </div>
                            )}

                            {status === 'قيد نظر طلب رد القاضي' && (
                                <div className="w-full bg-purple-900/20 border-2 border-purple-500/50 text-purple-300 p-4 rounded-lg flex justify-center items-center mb-4" dir="rtl">
                                    <span className="font-bold text-sm flex items-center gap-2">
                                        <Scale size={20} className="text-purple-400" />
                                        ⏸️ الدعوى مجمدة: قيد نظر طلب رد القاضي أو نقل الدعوى.
                                    </span>
                                </div>
                            )}

                            <Suspense fallback={null}>
                            <LazySmartHeader 
                                formData={displayStage} 
                                caseType={String(file?.type ?? displayStage?.type ?? 'غير محدد')}
                                representedParty={parentData.representedParty}
                                onToggleClient={!isViewingArchived ? handleToggleClient : undefined}
                                incidentalCases={displayStage?.incidentalCases || []}
                                stages={stepperStages}
                                currentStageId={currentStageId}
                                onStageClick={handleStageSelect}
                                stageHistory={stages.filter(s => s.status === 'completed' || s.status === 'locked')}
                                isPaused={isPaused}
                                pauseReason={pauseReason}
                                onResume={!isViewingArchived ? handleResume : undefined}
                                onPause={!isViewingArchived ? () => setShowPauseModal(true) : undefined}
                                status={status}
                                isInterrupted={isInterrupted}
                                interruptionData={interruptionData}
                                linkedCaseNo={displayStage?.consolidatedWith || linkedCaseNo}
                                onInterrupt={!isViewingArchived ? handleInterruptionToggle : undefined}
                                onAbandon={!isViewingArchived ? handleAbandonment : undefined}
                                onNotification={!isViewingArchived ? () => setShowNotificationModal(true) : undefined}
                                isReadOnly={isViewingArchived}
                                hasCrossAppeal={displayStage?.hasCrossAppeal}
                                onCancelCrossAppeal={!isViewingArchived ? handleCancelCrossAppeal : undefined}
                                onAddCrossAppeal={!isViewingArchived ? handleAddCrossAppeal : undefined}
                                notificationStatus={displayStage?.parties?.[1]?.notificationStatus || displayStage?.defendantNotificationStatus}
                                onToggleNotification={!isViewingArchived ? handleToggleNotification : undefined}
                                // Cassation Props
                                onCassationDecision={
                                    !isViewingArchived
                                        ? (type) =>
                                              handleCassationDecision(type as 'ratified' | 'quashed')
                                        : undefined
                                }
                                // Pleadings Lock Props
                                isPleadingsClosed={displayStage?.isPleadingsClosed}
                                wasReopened={displayStage?.wasReopened}
                                onClosePleadings={!isViewingArchived ? handleClosePleadings : undefined}
                                onReopenPleadings={!isViewingArchived ? handleReopenPleadings : undefined}
                                onRegisterOpponentAppeal={!isViewingArchived ? () => setShowAppealModal(true) : undefined}
                                hasJudgment={Boolean(displayStage?.finalDecision || displayStage?.isPleadingsClosed)}
                                // Default Judgment Props
                                onDefaultObjection={!isViewingArchived ? handleDefaultObjection : undefined}
                                onWaiveObjection={!isViewingArchived ? handleWaiveObjection : undefined}
                                isUnderObjection={displayStage?.isUnderObjection}
                                onObjectionJudgment={!isViewingArchived ? () => setShowObjectionJudgmentModal(true) : undefined}
                                onOtherAppeals={!isViewingArchived ? handleOtherAppeals : undefined}
                                provisionalOrders={displayStage?.provisionalOrders || []}
                                onAddProvisionalOrder={!isViewingArchived ? () => setShowProvisionalOrderModal(true) : undefined}
                                thirdParties={displayStage?.thirdParties || []}
                                onExtraordinaryAppeal={!isViewingArchived ? () => setShowExtraordinaryAppealModal(true) : undefined}
                                // 🔥 NEW: Command Center Props
                                onJudgeRecusal={!isViewingArchived ? () => setShowJudgeRecusalModal(true) : undefined}
                                onTransferJurisdiction={!isViewingArchived ? () => setShowTransferJurisdictionModal(true) : undefined}
                                onCaseConsolidation={!isViewingArchived ? () => setShowCaseConsolidationModal(true) : undefined}
                                onAttorneyResignation={!isViewingArchived ? () => setShowAttorneyResignationModal(true) : undefined}
                                onExecutionTransfer={!isViewingArchived ? () => setShowExecutionTransferModal(true) : undefined}
                                onExportPDF={handleExportPDF}
                                onMaterialErrorCorrection={!isViewingArchived ? () => setShowMaterialErrorModal('material') : undefined}
                                caseData={parentData as unknown as Record<string, unknown>}
                                currentStage={displayStage as unknown as Record<string, unknown>}
                            />
                            </Suspense>
                            
                            {/* --- CRITICAL: DEADLINE TRACKER UI (Smart Deadlines) --- */}
                            {displayStage?.isPleadingsClosed && displayStage?.appealDeadline && (
                                (() => {
                                    const today = new Date();
                                    const deadlineDate = new Date(displayStage.appealDeadline);
                                    const diffTime = deadlineDate.getTime() - today.getTime();
                                    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    
                                    let cardStyles = "";
                                    let statusText = "";
                                    
                                    if (daysRemaining > 5) {
                                        cardStyles = "bg-emerald-900/20 border-emerald-500 text-emerald-400";
                                        statusText = `متبقي ${daysRemaining} يوم`;
                                    } else if (daysRemaining >= 0) {
                                        cardStyles = "bg-amber-900/20 border-amber-500 text-amber-400 animate-pulse";
                                        statusText = `⚠️ تحذير: متبقي ${daysRemaining} يوم فقط!`;
                                    } else {
                                        cardStyles = "bg-rose-900/20 border-rose-500 text-rose-500";
                                        statusText = "انتهت المدة القانونية ❌";
                                    }

                                    return (
                                        <div className={`w-full p-4 rounded-xl border mb-4 flex justify-between items-center transition-all shadow-lg ${cardStyles}`} dir="rtl">
                                            <div className="flex flex-col">
                                                <h3 className="font-bold text-lg flex items-center gap-2">
                                                    <Clock size={20} />
                                                    ⏳ المدة القانونية للطعن
                                                </h3>
                                                <p className="text-sm opacity-80 mt-1 font-mono">
                                                    ينتهي في: {displayStage.appealDeadline}
                                                </p>
                                            </div>
                                            <div className="text-left bg-black/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                                                <span className="font-bold text-lg block">{statusText}</span>
                                            </div>
                                        </div>
                                    );
                                })()
                            )}

                            {/* POST-JUDGMENT ACTION CONTROLS - ALWAYS RENDERED WHEN LOCKED */}
                            {displayStage?.isPleadingsClosed && (
                              <div className="w-full mt-4 mb-4">
                                {displayStage?.lastJudgmentType === 'غيابي' ? (
                                  /* THE DEFAULT JUDGMENT (غيابي) BOX - STRICT ASYMMETRIC LOGIC */
                                  <div className="bg-orange-900/20 border border-orange-500 p-4 rounded-lg shadow-lg">
                                    <h3 className="text-orange-400 font-bold mb-3 text-sm flex items-center gap-2">
                                        <AlertTriangle size={16} />
                                        إجراءات الحكم الغيابي (وفقاً للصفة):
                                    </h3>
                                    
                                    {/* LOGIC BRANCHING BASED ON REPRESENTATION */}
                                    {parentData.representedParty === 'المدعى عليه' ? (
                                        // DEFENDANT VIEW: Can Object OR Waive
                                        <div className="flex flex-col gap-3">
                                          <div className="text-xs text-orange-200/80 leading-relaxed mb-1 font-medium bg-black/20 p-2 rounded">
                                              بصفتك وكيلاً عن <span className="text-white font-bold underline decoration-emerald-500 decoration-2">المدعى عليه</span>، يحق لك تقديم اعتراض غيابي لإعادة المحاكمة، أو ترك هذا الحق واللجوء للطعن المباشر.
                                          </div>
                                          
                                          <button type="button" 
                                            onClick={handleDefaultObjection} 
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] border border-emerald-400/30">
                                            <ShieldCheck size={18} />
                                            تسجيل اعتراض غيابي (إعادة المحاكمة)
                                          </button>
                                          
                                          <div className="relative flex py-1 items-center justify-center">
                                              <div className="flex-grow border-t border-orange-500/20"></div>
                                              <span className="flex-shrink-0 mx-3 text-orange-500/40 text-[10px] font-bold">خيار استراتيجي</span>
                                              <div className="flex-grow border-t border-orange-500/20"></div>
                                          </div>

                                          <button type="button" 
                                            onClick={handleWaiveObjection} 
                                            className="w-full bg-[#1A1E2E] border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/60 px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all group">
                                            <ArrowRightLeft size={18} className="group-hover:translate-x-1 transition-transform" />
                                            ترك الحكم غيابياً (تجاوز الاعتراض) ⏭️
                                          </button>
                                        </div>
                                    ) : parentData.representedParty === 'المدعي' ? (
                                        // PLAINTIFF VIEW: Can ONLY Appeal (Object is Illegal)
                                        <div className="flex flex-col gap-3">
                                            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-xs text-red-300 flex items-start gap-2 leading-relaxed">
                                                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-500" />
                                                <span>
                                                    <span className="font-bold block mb-1 text-red-400">تنبيه قانوني هام:</span>
                                                    بصفتك وكيلاً عن <span className="text-white font-bold underline decoration-rose-500 decoration-2">المدعي</span>، لا يجوز لك الطعن بطريق "الاعتراض الغيابي" حيث أنه حق حصري للمحكوم عليه غيابياً (المدعى عليه). يمكنك فقط الطعن بالاستئناف/التمييز إذا كان الحكم مجحفاً بحقك.
                                                </span>
                                            </div>
                                            
                                            <button type="button" 
                                              onClick={handleOtherAppeals} 
                                              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]">
                                              <Scale size={18} />
                                              الانتقال لمرحلة الطعن (استئناف/تمييز) 🔓
                                            </button>
                                        </div>
                                    ) : (
                                        // FALLBACK / OBSERVER VIEW (Monitor Mode)
                                        <div className="flex flex-col gap-3">
                                          <div className="bg-slate-800/50 border border-slate-700 p-2 rounded text-xs text-slate-400 text-center mb-1 flex flex-col gap-1">
                                              <span className="font-bold text-slate-300">⚠️ لم يتم تحديد صفة الموكل</span>
                                              <span>حدّد الطرف الممثل من بيانات الأطراف لتفعيل إجراءات الاعتراض والطعن.</span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-3">
                                              <button type="button" 
                                                onClick={handleDefaultObjection} 
                                                className="bg-emerald-900/30 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 p-2 rounded-lg text-xs font-bold transition-all h-full flex flex-col items-center justify-center gap-1">
                                                <ShieldCheck size={16} />
                                                اعتراض (تجريبي)
                                              </button>
                                              <button type="button" 
                                                onClick={handleOtherAppeals} 
                                                className="bg-indigo-900/30 border border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-400 p-2 rounded-lg text-xs font-bold transition-all h-full flex flex-col items-center justify-center gap-1">
                                                <Scale size={16} />
                                                طعن (تجريبي)
                                              </button>
                                          </div>
                                        </div>
                                    )}
                                  </div>
                                ) : (
                                  /* THE PRESENT JUDGMENT (حضوري) UNLOCK BUTTON */
                                  <button type="button" 
                                    onClick={handleReopenPleadings} 
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg text-sm font-bold shadow-lg flex justify-center items-center gap-2">
                                    🔓 فك القفل (لتسجيل طعن الخصم أو استئناف السير)
                                  </button>
                                )}
                              </div>
                            )}

                            {/* 2. Incidental Cases - CRITICAL: Display viewedStage data */}
                            {displayStage?.stageName !== 'التمييز' && !displayStage?.isPleadingsClosed && (
                                <div className="mt-2">
                                    <Suspense fallback={null}>
                                    <LazyIncidentalCasesManager 
                                        cases={displayStage?.incidentalCases || []} 
                                        onResolve={!isViewingArchived ? handleResolveIncidentalCase : undefined} 
                                    />
                                    </Suspense>
                                </div>
                            )}

                            {/* 3. Financial Card - ALWAYS SHOW PARENT DATA */}
                            <Suspense fallback={null}>
                            <LazyFinancialCard 
                                total={parentData.feesTotal} 
                                paid={parentData.feesPaid} 
                                onAddPayment={!isViewingArchived ? () => setShowPaymentModal(true) : undefined}
                                isEditing={false}
                                onUpdateTotal={(val: number) => setParentData({...parentData, feesTotal: val})}
                            />
                            </Suspense>

                            {/* 4. Quick Actions - HIDE when viewing archived OR Cassation OR Pleadings Closed */}
                            {!isViewingArchived && displayStage?.stageName !== 'التمييز' && !displayStage?.isPleadingsClosed && (
                                <div className="print:hidden">
                                    <Suspense fallback={null}>
                                    <LazyQuickActions 
                                        onAction={handleQuickAction} 
                                        onPause={() => setShowPauseModal(true)} 
                                        onOpenLegalActions={() => setIsActionsMenuOpen(true)}
                                    />
                                    </Suspense>
                                </div>
                            )}

                            {/* 5. To-Do List - CRITICAL: Display viewedStage tasks - Hide in Cassation OR Pleadings Closed */}
                            {!isViewingArchived && displayStage?.stageName !== 'التمييز' && !displayStage?.isPleadingsClosed && (
                                <Suspense fallback={null}>
                                <LazyToDoList 
                                    tasks={displayStage?.tasks || []} 
                                    onAddTask={() => setShowTaskModal(true)}
                                    onToggleTask={handleToggleTask}
                                    onEditTask={(task) => setEditingTask(task)}
                                />
                                </Suspense>
                            )}

                            {/* 5.5. Fast-Track Petitions List - NEW: Display Fast-Track Petitions */}
                            {!isViewingArchived && displayStage?.fastTrackPetitions && displayStage.fastTrackPetitions.length > 0 && (
                                <Suspense fallback={null}>
                                <LazyFastTrackPetitionsList 
                                    petitions={displayStage.fastTrackPetitions as never[]} 
                                    onEdit={(petition) => {
                                        setEditingFastTrack(petition as unknown as Record<string, unknown>);
                                        setShowFastTrackModal(true);
                                    }}
                                />
                                </Suspense>
                            )}

                            {/* 5.6. Attachment Shield Card - NEW: Display Attachments */}
                            {!isViewingArchived && displayStage?.attachments && displayStage.attachments.length > 0 && (
                                <Suspense fallback={null}>
                                <LazyAttachmentShieldCard 
                                    attachments={displayStage.attachments as never[]} 
                                    onEdit={(attachment) => {
                                        setEditingAttachment(attachment as unknown as Record<string, unknown>);
                                        setShowAttachmentModal(true);
                                    }}
                                />
                                </Suspense>
                            )}

                            {/* 6. Timeline - CRITICAL: Display viewedStage timeline */}
                            <div className="mb-6">
                                <h3 className="text-gray-300 text-lg font-bold flex items-center gap-2 pb-2 border-b border-white/5">
                                    <Clock size={18} className="text-[#E6C673]" />
                                    السجل الزمني
                                </h3>
                            </div>

                            <Suspense fallback={null}>
                            <LazyTimelineFeed 
                                events={displayTimeline} 
                                onDelete={!isViewingArchived ? handleDeleteEvent : undefined} 
                                onEdit={!isViewingArchived ? handleEditEvent : undefined} 
                            />
                            </Suspense>

                            {/* 7. Seal Stage Button (Sole Primary Action) - HIDE when viewing archived */}
                            {!isViewingArchived && (
                                <div className="mt-6 px-3 pb-6 print:hidden w-full space-y-2 relative z-20 sm:rounded-b-3xl">
                                    {/* 🔥 NEW: Cross-Appeal Button (Show ONLY in Appeal stage for Appellee) */}
                                    {currentStage?.stageName === 'الاستئناف' && 
                                     currentStage?.appealMetadata && 
                                     !currentStage.appealMetadata.hasCrossAppeal && (
                                        (() => {
                                            // Determine if current lawyer represents the appellee (المستأنف عليه)
                                            // Check if any party with المستأنف عليه role matches the represented party
                                            const isAppelleeLawyer = currentStage.parties.some((p: { role: string; originalRole?: string }) => {
                                                const isAppellee = p.role.includes('المستأنف عليه');
                                                // Check if this party's original role matches our represented party
                                                const originalRole = p.role.includes('المدعي') ? 'المدعي' : 'المدعى عليه';
                                                const representsThisParty = parentData.representedParty === originalRole;
                                                return isAppellee && representsThisParty;
                                            });

                                            return isAppelleeLawyer ? (
                                                <button type="button" 
                                                    onClick={() => setShowCrossAppealModal(true)} 
                                                    className="bg-teal-600 hover:bg-teal-500 text-white font-bold p-3 rounded-lg w-full shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <ArrowRightLeft size={20} />
                                                    🔄 تقديم استئناف متقابل
                                                </button>
                                            ) : null;
                                        })()
                                    )}

                                    <button type="button"
                                        onClick={() => setShowJudgmentModal(true)}
                                        className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 hover:from-amber-300 hover:via-yellow-500 hover:to-amber-600 text-[#0B1021] font-bold text-lg shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                                    >
                                        <Scale size={20} className="text-[#0B1021]" strokeWidth={2.5} />
                                        ختام المرافعة
                                    </button>
                                </div>
                            )}
                        </div>

    );
}
