import { EVICTION_TIMELINE_ACTION_IDS } from '@/app/utils/executionModuleStrategies';
import React from 'react';
import { motion } from 'motion/react';
import { Calendar, Shield, Hammer, UserCheck, Timer } from 'lucide-react';
import { InlineActionGate } from '@/app/components/lawyer/ExecutionDashboard/components/InlineActionGate';
import {
    BTN_BASE,
    BTN_DISABLED,
    TONE_GRACE,
    TONE_FIELD_VISIT,
    TONE_POLICE,
    TONE_EARLY_END,
    TONE_BREAK,
    TONE_CUSTODIAN,
} from './evictionFieldProceduresStyles';
import type { EvictionFieldProceduresPanelViewModel } from './useEvictionFieldProceduresPanel';

export type { EvictionFieldProceduresPanelViewModel };

/** عرض إجراءات التخلية الميدانية — مُستخرج لميزانية ≤1000 */
export function EvictionFieldProceduresPanelView(model: EvictionFieldProceduresPanelViewModel) {
    const {
        policeBtnRef,
        inlineExpandedByBranch,
        inlineActionGateKey,
        setInlineActionGateKey,
        confirmGate,
        setConfirmGate,
        confirmBusy,
        setConfirmBusy,
        hasBreak,
        isBranchWorkflowComplete,
        isBranchInProgress,
        isBranchActionable,
        handleBranchPrimaryClick,
        submitEvictionRequest,
        renderEvictionBranchPanelBody,
        renderBranchChevron,
        locked,
        lockHint,
        showResidentialEvictionGraceButton,
        residentialGracePeriodSaved,
        onResidentialEvictionGraceClick,
        showResidentialGraceEarlyEndRequest,
        showBreakInventoryRequest,
        showEvictionFieldworkRequests,
        showDebtorHeirsEvictionTools,
        heirsNotificationDateYmd,
        onHeirsNotificationDateYmdChange,
        onIssueHeirsExecutionNoticeMemo,
        tryOpenPendingCustodianDetails,
    } = model;

    return (
        <div className="space-y-3">
            {locked && lockHint && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-950/25 backdrop-blur-xl px-3 py-2 text-amber-200 text-xs text-right">
                    {lockHint}
                </div>
            )}
    
            {showDebtorHeirsEvictionTools && onIssueHeirsExecutionNoticeMemo && (
                <div className="rounded-2xl border border-white/10 bg-[#0A1122]/60 backdrop-blur-xl px-3 py-2.5 space-y-2 text-right">
                    <p className="text-[9px] text-slate-500">تبليغ الورثة — اختياري</p>
                    {onHeirsNotificationDateYmdChange && (
                        <label className="flex flex-col gap-1 items-stretch">
                            <span className="text-[10px] text-slate-400">تاريخ تبليغ الورثة</span>
                            <input
                                type="date"
                                value={heirsNotificationDateYmd}
                                onChange={(e) => onHeirsNotificationDateYmdChange(e.target.value)}
    								className="w-full bg-black/20 border border-white/10 text-white rounded-2xl p-4 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 focus:bg-black/40 transition-all placeholder:text-white/20"
                            />
                        </label>
                    )}
                    <button
                        type="button"
                        disabled={locked}
                        className={`${BTN_BASE} ${locked ? BTN_DISABLED : ''}`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (locked) return;
                            onIssueHeirsExecutionNoticeMemo();
                        }}
                    >
                        <div className="flex flex-row-reverse items-center gap-3">
                            <span className="text-lg shrink-0 opacity-80" aria-hidden>
                                📜
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-bold text-sm">
                                    إصدار مذكرة إخبار بالتنفيذ للورثة
                                </p>
                            </div>
                        </div>
                    </button>
                </div>
            )}
    
    			<motion.div
    				className="flex flex-col gap-4"
                initial="hidden"
                animate="show"
                variants={{
                    hidden: { opacity: 1 },
                    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
                }}
    			>
                {showResidentialEvictionGraceButton && onResidentialEvictionGraceClick ? (
                    <motion.button
                        type="button"
                        disabled={locked}
                        title={
                            residentialGracePeriodSaved
                                ? 'تعديل مهلة التخلية — المدة وتاريخ الانتهاء'
                                : 'مهلة — المدة وتاريخ الانتهاء'
                        }
                        aria-label={residentialGracePeriodSaved ? 'تعديل المهلة' : 'مهلة'}
                        className={`${BTN_BASE} ${TONE_GRACE} ${locked ? BTN_DISABLED : ''}`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (locked) return;
                            onResidentialEvictionGraceClick(
                                residentialGracePeriodSaved ? { edit: true } : undefined
                            );
                        }}
                        variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    >
                        <div className="flex items-center gap-3 flex-row-reverse min-w-0">
                            <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
                                <Calendar className="w-6 h-6 text-white/70" strokeWidth={2} />
                            </div>
                            <span className="truncate text-[12px] font-bold text-white">
                                {residentialGracePeriodSaved ? 'تعديل المهلة' : 'مهلة'}
                            </span>
                            <span className="sr-only">المدة وتاريخ الانتهاء</span>
                        </div>
                    </motion.button>
                ) : null}
    
                {showEvictionFieldworkRequests ? (
                <div
                    className={`relative rounded-2xl border border-white/10 bg-black/10 ${
                        inlineExpandedByBranch['Field Visit Date'] && isBranchInProgress('Field Visit Date')
                            ? 'overflow-visible'
                            : 'overflow-hidden'
                    }`}
                >
                    <motion.button
                        type="button"
                        disabled={locked && !isBranchActionable('Field Visit Date')}
                        aria-expanded={Boolean(
                            inlineExpandedByBranch['Field Visit Date'] &&
                                isBranchInProgress('Field Visit Date')
                        )}
                        className={`${BTN_BASE} ${TONE_FIELD_VISIT} ${locked && !isBranchActionable('Field Visit Date') ? BTN_DISABLED : ''} rounded-none border-0`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleBranchPrimaryClick('Field Visit Date', () =>
                                setInlineActionGateKey('eviction_field_visit')
                            );
                        }}
                        variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    >
                        <div className="flex w-full flex-row-reverse items-center gap-3 min-w-0">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5">
                                <Calendar className="h-6 w-6 text-white/70" strokeWidth={2} />
                            </div>
                            <span className="min-w-0 flex-1 truncate text-right text-[12px] font-bold text-white">
                                تحديد موعد الخروج الميداني
                            </span>
                            {renderBranchChevron('Field Visit Date')}
                        </div>
                    </motion.button>
                    {!isBranchInProgress('Field Visit Date') ? (
                        <InlineActionGate
                            gateKey="eviction_field_visit"
                            activeKey={inlineActionGateKey}
                            mode={
                                isBranchWorkflowComplete('Field Visit Date')
                                    ? 'resubmit_warning'
                                    : 'initial'
                            }
                            onConfirm={() =>
                                submitEvictionRequest({
                                    actionId: EVICTION_TIMELINE_ACTION_IDS.FIELD_VISIT,
                                    branch: 'Field Visit Date',
                                    timelineTitle: '📍 تحديد موعد الخروج الميداني',
                                    timelineDescription:
                                        'تم جدولة / تحديد موعد الخروج الميداني مع منفذ العدل (باشر).',
                                    requestTitle: 'طلب تحديد موعد الخروج الميداني',
                                    supersedeCompletedHub: isBranchWorkflowComplete('Field Visit Date'),
                                })
                            }
                            onCancel={() => setInlineActionGateKey(null)}
                        />
                    ) : null}
                    {renderEvictionBranchPanelBody(
                        'Field Visit Date',
                        'طلب تحديد موعد الخروج الميداني',
                        undefined,
                        () => setInlineActionGateKey('eviction_field_visit')
                    )}
                </div>
                ) : null}
    
                {showEvictionFieldworkRequests ? (
                <div
                    className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black/10 ${
                        inlineExpandedByBranch['Police Assistance Request'] ? 'overflow-visible' : ''
                    }`}
                >
                    <motion.button
                        type="button"
                        disabled={locked && !isBranchActionable('Police Assistance Request')}
                        aria-expanded={Boolean(
                            inlineExpandedByBranch['Police Assistance Request'] &&
                                isBranchInProgress('Police Assistance Request')
                        )}
                        className={`${BTN_BASE} ${TONE_POLICE} ${locked && !isBranchActionable('Police Assistance Request') ? BTN_DISABLED : ''} rounded-none border-0`}
                        ref={policeBtnRef}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleBranchPrimaryClick('Police Assistance Request', () =>
                                setInlineActionGateKey('eviction_police_force')
                            );
                        }}
                        variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    >
                        <div className="flex w-full flex-row-reverse items-center gap-3 min-w-0">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5">
                                <Shield className="h-6 w-6 text-white/70" strokeWidth={2} />
                            </div>
                            <span className="min-w-0 flex-1 truncate text-right text-[12px] font-bold text-white">
                                القوة الجبرية
                            </span>
                            {renderBranchChevron('Police Assistance Request')}
                        </div>
                    </motion.button>
                    {!isBranchInProgress('Police Assistance Request') ? (
                        <InlineActionGate
                            gateKey="eviction_police_force"
                            activeKey={inlineActionGateKey}
                            mode={
                                isBranchWorkflowComplete('Police Assistance Request')
                                    ? 'resubmit_warning'
                                    : 'initial'
                            }
                            onConfirm={() =>
                                submitEvictionRequest({
                                    actionId: EVICTION_TIMELINE_ACTION_IDS.POLICE_FORCE,
                                    branch: 'Police Assistance Request',
                                    timelineTitle: '🛡️ القوة الجبرية',
                                    timelineDescription:
                                        'طلب قوة جبرية مساندة للتنفيذ الميداني (قرار منفذ). عند الموافقة: احفظ الجهة المرافقة من بطاقة القرار.',
                                    requestTitle: 'مفاتحة الشرطة للقوة الإجرائية',
                                    supersedeCompletedHub: isBranchWorkflowComplete(
                                        'Police Assistance Request'
                                    ),
                                })
                            }
                            onCancel={() => setInlineActionGateKey(null)}
                        />
                    ) : null}
                    {renderEvictionBranchPanelBody(
                        'Police Assistance Request',
                        'طلب القوة الجبرية',
                        undefined,
                        () => setInlineActionGateKey('eviction_police_force')
                    )}
                </div>
                ) : null}
    
                {showResidentialGraceEarlyEndRequest && (
                    <div
                        className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black/10 ${
                            inlineExpandedByBranch['Residential Grace Early End'] ? 'overflow-visible' : ''
                        }`}
                    >
                        <motion.button
                            type="button"
                            disabled={locked && !isBranchActionable('Residential Grace Early End')}
                            aria-expanded={Boolean(
                                inlineExpandedByBranch['Residential Grace Early End'] &&
                                    isBranchInProgress('Residential Grace Early End')
                            )}
                            className={`${BTN_BASE} ${TONE_EARLY_END} ${locked && !isBranchActionable('Residential Grace Early End') ? BTN_DISABLED : ''} rounded-none border-0`}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleBranchPrimaryClick('Residential Grace Early End', () =>
                                    setConfirmGate('early_end')
                                );
                            }}
                            variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                        >
                            <div className="flex w-full flex-row-reverse items-center gap-3 min-w-0">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5">
                                    <Timer className="h-6 w-6 text-white/70" strokeWidth={2} />
                                </div>
                                <span className="min-w-0 flex-1 truncate text-right text-[12px] font-bold text-white">
                                    طلب إنهاء مهلة التخلية السكنية
                                </span>
                                {renderBranchChevron('Residential Grace Early End')}
                                <span className="sr-only">يظهر أثناء سريان مهلة سكنية مسجّلة فقط</span>
                            </div>
                        </motion.button>
                        <div
                            className={`absolute inset-0 z-20 flex items-center justify-center gap-2 rounded-2xl bg-slate-950/45 px-3 backdrop-blur-xl transition-opacity duration-150 ${
                                confirmGate === 'early_end' ? 'opacity-100' : 'pointer-events-none opacity-0'
                            }`}
                            role="presentation"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                disabled={confirmBusy}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirmBusy) return;
                                    setConfirmBusy(true);
                                    try {
                                        submitEvictionRequest({
                                            actionId: EVICTION_TIMELINE_ACTION_IDS.RESIDENTIAL_GRACE_EARLY_END,
                                            branch: 'Residential Grace Early End',
                                            timelineTitle: '⏱️ طلب إنهاء مهلة التخلية السكنية (موافقة المنفذ)',
                                            timelineDescription:
                                                'طلب عرض على منفذ العدل لإنهاء مهلة التخلية السكنية قبل انتهاء المدة وإعادة دورة المهلة في الإضبارة عند الموافقة.',
                                            requestTitle: 'طلب إنهاء مهلة التخلية السكنية (موافقة المنفذ)',
                                            supersedeCompletedHub: isBranchWorkflowComplete(
                                                'Residential Grace Early End'
                                            ),
                                        });
                                    } finally {
                                        setConfirmBusy(false);
                                        setConfirmGate(null);
                                    }
                                }}
                                className="rounded-xl border border-amber-500 bg-amber-600/20 px-3 py-2 text-[11px] font-black text-amber-100 hover:bg-amber-600/25 disabled:opacity-50"
                            >
                                تأكيد وإرسال للقرارات
                            </button>
                            <button
                                type="button"
                                disabled={confirmBusy}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirmBusy) return;
                                    setConfirmGate(null);
                                }}
                                className="rounded-xl bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                            >
                                إلغاء
                            </button>
                        </div>
    
                        {renderEvictionBranchPanelBody(
                            'Residential Grace Early End',
                            'طلب إنهاء مهلة التخلية السكنية',
                            undefined,
                            () => setConfirmGate('early_end')
                        )}
                    </div>
                )}
    
                {showBreakInventoryRequest ? (
                <div
                    className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black/10 ${
                        inlineExpandedByBranch['Lock Breaking & Inventory'] ? 'overflow-visible' : ''
                    }`}
                >
                    <motion.button
                        type="button"
                        disabled={locked && !isBranchActionable('Lock Breaking & Inventory')}
                        aria-expanded={Boolean(
                            inlineExpandedByBranch['Lock Breaking & Inventory'] &&
                                isBranchInProgress('Lock Breaking & Inventory')
                        )}
                        className={`${BTN_BASE} ${TONE_BREAK} ${locked && !isBranchActionable('Lock Breaking & Inventory') ? BTN_DISABLED : ''} rounded-none border-0`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleBranchPrimaryClick('Lock Breaking & Inventory', () =>
                                setInlineActionGateKey('eviction_break_inventory')
                            );
                        }}
                        variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    >
                        <div className="flex w-full flex-row-reverse items-center gap-3 min-w-0">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5">
                                <Hammer className="h-6 w-6 text-white/70" strokeWidth={2} />
                            </div>
                            <span className="min-w-0 flex-1 truncate text-right text-[12px] font-bold text-white">
                                طلب كسر الأقفال وجرد الأثاث
                            </span>
                            {renderBranchChevron('Lock Breaking & Inventory')}
                        </div>
                    </motion.button>
                    {!isBranchInProgress('Lock Breaking & Inventory') ? (
                        <InlineActionGate
                            gateKey="eviction_break_inventory"
                            activeKey={inlineActionGateKey}
                            mode={
                                isBranchWorkflowComplete('Lock Breaking & Inventory')
                                    ? 'resubmit_warning'
                                    : 'initial'
                            }
                            onConfirm={() =>
                                submitEvictionRequest({
                                    actionId: EVICTION_TIMELINE_ACTION_IDS.BREAK_INVENTORY,
                                    branch: 'Lock Breaking & Inventory',
                                    timelineTitle: '🔨 طلب كسر الأقفال وجرد الأثاث',
                                    timelineDescription:
                                        'طلب عرض على منفذ العدل بشأن كسر الأقفال وجرد محتويات المنقولات في العين المؤجرة.',
                                    requestTitle: 'طلب كسر الأقفال وجرد الأثاث',
                                    supersedeCompletedHub: isBranchWorkflowComplete(
                                        'Lock Breaking & Inventory'
                                    ),
                                })
                            }
                            onCancel={() => setInlineActionGateKey(null)}
                        />
                    ) : null}
                    {renderEvictionBranchPanelBody(
                        'Lock Breaking & Inventory',
                        'طلب كسر الأقفال وجرد الأثاث',
                        undefined,
                        () => setInlineActionGateKey('eviction_break_inventory')
                    )}
                </div>
                ) : null}
    
                {hasBreak && showEvictionFieldworkRequests && (
                    <div
                        className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black/10 ${
                            inlineExpandedByBranch['Judicial Custodian'] ? 'overflow-visible' : ''
                        }`}
                    >
                        <motion.button
                            type="button"
                            disabled={locked && !isBranchActionable('Judicial Custodian')}
                            aria-expanded={Boolean(
                                inlineExpandedByBranch['Judicial Custodian'] &&
                                    isBranchInProgress('Judicial Custodian')
                            )}
                            className={`${BTN_BASE} ${TONE_CUSTODIAN} ${locked && !isBranchActionable('Judicial Custodian') ? BTN_DISABLED : ''} rounded-none border-0`}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleBranchPrimaryClick('Judicial Custodian', () =>
                                    setConfirmGate('custodian')
                                );
                            }}
                            variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                        >
                            <div className="flex w-full flex-row-reverse items-center gap-3 min-w-0">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5">
                                    <UserCheck className="h-6 w-6 text-white/70" strokeWidth={2} />
                                </div>
                                <span className="min-w-0 flex-1 truncate text-right text-[12px] font-bold text-white">
                                    تنصيب حارس قضائي
                                </span>
                                {renderBranchChevron('Judicial Custodian')}
                                <span className="sr-only">
                                    يظهر بعد تسجيل طلب كسر الأقفال والجرد — يمكن تكرار الطلب بعد التعيين
                                </span>
                            </div>
                        </motion.button>
                        <div
                            className={`absolute inset-0 z-20 flex items-center justify-center gap-2 rounded-2xl bg-slate-950/45 px-3 backdrop-blur-xl transition-opacity duration-150 ${
                                confirmGate === 'custodian' ? 'opacity-100' : 'pointer-events-none opacity-0'
                            }`}
                            role="presentation"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                disabled={confirmBusy}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirmBusy) return;
                                    setConfirmBusy(true);
                                    try {
                                        submitEvictionRequest({
                                            actionId: EVICTION_TIMELINE_ACTION_IDS.CUSTODIAN,
                                            branch: 'Judicial Custodian',
                                            timelineTitle: '👤 طلب تنصيب حارس قضائي',
                                            timelineDescription: 'طلب عرض على منفذ العدل لتنصيب حارس قضائي على العين.',
                                            requestTitle: 'طلب تنصيب حارس قضائي',
                                            supersedeCompletedHub: isBranchWorkflowComplete(
                                                'Judicial Custodian'
                                            ),
                                        });
                                    } finally {
                                        setConfirmBusy(false);
                                        setConfirmGate(null);
                                    }
                                }}
                                className="rounded-xl border border-amber-500 bg-amber-600/20 px-3 py-2 text-[11px] font-black text-amber-100 hover:bg-amber-600/25 disabled:opacity-50"
                            >
                                تأكيد وإرسال للقرارات
                            </button>
                            <button
                                type="button"
                                disabled={confirmBusy}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirmBusy) return;
                                    setConfirmGate(null);
                                }}
                                className="rounded-xl bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                            >
                                إلغاء
                            </button>
                        </div>
    
                        {renderEvictionBranchPanelBody(
                            'Judicial Custodian',
                            'طلب تنصيب حارس قضائي',
                            <button
                                type="button"
                                disabled={locked}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    tryOpenPendingCustodianDetails?.();
                                }}
                                className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-bold text-emerald-100 disabled:opacity-40"
                            >
                                متابعة حفظ بيانات الحارس
                            </button>,
                            () => setConfirmGate('custodian')
                        )}
                    </div>
                )}
       </motion.div>
        </div>
    );
}
