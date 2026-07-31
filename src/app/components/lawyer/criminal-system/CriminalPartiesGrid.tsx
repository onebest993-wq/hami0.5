import React, { useMemo, useState } from 'react';
import type {
    CrimeType,
    CriminalComplainant,
    CriminalDefendant,
    OurRepresentation,
} from './criminalStore';
import { useCriminalStore } from './criminalStore';
import { ConfirmActionModal } from './ConfirmActionModal';
import {
    getIdentifiedDefendants,
    getUnknownIdentityDefendants,
} from './criminalUnknownDefendant';
import { ComplainantColumn } from './CriminalPartiesGrid/ComplainantColumn';
import { DefendantColumn } from './CriminalPartiesGrid/DefendantColumn';
import { PartyProfileModal } from './CriminalPartiesGrid/PartyProfileModal';
import type { ActiveProfile, DeathConfirmTarget } from './CriminalPartiesGrid/types';

export type CriminalPartiesGridProps = {
    caseId: string;
    complainants: CriminalComplainant[];
    defendants: CriminalDefendant[];
    crimeType: CrimeType | '';
    stage: string;
    isMutualComplaint?: boolean;
    isUnknownPerpetrator: boolean;
    isFrozen: boolean;
    isPrivateRightWaived: boolean;
    waiverDate: string;
    showDetentionIndicators: boolean;
    /** إضبارة سرية — يُرمَّز اسم الحدث في العرض والطباعة. */
    isConfidential?: boolean;
    /** يمنع قوائم حالة المتهم الطافية عند فتح مودالات علوية (قرار ختامي، إلخ). */
    lockPartyMenus?: boolean;
    /** تمثيل المكتب — لإظهار علامة «موكل» على الأطراف المعنيين. */
    ourRepresentation?: OurRepresentation | '';
    canEditPartyNames?: boolean;
    onEditPartyName?: (
        kind: 'complainant' | 'defendant',
        partyId: string,
        snapshot: { fullName: string; phone?: string; address: string },
    ) => void;
};

export const CriminalPartiesGrid = ({
    caseId,
    complainants,
    defendants,
    crimeType,
    stage,
    isMutualComplaint = false,
    isUnknownPerpetrator: _isUnknownPerpetrator,
    isFrozen,
    isPrivateRightWaived,
    waiverDate,
    showDetentionIndicators,
    isConfidential: _isConfidential = false,
    lockPartyMenus = false,
    ourRepresentation = '',
    canEditPartyNames = false,
    onEditPartyName,
}: CriminalPartiesGridProps) => {
    const updateCaseDefendantStatus = useCriminalStore((s) => s.updateCaseDefendantStatus);
    const updateCrossComplainantAccusedStatus = useCriminalStore(
        (s) => s.updateCrossComplainantAccusedStatus,
    );
    const registerPartyDeath = useCriminalStore((s) => s.registerPartyDeath);
    const registerCrossComplainantAccusedDeath = useCriminalStore(
        (s) => s.registerCrossComplainantAccusedDeath,
    );
    /**
     * ⚖️ هل في الإضبارة شكوى متقابلة فعليّاً؟
     *  - case-level: isMutualComplaint === true
     *  - per-complainant: أيّ مشتكٍ يَحمل isCrossComplaint === true
     * هذه الميزات الإضافية (الكفالة / حجز الأموال / تسجيل الوفاة) على بطاقة المشتكي
     * تَظهر حصراً عند توفّر هذا الشرط — لا تُسرَّب لدعاوى عادية.
     */
    const caseHasCrossComplaint = useMemo(
        () =>
            isMutualComplaint ||
            complainants.some((c) => (c as { isCrossComplaint?: boolean }).isCrossComplaint === true),
        [isMutualComplaint, complainants],
    );
    const unknownDefendantsList = useMemo(
        () => getUnknownIdentityDefendants(defendants),
        [defendants],
    );
    const identifiedDefendantsList = useMemo(
        () => getIdentifiedDefendants(defendants),
        [defendants],
    );
    const [activeProfile, setActiveProfile] = useState<ActiveProfile>(null);
    const [deathConfirm, setDeathConfirm] = useState<DeathConfirmTarget>(null);
    /** فتح/إغلاق كاشف المحجوزات لكل متهم — يُتحكَّم عبر العلامة الصغيرة جوار الاسم. */
    const [seizureDisclosureOpen, setSeizureDisclosureOpen] = useState<Record<string, boolean>>({});
    const toggleSeizureDisclosure = (did: string) =>
        setSeizureDisclosureOpen((prev) => ({ ...prev, [did]: !prev[did] }));

    const partyMenusLocked = lockPartyMenus || activeProfile !== null;

    return (
        <div className="max-w-6xl mx-auto w-full px-4 md:px-6">
            {/*
             * 🪟 «مواجهة بَصرية دائمة» (Always Side-by-Side Split View):
             *    - عَمودان دائماً على خَطّ واحد (RTL → المشتكي يَميناً، المتهم يَساراً)،
             *      بِغَضّ النَظَر عَن حَجم الشاشة. هذا السلوك عام:
             *        • سَواء كانت دَعوى عادية أو شَكوى متقابلة.
             *        • سَواء كان طَرف واحد أو تَعدُّد أَطراف.
             *    - الهَدف: تَوفير مَسافة عَمودية وَإِبقاء مسار الإِضبارة والتَبويبات أَعلى الطَيّ.
             *    - الأَيقونات والقَوائم المنسدلة داخل البطاقات مُحَصَّنة سلفاً بِـ flex-wrap
             *      و truncate و whitespace-nowrap و max-w-[9.5rem] لِئلّا تَنكسر مَع
             *      تَقلُّص العَرض على الشاشات الضَيقة.
             */}
            <div className="grid grid-cols-2 gap-4 mb-4 items-start">
                <ComplainantColumn
                    caseId={caseId}
                    complainants={complainants}
                    crimeType={crimeType}
                    stage={stage}
                    isMutualComplaint={isMutualComplaint}
                    isPrivateRightWaived={isPrivateRightWaived}
                    waiverDate={waiverDate}
                    showDetentionIndicators={showDetentionIndicators}
                    isFrozen={isFrozen}
                    lockPartyMenus={lockPartyMenus}
                    partyMenusLocked={partyMenusLocked}
                    ourRepresentation={ourRepresentation}
                    caseHasCrossComplaint={caseHasCrossComplaint}
                    seizureDisclosureOpen={seizureDisclosureOpen}
                    toggleSeizureDisclosure={toggleSeizureDisclosure}
                    setActiveProfile={setActiveProfile}
                    setDeathConfirm={setDeathConfirm}
                    updateCrossComplainantAccusedStatus={updateCrossComplainantAccusedStatus}
                />

                <DefendantColumn
                    caseId={caseId}
                    unknownDefendantsList={unknownDefendantsList}
                    identifiedDefendantsList={identifiedDefendantsList}
                    crimeType={crimeType}
                    stage={stage}
                    isFrozen={isFrozen}
                    lockPartyMenus={lockPartyMenus}
                    partyMenusLocked={partyMenusLocked}
                    showDetentionIndicators={showDetentionIndicators}
                    ourRepresentation={ourRepresentation}
                    caseHasCrossComplaint={caseHasCrossComplaint}
                    seizureDisclosureOpen={seizureDisclosureOpen}
                    toggleSeizureDisclosure={toggleSeizureDisclosure}
                    setActiveProfile={setActiveProfile}
                    setDeathConfirm={setDeathConfirm}
                    updateCaseDefendantStatus={updateCaseDefendantStatus}
                />
            </div>

            {activeProfile ? (
                <PartyProfileModal
                    activeProfile={activeProfile}
                    isMutualComplaint={isMutualComplaint}
                    ourRepresentation={ourRepresentation}
                    canEditPartyNames={canEditPartyNames}
                    onEditPartyName={onEditPartyName}
                    onClose={() => setActiveProfile(null)}
                />
            ) : null}

            <ConfirmActionModal
                open={Boolean(deathConfirm)}
                danger
                title="⚠️ تأكيد الوفاة"
                message={(() => {
                    if (!deathConfirm) return '';
                    const isCrossComplainantDeath = deathConfirm.defendantId.startsWith('complainant:');
                    if (isCrossComplainantDeath) {
                        return `هل تؤكد تسجيل وفاة المشتكي «${deathConfirm.displayName}»؟ سَتسقط الدعوى الفرعية بحقّه (شكوى متقابلة) مع إبقاء الإضبارة نشطة لِسائر الأطراف. لا يمكن التراجع عن هذا الإجراء.`;
                    }
                    return `هل تؤكد تسجيل وفاة المتهم «${deathConfirm.displayName}»؟ سيتم سقوط الدعوى بحقه (وفاة) مع إبقاء الإضبارة نشطة لباقي الأطراف. لا يمكن التراجع عن هذا الإجراء.`;
                })()}
                confirmText="نعم — تأكيد الوفاة"
                cancelText="إلغاء"
                onCancel={() => setDeathConfirm(null)}
                onConfirm={() => {
                    if (!deathConfirm) return;
                    /**
                     * 🧭 توجيه الـ store حسب نوع الكائن:
                     *  - مُعرّف يَبدأ بـ "complainant:" → مشتكي متقابل → registerCrossComplainantAccusedDeath
                     *  - وإلا → متهم أصلي → registerPartyDeath
                     */
                    const raw = deathConfirm.defendantId;
                    if (raw.startsWith('complainant:')) {
                        registerCrossComplainantAccusedDeath(caseId, raw.slice('complainant:'.length));
                    } else {
                        registerPartyDeath(caseId, raw);
                    }
                    setDeathConfirm(null);
                    setActiveProfile(null);
                }}
            />
        </div>
    );
};
