import { closeUnknownScope } from '../closeUnknownScope';

export type ExecutionShellOverlayInstantPaint = {
    title: string;
    onClose: () => void;
    kind:
        | 'notes'
        | 'appointment'
        | 'documents'
        | 'decisions'
        | 'timeline'
        | 'seized-assets'
        | 'named';
};

function closeNull(s: Record<string, unknown>, key: string): () => void {
    return () => {
        const set = s[key];
        if (typeof set === 'function') {
            (set as (v: null) => void)(null);
        }
    };
}

function closeBool(
    s: Record<string, unknown>,
    closeKey: string,
    setKey: string,
): () => void {
    return closeUnknownScope(s, closeKey, setKey);
}

/**
 * عنوان وإغلاق أول إطار لبرميل النوافذ — يطابق النافذة المفتوحة فعلياً.
 */
export function resolveExecutionShellOverlayInstantPaint(
    s: Record<string, unknown>,
): ExecutionShellOverlayInstantPaint {
    if (s.showNotesModal) {
        return {
            kind: 'notes',
            title: 'سجل الملاحظات والمهام',
            onClose: closeBool(s, 'onCloseNotesModal', 'setShowNotesModal'),
        };
    }
    if (s.showAppointmentModal) {
        return {
            kind: 'appointment',
            title: 'إضافة موعد',
            onClose: closeBool(s, 'onCloseAppointmentModal', 'setShowAppointmentModal'),
        };
    }
    if (s.showDocumentsModal) {
        return {
            kind: 'documents',
            title: 'خزينة المستندات',
            onClose: closeBool(s, 'onCloseDocumentsModal', 'setShowDocumentsModal'),
        };
    }
    if (s.showDecisionsModal) {
        return {
            kind: 'decisions',
            title: 'مركز القرارات والطعون',
            onClose: closeBool(s, 'onCloseDecisionsModal', 'setShowDecisionsModal'),
        };
    }
    if (s.showTimelineModal) {
        return {
            kind: 'timeline',
            title: 'السجل الزمني الكامل',
            onClose: closeBool(s, 'onCloseTimelineModal', 'setShowTimelineModal'),
        };
    }
    if (s.showSeizedAssetsModal) {
        return {
            kind: 'seized-assets',
            title: 'إدارة الأموال المحجوزة والمزايدات العلنية',
            onClose: closeBool(s, 'onCloseSeizedAssetsModal', 'setShowSeizedAssetsModal'),
        };
    }
    if (s.showPaymentModal) {
        return {
            kind: 'named',
            title: 'إضافة تسديد جديد',
            onClose: closeBool(s, 'onClosePaymentModal', 'setShowPaymentModal'),
        };
    }
    if (s.showNotificationModal) {
        return {
            kind: 'named',
            title: 'التبليغ',
            onClose: closeBool(s, 'onCloseNotificationModal', 'setShowNotificationModal'),
        };
    }
    if (s.showCoerciveModal) {
        return {
            kind: 'named',
            title: 'التنفيذ الجبري والإكراه',
            onClose: closeBool(s, 'onCloseCoerciveModal', 'setShowCoerciveModal'),
        };
    }
    if (s.showHeirsNotificationModal) {
        return {
            kind: 'named',
            title: 'مركز تبليغ الورثة — متابعة مستقلة',
            onClose: closeBool(s, 'onCloseHeirsNotificationModal', 'setShowHeirsNotificationModal'),
        };
    }
    if (s.showUnifiedSummonsModal) {
        return {
            kind: 'named',
            title: 'مركز التبليغات',
            onClose: closeBool(s, 'onCloseUnifiedSummonsModal', 'setShowUnifiedSummonsModal'),
        };
    }
    if (s.showPaymentCalculator) {
        return {
            kind: 'named',
            title: 'سداد دفعة',
            onClose: closeBool(s, 'onClosePaymentCalculator', 'setShowPaymentCalculator'),
        };
    }
    if (s.showSettlementCalculator) {
        return {
            kind: 'named',
            title: 'تسوية وتقسيط',
            onClose: closeBool(s, 'onCloseSettlementCalculator', 'setShowSettlementCalculator'),
        };
    }
    if (s.showLedgerModal) {
        return {
            kind: 'named',
            title: 'السجل المالي',
            onClose: closeBool(s, 'onCloseLedgerModal', 'setShowLedgerModal'),
        };
    }
    if (s.showTransferFileNumberChangeModal) {
        return {
            kind: 'named',
            title: 'تغيير رقم الإضبارة',
            onClose: closeBool(
                s,
                'onCloseTransferFileNumberChangeModal',
                'setShowTransferFileNumberChangeModal',
            ),
        };
    }
    if (s.showLinkedDossierTimeline && s.linkedDossierToView) {
        return {
            kind: 'named',
            title: 'السجل الزمني — إضبارة زميل',
            onClose: closeBool(s, 'onCloseLinkedDossierTimeline', 'setShowLinkedDossierTimeline'),
        };
    }
    if (s.showExecutionTrashModal) {
        return {
            kind: 'named',
            title: 'سلة مهملات الإضبارة',
            onClose: closeBool(s, 'onCloseExecutionTrashModal', 'setShowExecutionTrashModal'),
        };
    }
    if (s.timelineEditDraft) {
        return {
            kind: 'named',
            title: 'تعديل الحدث',
            onClose: () => {
                if (typeof s.onCloseTimelineEditModal === 'function') {
                    (s.onCloseTimelineEditModal as () => void)();
                    return;
                }
                closeNull(s, 'setTimelineEditDraft')();
            },
        };
    }
    if (s.showEditDossierMetaModal) {
        return {
            kind: 'named',
            title: 'تعديل بيانات الإضبارة',
            onClose: closeBool(s, 'onCloseEditDossierMetaModal', 'setShowEditDossierMetaModal'),
        };
    }
    if (s.editPartyTarget) {
        return {
            kind: 'named',
            title: 'تعديل الطرف',
            onClose: () => {
                if (typeof s.onCloseEditPartyModal === 'function') {
                    (s.onCloseEditPartyModal as () => void)();
                    return;
                }
                closeNull(s, 'setEditPartyTarget')();
                closeNull(s, 'setPartyEditDraft')();
            },
        };
    }
    if (s.heirsQuickView) {
        return {
            kind: 'named',
            title: 'الورثة',
            onClose: () => {
                if (typeof s.onCloseHeirsQuickViewModal === 'function') {
                    (s.onCloseHeirsQuickViewModal as () => void)();
                    return;
                }
                closeNull(s, 'setHeirsQuickView')();
            },
        };
    }
    if (s.permanentDeleteTimelineId) {
        return {
            kind: 'named',
            title: 'تأكيد الحذف النهائي',
            onClose: () => {
                if (typeof s.onClosePermanentDeleteTimelineConfirm === 'function') {
                    (s.onClosePermanentDeleteTimelineConfirm as () => void)();
                    return;
                }
                closeNull(s, 'setPermanentDeleteTimelineId')();
            },
        };
    }
    if (s.showRealEstateSeizureModal) {
        return {
            kind: 'named',
            title: 'بيانات حجز العقار — بعد موافقة المنفذ',
            onClose: closeBool(s, 'onCloseRealEstateSeizureModal', 'setShowRealEstateSeizureModal'),
        };
    }
    if (s.showGuarantorDetailsModal) {
        return {
            kind: 'named',
            title: 'تفاصيل الكفيل',
            onClose: closeBool(s, 'onCloseGuarantorDetailsModal', 'setShowGuarantorDetailsModal'),
        };
    }
    if (s.showStayOfExecutionModal) {
        return {
            kind: 'named',
            title: 'إيقاف التنفيذ',
            onClose: closeBool(s, 'onCloseStayOfExecutionModal', 'setShowStayOfExecutionModal'),
        };
    }
    if (s.partyDeathModalParty) {
        return {
            kind: 'named',
            title: 'إبلاغ عن الوفاة',
            onClose: () => {
                if (typeof s.onClosePartyDeathModal === 'function') {
                    (s.onClosePartyDeathModal as () => void)();
                    return;
                }
                closeNull(s, 'setPartyDeathModalParty')();
            },
        };
    }
    if (s.showPauseModal) {
        return {
            kind: 'named',
            title: 'إيقاف / استئناف',
            onClose: closeBool(s, 'onClosePauseModal', 'setShowPauseModal'),
        };
    }
    if (s.alimonyBeneficiaryDeathModalOpen) {
        return {
            kind: 'named',
            title: 'وفاة المستفيد من النفقة',
            onClose: closeBool(
                s,
                'onCloseAlimonyBeneficiaryDeathModal',
                'setAlimonyBeneficiaryDeathModalOpen',
            ),
        };
    }
    if (s.showSolidaryCoerciveTargetModal) {
        return {
            kind: 'named',
            title: 'تحديد المطلوب ضده',
            onClose: closeBool(
                s,
                'onCloseSolidaryCoerciveTargetModal',
                'setShowSolidaryCoerciveTargetModal',
            ),
        };
    }
    if (s.showEvictionExpenseModal) {
        return {
            kind: 'named',
            title: 'مصاريف التخلية',
            onClose: closeBool(s, 'onCloseEvictionExpenseModal', 'setShowEvictionExpenseModal'),
        };
    }
    if (s.showEvictionLawyerFeeModal) {
        return {
            kind: 'named',
            title: 'أتعاب المحامي',
            onClose: closeBool(s, 'onCloseEvictionLawyerFeeModal', 'setShowEvictionLawyerFeeModal'),
        };
    }
    if (s.showEvictionResidentialGraceModal) {
        return {
            kind: 'named',
            title: 'مهلة السكن',
            onClose: closeBool(
                s,
                'onCloseEvictionResidentialGraceModal',
                'setShowEvictionResidentialGraceModal',
            ),
        };
    }
    if (s.executorScheduleModalOpen) {
        return {
            kind: 'named',
            title: 'موعد المنفّذ',
            onClose: closeBool(s, 'onCloseExecutorScheduleModal', 'setExecutorScheduleModalOpen'),
        };
    }
    if (s.policeAssistanceModalOpen) {
        return {
            kind: 'named',
            title: 'مؤازرة الشرطة',
            onClose: closeBool(s, 'onClosePoliceAssistanceModal', 'setPoliceAssistanceModalOpen'),
        };
    }
    if (s.breakInventoryFurnitureModalOpen) {
        return {
            kind: 'named',
            title: 'جرد الأثاث',
            onClose: closeBool(
                s,
                'onCloseBreakInventoryFurnitureModal',
                'setBreakInventoryFurnitureModalOpen',
            ),
        };
    }
    if (s.judicialCustodianModalOpen) {
        return {
            kind: 'named',
            title: 'الحارس القضائي',
            onClose: closeBool(s, 'onCloseJudicialCustodianModal', 'setJudicialCustodianModalOpen'),
        };
    }
    if (s.executionReportPrompt) {
        return {
            kind: 'named',
            title: 'تأكيد محضر التنفيذ',
            onClose: closeNull(s, 'setExecutionReportPrompt'),
        };
    }
    if (s.seizedPropertyStepModalOpen) {
        return {
            kind: 'named',
            title: 'تسجيل خطوة العقار المحجوز',
            onClose: closeBool(s, 'onCloseSeizedPropertyStepModal', 'setSeizedPropertyStepModalOpen'),
        };
    }
    if (s.seizedPropertyAuctionResultModalOpen) {
        return {
            kind: 'named',
            title: 'تسجيل نتيجة جلسة المزايدة',
            onClose: closeBool(
                s,
                'onCloseSeizedPropertyAuctionResultModal',
                'setSeizedPropertyAuctionResultModalOpen',
            ),
        };
    }
    if (s.seizureMarkModalOpen) {
        return {
            kind: 'named',
            title: 'تسجيل كتاب تأييد وضع الإشارة',
            onClose: closeBool(s, 'onCloseSeizureMarkModal', 'setSeizureMarkModalOpen'),
        };
    }
    if (s.publicationModalOpen) {
        return {
            kind: 'named',
            title: 'تسجيل بيانات النشر والإعلان',
            onClose: closeBool(s, 'onClosePublicationModal', 'setPublicationModalOpen'),
        };
    }
    return {
        kind: 'named',
        title: 'نافذة الإضبارة',
        onClose: () => undefined,
    };
}
