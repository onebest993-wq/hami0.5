import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/ExecutionDashboard/executionDashboardConstants';
import {
    EXEC_MODAL_BACKDROP_SAFE_PAD,
} from '@/app/components/lawyer/ExecutionDashboard/executionModalMobileShell';
import ConfirmAttendanceModal from './Modal_Unified_Summons_Hub/components/ConfirmAttendanceModal';
import { HUB_SHELL_CLASS } from './Modal_Unified_Summons_Hub/summonsHubStyles';
import { SummonsHubHeader } from './Modal_Unified_Summons_Hub/SummonsHubHeader';
import { SummonsHubKindSelect } from './Modal_Unified_Summons_Hub/SummonsHubKindSelect';
import { SummonsHubTablighPanel } from './Modal_Unified_Summons_Hub/SummonsHubTablighPanel';
import { SummonsHubNashrPanel } from './Modal_Unified_Summons_Hub/SummonsHubNashrPanel';
import { SummonsHubTaklifPanel } from './Modal_Unified_Summons_Hub/SummonsHubTaklifPanel';
import { SummonsHubGuarantorPanel } from './Modal_Unified_Summons_Hub/SummonsHubGuarantorPanel';
import { useUnifiedSummonsHubState } from './Modal_Unified_Summons_Hub/useUnifiedSummonsHubState';
import type { UnifiedSummonsHubProps } from './Modal_Unified_Summons_Hub/unifiedSummonsHubTypes';

export type { UnifiedSummonsHubProps };

export const UnifiedSummonsHub: React.FC<UnifiedSummonsHubProps> = (props) => {
    const { isOpen, onClose, onTerminateTablighTask } = props;
    const {
        isGuarantorSummonsContext,
        hubTabOptions,
        memoArchivedResolved,
        hubMainTab,
        setHubMainTab,
        setTaklifFormError,
        setNashrFormError,
        notificationCount,
        memoNoticeDateYmd,
        memoDateEditing,
        memoWindow,
        memoError,
        summonsTodayYmdMax,
        showLawyerFeesIncludeCheckbox,
        initialNoticeLawyerFeesIncluded,
        setInitialNoticeLawyerFeesIncluded,
        suppressPublicationNotice,
        onRegisterDebtorVoluntaryAttendance,
        evictionDebtorExecutionStrip,
        resolvedTablighTask,
        debtorDate,
        setDebtorDate,
        dateError,
        noticeKindGoal,
        setNoticeKindGoal,
        setMemoDateEditing,
        setMemoError,
        setDateError,
        setConfirmAttendanceWithoutNoticeOpen,
        setTablighTaskOptimistic,
        setTablighClearedOptimistic,
        markExecutionSummonsArchived,
        submitExecutionSummonsDate,
        onDebtorNotification,
        validateDate,
        publicationNoticeFeature,
        nashrLockReason,
        resolvedPublicationNotice,
        nashrDate,
        setNashrDate,
        nashrPaper1,
        setNashrPaper1,
        nashrPaper2,
        setNashrPaper2,
        nashrFormError,
        setMemoDateOptimistic,
        setNashrClearedOptimistic,
        employeeAssignmentFeature,
        empPhase,
        empAssign,
        empEffectiveDeadlineYmd,
        taklifPurpose,
        setTaklifPurpose,
        taklifDate,
        setTaklifDate,
        taklifDurationDays,
        setTaklifDurationDays,
        taklifFormError,
        handleTaklifConfirm,
        guarantorNotificationFeature,
        guarantorNoticeDate,
        setGuarantorNoticeDate,
        guarantorNoticeReason,
        setGuarantorNoticeReason,
        guarantorFormError,
        setGuarantorFormError,
        submitGuarantorNotice,
        confirmAttendanceWithoutNoticeOpen,
    } = useUnifiedSummonsHubState(props);

    if (!isOpen) return null;

    return (
        <div
            className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG} ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
            style={{ zIndex: EXEC_MODAL_Z.unifiedSummonsAndLegacyNotification }}
            onClick={onClose}
            role="presentation"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={HUB_SHELL_CLASS}
                onClick={(e) => e.stopPropagation()}
            >
                <SummonsHubHeader
                    isGuarantorSummonsContext={isGuarantorSummonsContext}
                    onClose={onClose}
                />

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto overscroll-contain p-5">
                    <SummonsHubKindSelect
                        hubTabOptions={hubTabOptions}
                        memoArchivedResolved={memoArchivedResolved}
                        notificationCount={notificationCount}
                        hubMainTab={hubMainTab}
                        onHubMainTabChange={setHubMainTab}
                        onClearTaklifFormError={() => setTaklifFormError('')}
                        onClearNashrFormError={() => setNashrFormError('')}
                    />
                    {hubMainTab === 'tabligh' && (
                        <SummonsHubTablighPanel
                            memoArchivedResolved={memoArchivedResolved}
                            notificationCount={notificationCount}
                            memoNoticeDateYmd={memoNoticeDateYmd}
                            memoDateEditing={memoDateEditing}
                            memoWindow={memoWindow}
                            memoError={memoError}
                            summonsTodayYmdMax={summonsTodayYmdMax}
                            showLawyerFeesIncludeCheckbox={showLawyerFeesIncludeCheckbox}
                            initialNoticeLawyerFeesIncluded={initialNoticeLawyerFeesIncluded}
                            setInitialNoticeLawyerFeesIncluded={setInitialNoticeLawyerFeesIncluded}
                            suppressPublicationNotice={suppressPublicationNotice}
                            onRegisterDebtorVoluntaryAttendance={onRegisterDebtorVoluntaryAttendance}
                            evictionDebtorExecutionStrip={evictionDebtorExecutionStrip}
                            resolvedTablighTask={resolvedTablighTask}
                            debtorDate={debtorDate}
                            setDebtorDate={setDebtorDate}
                            dateError={dateError}
                            noticeKindGoal={noticeKindGoal}
                            setNoticeKindGoal={setNoticeKindGoal}
                            setMemoDateEditing={setMemoDateEditing}
                            setMemoError={setMemoError}
                            setHubMainTab={setHubMainTab}
                            setDateError={setDateError}
                            setNashrFormError={setNashrFormError}
                            setConfirmAttendanceWithoutNoticeOpen={setConfirmAttendanceWithoutNoticeOpen}
                            setTablighTaskOptimistic={setTablighTaskOptimistic}
                            setTablighClearedOptimistic={setTablighClearedOptimistic}
                            markExecutionSummonsArchived={markExecutionSummonsArchived}
                            submitExecutionSummonsDate={submitExecutionSummonsDate}
                            onTerminateTablighTask={onTerminateTablighTask}
                            onDebtorNotification={onDebtorNotification}
                            onClose={onClose}
                            validateDate={validateDate}
                        />
                    )}

                    {hubMainTab === 'nashr' && (
                        <SummonsHubNashrPanel
                            publicationNoticeFeature={publicationNoticeFeature}
                            nashrLockReason={nashrLockReason}
                            resolvedPublicationNotice={resolvedPublicationNotice}
                            nashrDate={nashrDate}
                            setNashrDate={setNashrDate}
                            nashrPaper1={nashrPaper1}
                            setNashrPaper1={setNashrPaper1}
                            nashrPaper2={nashrPaper2}
                            setNashrPaper2={setNashrPaper2}
                            nashrFormError={nashrFormError}
                            setNashrFormError={setNashrFormError}
                            hubMainTab={hubMainTab}
                            dateError={dateError}
                            setDateError={setDateError}
                            summonsTodayYmdMax={summonsTodayYmdMax}
                            memoArchivedResolved={memoArchivedResolved}
                            notificationCount={notificationCount}
                            setMemoDateOptimistic={setMemoDateOptimistic}
                            setNashrClearedOptimistic={setNashrClearedOptimistic}
                            setHubMainTab={setHubMainTab}
                            onDebtorNotification={onDebtorNotification}
                            validateDate={validateDate}
                        />
                    )}

                    {hubMainTab === 'taklif' && (
                        <SummonsHubTaklifPanel
                            employeeAssignmentFeature={employeeAssignmentFeature}
                            empPhase={empPhase}
                            empAssign={empAssign}
                            empEffectiveDeadlineYmd={empEffectiveDeadlineYmd}
                            taklifPurpose={taklifPurpose}
                            setTaklifPurpose={setTaklifPurpose}
                            taklifDate={taklifDate}
                            setTaklifDate={setTaklifDate}
                            taklifDurationDays={taklifDurationDays}
                            setTaklifDurationDays={setTaklifDurationDays}
                            taklifFormError={taklifFormError}
                            dateError={dateError}
                            hubMainTab={hubMainTab}
                            summonsTodayYmdMax={summonsTodayYmdMax}
                            handleTaklifConfirm={handleTaklifConfirm}
                            onClose={onClose}
                            validateDate={validateDate}
                        />
                    )}

                    {hubMainTab === 'guarantor' && guarantorNotificationFeature?.enabled && (
                        <SummonsHubGuarantorPanel
                            guarantorNotificationFeature={guarantorNotificationFeature}
                            guarantorNoticeDate={guarantorNoticeDate}
                            setGuarantorNoticeDate={setGuarantorNoticeDate}
                            guarantorNoticeReason={guarantorNoticeReason}
                            setGuarantorNoticeReason={setGuarantorNoticeReason}
                            guarantorFormError={guarantorFormError}
                            setGuarantorFormError={setGuarantorFormError}
                            summonsTodayYmdMax={summonsTodayYmdMax}
                            submitGuarantorNotice={submitGuarantorNotice}
                            onClose={onClose}
                        />
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
};
