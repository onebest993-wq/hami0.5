import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type {
    CrimeType,
    CriminalComplainant,
    CriminalDefendant,
    DefendantAgeCategory,
    DefendantStatus,
    OurRepresentation,
    SeizedAsset,
} from './criminalStore';
import { isGuarantorForfeited, normalizeGuarantorDetails, useCriminalStore } from './criminalStore';
import { ConfirmActionModal } from './ConfirmActionModal';
import { CriminalModalPortal, CRIMINAL_MODAL_Z } from './criminalModalPortal';
import {
    defaultPersonalStage,
} from './partyPersonalStage';
import {
    formatDefendantStatusShortLabel,
    getDefendantStatusButtonClass,
    getDefendantStatusSelectOptions,
    isInvestigationStoredStage,
} from './criminalStageUtils';
import {
    resolveComplainantOfficeClientMark,
    resolveDefendantOfficeClientMark,
} from './criminalOfficeClient';
import { formatJuvenileInvestigationDetentionDashboardStatus } from './juvenileInvestigationRules';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';

const DEFENDANT_STATUS_MENU_TITLE = 'تغيير حالة المتهم القانونية';

const PARTY_COLUMN_SHELL_CLASS =
    'self-start w-full rounded-xl border backdrop-blur-sm p-3 flex flex-col items-start shadow-lg shadow-black/30';

const COMPLAINANT_COLUMN_CLASS = `${PARTY_COLUMN_SHELL_CLASS} border-emerald-500/25 bg-emerald-950/[0.12]`;
const DEFENDANT_COLUMN_CLASS = `${PARTY_COLUMN_SHELL_CLASS} border-sky-500/25 bg-sky-950/[0.12]`;

const PARTY_NAME_BUTTON_CLASS =
    'text-right text-2xl font-black text-white truncate hover:text-[#E6C673] transition min-w-0 max-w-full block leading-tight';

/** إطار البطاقة الداخلية — موحّد دائماً بين عمودي المشتكي والمتهم (تصميم فقط). */
function partyInnerCardClass(isDeathLocked: boolean): string {
    if (isDeathLocked) {
        return 'rounded-md border border-red-950/60 bg-red-950/20 ring-1 ring-red-900/35 px-2.5 py-2 flex flex-col items-start pointer-events-none opacity-75 w-full';
    }
    return 'rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 flex flex-col items-start w-full';
}

import {
    getIdentifiedDefendants,
    getUnknownIdentityDefendants,
    resolveDefendantFullName,
} from './criminalUnknownDefendant';

function JuvenileGuardianInline({ name }: { name: string }) {
    return (
        <div className="flex items-center gap-1.5 min-w-0 w-full overflow-hidden leading-none">
            <span className="shrink-0 text-[11px] font-bold text-white/50 whitespace-nowrap">
                الوصي القانوني:
            </span>
            <span className="truncate text-[14px] font-black text-white/90 min-w-0" title={name}>
                {name}
            </span>
        </div>
    );
}

function ageCategoryPillClass(active: boolean, disabled?: boolean): string {
    const base =
        'rounded-full border px-2 py-0.5 text-[10px] font-black whitespace-nowrap transition disabled:opacity-45 disabled:cursor-not-allowed';
    if (active) {
        return `${base} border-emerald-500/45 bg-emerald-500/15 text-emerald-100`;
    }
    return `${base} border-white/15 bg-white/[0.03] text-white/65 hover:border-white/25 hover:text-white/85`;
}

const REVEAL_INPUT =
    'w-full bg-[#0B1021] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#E6C673]/60 disabled:opacity-50';

function UnderSevenPartyBadge({ inline = false }: { inline?: boolean }) {
    return (
        <span
            className={`inline-flex shrink-0 rounded-full border border-amber-300/55 bg-amber-400/15 px-2 py-0.5 text-[10px] font-black text-amber-100 whitespace-nowrap ${
                inline ? '' : 'mt-1'
            }`}
        >
            دون 7 سنوات
        </span>
    );
}

function defendantRevealNameLabel(stage: string, category: DefendantAgeCategory): string {
    if (category === 'under_seven') return 'اسم الصغير';
    if (category === 'juvenile') {
        return isInvestigationStoredStage(stage) ? 'اسم المشكو منه - حدث' : 'اسم المتهم - حدث';
    }
    return 'الاسم الكامل';
}

function defendantPartyRoleLabel(stage: string, isJuvenile: boolean, isUnderSeven: boolean): string | null {
    if (isUnderSeven) return 'صغير دون 7 سنوات';
    if (!isJuvenile) return null;
    return isInvestigationStoredStage(stage) ? 'المشكو منه - حدث' : 'المتهم - حدث';
}

function DefendantMinorDetailFields({
    guardianName,
    guardianRelationship,
    onGuardianName,
    onGuardianRelationship,
    showUnderSevenNotice,
    disabled,
}: {
    guardianName: string;
    guardianRelationship: string;
    onGuardianName: (v: string) => void;
    onGuardianRelationship: (v: string) => void;
    showUnderSevenNotice?: boolean;
    disabled?: boolean;
}) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 space-y-2">
            {showUnderSevenNotice ? (
                <div className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-200/95 leading-relaxed">
                    تنبيه: انعدام المسؤولية الجزائية لعدم إكمال السن القانوني م/47 رعاية أحداث
                </div>
            ) : null}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="sm:col-span-2">
                    <label className="text-white/70 text-xs font-bold mb-1 block">
                        اسم ولي الأمر أو الوصي القانوني
                    </label>
                    <input
                        className={REVEAL_INPUT}
                        value={guardianName}
                        disabled={disabled}
                        onChange={(e) => onGuardianName(e.target.value)}
                    />
                </div>
                <div className="sm:col-span-2">
                    <label className="text-white/70 text-xs font-bold mb-1 block">صلة قرابة الوصي</label>
                    <input
                        className={REVEAL_INPUT}
                        value={guardianRelationship}
                        disabled={disabled}
                        placeholder="أب / أم / عم ..."
                        onChange={(e) => onGuardianRelationship(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}

function AgeCategoryPicker({
    category,
    onChange,
    disabled,
}: {
    category: DefendantAgeCategory;
    onChange: (next: DefendantAgeCategory) => void;
    disabled?: boolean;
}) {
    const juvenileActive = category === 'juvenile';
    const underSevenActive = category === 'under_seven';

    return (
        <div className="flex flex-wrap items-center gap-1.5 w-full">
            <button
                type="button"
                disabled={disabled}
                aria-pressed={underSevenActive}
                onClick={() => onChange(underSevenActive ? 'adult' : 'under_seven')}
                className={ageCategoryPillClass(underSevenActive, disabled)}
            >
                أقل من 7 سنوات
            </button>
            <button
                type="button"
                disabled={disabled}
                aria-pressed={juvenileActive}
                onClick={() => onChange(juvenileActive ? 'adult' : 'juvenile')}
                className={ageCategoryPillClass(juvenileActive, disabled)}
            >
                حدث (أقل من 18)
            </button>
        </div>
    );
}

function UnknownDefendantRevealCard({
    caseId,
    defendant,
    disabled,
    crimeType,
    stage,
}: {
    caseId: string;
    defendant: CriminalDefendant;
    disabled?: boolean;
    crimeType: CrimeType | '';
    stage: string;
}) {
    const revealDefendantIdentity = useCriminalStore((s) => s.revealDefendantIdentity);
    const [open, setOpen] = useState(false);
    const [fullName, setFullName] = useState('');
    const [address, setAddress] = useState('');
    const [ageCategory, setAgeCategory] = useState<DefendantAgeCategory>('adult');
    const [guardianName, setGuardianName] = useState('');
    const [guardianRelationship, setGuardianRelationship] = useState('');
    const [status, setStatus] = useState<DefendantStatus | ''>('');
    const [error, setError] = useState('');

    const revealIsJuvenile = ageCategory === 'juvenile';
    const revealIsUnderSeven = ageCategory === 'under_seven';
    const revealIsMinor = revealIsJuvenile || revealIsUnderSeven;

    const statusOptions = getDefendantStatusSelectOptions({
        isJuvenile: revealIsJuvenile,
        crimeType,
        stage,
        currentStatus: status,
    });

    const resetRevealForm = () => {
        setFullName('');
        setAddress('');
        setAgeCategory('adult');
        setGuardianName('');
        setGuardianRelationship('');
        setStatus('');
        setError('');
    };

    const submitReveal = () => {
        const err = revealDefendantIdentity(caseId, defendant.id, {
            fullName,
            address,
            status: revealIsUnderSeven ? '' : status || undefined,
            isJuvenile: revealIsJuvenile,
            isUnderSeven: revealIsUnderSeven,
            guardianName: revealIsMinor ? guardianName : undefined,
            guardianRelationship: revealIsMinor ? guardianRelationship : undefined,
        });
        if (err) {
            setError(err);
            return;
        }
        setOpen(false);
        setError('');
    };

    return (
        <div className="rounded-md border border-red-500/30 bg-red-900/15 px-2.5 py-2 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-red-100 font-black text-sm whitespace-normal break-words">
                    {defendant.fullName}
                </span>
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                        setOpen((prev) => {
                            const next = !prev;
                            if (next) {
                                resetRevealForm();
                            }
                            return next;
                        });
                    }}
                    className="rounded-lg border border-[#E6C673]/40 bg-[#E6C673]/15 px-2.5 py-1 text-[11px] font-black text-[#E6C673] hover:bg-[#E6C673]/25 disabled:opacity-45 disabled:cursor-not-allowed"
                >
                    {open ? 'إلغاء' : 'كشف الهوية'}
                </button>
            </div>
            {open ? (
                <div className="space-y-2 pt-1 border-t border-red-500/20">
                    {error ? (
                        <p className="text-red-300 text-xs font-bold whitespace-normal break-words">{error}</p>
                    ) : null}
                    <div>
                        <label className="text-white/70 text-xs font-bold mb-1 block">
                            {defendantRevealNameLabel(stage, ageCategory)}
                        </label>
                        <input
                            className={REVEAL_INPUT}
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="اسم المشكو منه بعد التعرف"
                        />
                    </div>
                    <div>
                        <label className="text-white/70 text-xs font-bold mb-1 block">العنوان</label>
                        <input
                            className={REVEAL_INPUT}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-white/70 text-xs font-bold mb-1 block">الفئة العمرية</label>
                        <AgeCategoryPicker
                            category={ageCategory}
                            onChange={(next) => {
                                setAgeCategory(next);
                                if (next === 'adult') {
                                    setGuardianName('');
                                    setGuardianRelationship('');
                                    setStatus('');
                                } else if (next === 'under_seven') {
                                    setStatus('');
                                }
                            }}
                            disabled={disabled}
                        />
                    </div>
                    {revealIsMinor ? (
                        <DefendantMinorDetailFields
                            guardianName={guardianName}
                            guardianRelationship={guardianRelationship}
                            onGuardianName={setGuardianName}
                            onGuardianRelationship={setGuardianRelationship}
                            showUnderSevenNotice={revealIsUnderSeven}
                            disabled={disabled}
                        />
                    ) : null}
                    {!revealIsUnderSeven ? (
                    <div>
                        <label className="text-white/70 text-xs font-bold mb-1 block">
                            {DEFENDANT_STATUS_MENU_TITLE}
                        </label>
                        <select
                            className={REVEAL_INPUT}
                            value={status}
                            onChange={(e) => setStatus(e.target.value as DefendantStatus | '')}
                        >
                            <option value="" className="bg-[#0B1021]">
                                اختر...
                            </option>
                            {statusOptions.map((opt) => (
                                <option key={opt.value} value={opt.value} className="bg-[#0B1021]">
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    ) : null}
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={submitReveal}
                        className="w-full rounded-lg border border-emerald-500/35 bg-emerald-500/15 py-2 text-sm font-black text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-45"
                    >
                        تأكيد كشف الهوية
                    </button>
                </div>
            ) : null}
        </div>
    );
}

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

function ProfileReadOnlyField({
    label,
    value,
    muted = false,
}: {
    label: string;
    value: string;
    muted?: boolean;
}) {
    return (
        <div className="rounded-xl border border-slate-700/80 bg-slate-800/25 px-3 py-2.5 text-right">
            <div className="text-white/55 text-xs font-black mb-1 text-right whitespace-normal break-words">
                {label}
            </div>
            <div
                className={`text-sm font-bold whitespace-normal break-words leading-relaxed ${
                    muted ? 'text-white/40' : 'text-white'
                }`}
            >
                {value}
            </div>
        </div>
    );
}

/**
 * شارات استثناءات الطرف على بطاقته (موكل المكتب…).
 * «الحدث» يُعرَض عبر سطر الدور «المشكو منه - حدث» وليس شارة منفصلة.
 */
function OfficeClientBadge({ inline = false }: { inline?: boolean }) {
    return (
        <span
            className={`inline-flex shrink-0 rounded-full border border-[#E6C673]/50 bg-[#E6C673]/15 px-2 py-0.5 text-[10px] font-black text-[#E6C673] whitespace-nowrap ${
                inline ? '' : 'mt-1'
            }`}
            title="موكل المكتب"
        >
            ⚖️ موكل
        </span>
    );
}

/**
 * علامة «📦 N» الصغيرة جوار اسم المتهم — تُفتح/تُغلق الكاشف.
 */
function SeizedAssetsInlineMark({
    count,
    expanded,
    onToggle,
}: {
    count: number;
    expanded: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-black whitespace-nowrap transition ${
                expanded
                    ? 'border-amber-400/60 bg-amber-500/20 text-amber-50'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15'
            }`}
            aria-expanded={expanded}
            title={expanded ? 'إخفاء قائمة المحجوزات' : 'عرض قائمة المحجوزات'}
        >
            📦 {count}
        </button>
    );
}

/**
 * جسم الكاشف — لائحة الأصناف مع التعديل، فكّ حجز فردي/جماعي.
 * يُرسَم تحت بطاقة الطرف (متهم أو مشتكي متقابل) عند فتح العلامة.
 * يَختار الـ store-actions المناسبة حسب `kind` (defendant | complainant).
 */
function PartySeizedAssetsDisclosure({
    caseId,
    partyId,
    partyName,
    assets,
    disabled,
    kind,
}: {
    caseId: string;
    partyId: string;
    partyName: string;
    assets: SeizedAsset[];
    disabled?: boolean;
    /** نوع الطرف: متهم أصلي أو مشتكي متقابل (يَنعكس على الـ store-actions المُختارة). */
    kind: 'defendant' | 'complainant';
}) {
    const updateDefendantSeizedAsset = useCriminalStore((s) => s.updateDefendantSeizedAsset);
    const releaseDefendantSeizedAssets = useCriminalStore((s) => s.releaseDefendantSeizedAssets);
    const updateCrossComplainantSeizedAsset = useCriminalStore(
        (s) => s.updateCrossComplainantSeizedAsset,
    );
    const releaseCrossComplainantSeizedAssets = useCriminalStore(
        (s) => s.releaseCrossComplainantSeizedAssets,
    );
    const updateAsset = kind === 'defendant'
        ? updateDefendantSeizedAsset
        : updateCrossComplainantSeizedAsset;
    const releaseAssets = kind === 'defendant'
        ? releaseDefendantSeizedAssets
        : releaseCrossComplainantSeizedAssets;

    const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
    const [editDescription, setEditDescription] = useState('');
    const [confirmReleaseAll, setConfirmReleaseAll] = useState(false);
    const [pendingReleaseId, setPendingReleaseId] = useState<string | null>(null);

    const startEdit = (a: SeizedAsset) => {
        setEditingAssetId(a.id);
        setEditDescription(a.description ?? '');
    };

    const cancelEdit = () => {
        setEditingAssetId(null);
        setEditDescription('');
    };

    const saveEdit = () => {
        if (!editingAssetId) return;
        const description = editDescription.trim();
        if (!description) return;
        updateAsset(caseId, partyId, editingAssetId, { description });
        cancelEdit();
    };

    const partyLabel = kind === 'defendant' ? 'المتهم' : 'المشتكي';

    return (
        <div
            id={`seized-assets-${partyId}`}
            className="mt-1.5 w-full rounded-md border border-amber-500/30 bg-amber-950/15 p-2 space-y-1.5"
        >
            {!disabled ? (
                <div className="flex items-center justify-end">
                    <button
                        type="button"
                        onClick={() => setConfirmReleaseAll(true)}
                        className="rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-100 hover:bg-emerald-500/20 transition whitespace-nowrap"
                        title="فكّ الحجز عن كل الأموال"
                    >
                        ↩ فك الحجز عن الكل
                    </button>
                </div>
            ) : null}
            <ul className="space-y-1.5 m-0 p-0 list-none">
                {assets.map((a) => {
                    const isEditing = editingAssetId === a.id;
                    if (isEditing) {
                        return (
                            <li
                                key={a.id}
                                className="rounded-md border border-amber-500/30 bg-slate-900/60 p-2 space-y-1.5"
                            >
                                <input
                                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-[11px] text-white outline-none focus:border-[#E6C673]/60"
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    placeholder="وصف المال"
                                />
                                <div className="flex items-center justify-end gap-1.5">
                                    <button
                                        type="button"
                                        onClick={cancelEdit}
                                        className="rounded-md border border-slate-600/60 bg-slate-800/40 px-2 py-0.5 text-[10px] font-black text-white/75 hover:text-white transition"
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        type="button"
                                        onClick={saveEdit}
                                        disabled={editDescription.trim().length === 0}
                                        className="rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-100 hover:bg-amber-500/25 transition disabled:opacity-40"
                                    >
                                        حفظ
                                    </button>
                                </div>
                            </li>
                        );
                    }
                    return (
                        <li
                            key={a.id}
                            className="rounded-md border border-slate-700/60 bg-slate-900/40 px-2 py-1.5 flex items-start justify-between gap-2"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="text-[11px] font-black text-white whitespace-normal break-words">
                                    {String(a.description ?? '').trim() || '—'}
                                </div>
                            </div>
                            {!disabled ? (
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => startEdit(a)}
                                        className="rounded-md border border-slate-600/60 bg-slate-800/40 px-1.5 py-0.5 text-[10px] font-black text-white/80 hover:text-white hover:border-amber-500/45 transition"
                                        title="تعديل الصنف"
                                        aria-label="تعديل الصنف"
                                    >
                                        ✏
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPendingReleaseId(a.id)}
                                        className="rounded-md border border-emerald-500/35 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-black text-emerald-100 hover:bg-emerald-500/20 transition"
                                        title="فكّ الحجز عن هذا الصنف"
                                        aria-label="فكّ الحجز عن هذا الصنف"
                                    >
                                        ↩
                                    </button>
                                </div>
                            ) : null}
                        </li>
                    );
                })}
            </ul>

            <ConfirmActionModal
                open={confirmReleaseAll}
                title="تأكيد فكّ الحجز الجماعي"
                message={`سيُفكّ الحجز عن جميع الأموال (${assets.length}) لِـ ${partyLabel}: ${partyName}. لا يمكن التراجع.`}
                confirmText="فكّ الحجز عن الكل"
                cancelText="إلغاء"
                onConfirm={() => {
                    releaseAssets(caseId, partyId);
                    setConfirmReleaseAll(false);
                }}
                onCancel={() => setConfirmReleaseAll(false)}
            />

            <ConfirmActionModal
                open={pendingReleaseId !== null}
                title="تأكيد فكّ الحجز"
                message="سيُفكّ الحجز عن هذا الصنف ولا يمكن التراجع. متابعة؟"
                confirmText="فكّ الحجز"
                cancelText="إلغاء"
                onConfirm={() => {
                    if (pendingReleaseId) {
                        releaseAssets(caseId, partyId, [pendingReleaseId]);
                    }
                    setPendingReleaseId(null);
                }}
                onCancel={() => setPendingReleaseId(null)}
            />
        </div>
    );
}

export const CriminalPartiesGrid = ({
    caseId,
    complainants,
    defendants,
    crimeType,
    stage,
    isMutualComplaint = false,
    isUnknownPerpetrator,
    isFrozen,
    isPrivateRightWaived,
    waiverDate,
    showDetentionIndicators,
    isConfidential = false,
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
    const safeTrim = (v: unknown) => String(v ?? '').trim();
    const [activeProfile, setActiveProfile] = useState<
        | { kind: 'complainant'; data: CriminalComplainant }
        | { kind: 'defendant'; data: CriminalDefendant }
        | null
    >(null);
    const [deathConfirm, setDeathConfirm] = useState<{ defendantId: string; displayName: string } | null>(
        null,
    );
    /** فتح/إغلاق كاشف المحجوزات لكل متهم — يُتحكَّم عبر العلامة الصغيرة جوار الاسم. */
    const [seizureDisclosureOpen, setSeizureDisclosureOpen] = useState<Record<string, boolean>>({});
    const toggleSeizureDisclosure = (did: string) =>
        setSeizureDisclosureOpen((prev) => ({ ...prev, [did]: !prev[did] }));

    const partyMenusLocked = lockPartyMenus || activeProfile !== null;

    const defendantStatusDisplayLabel = (
        status: string,
        row?: { isJuvenile?: boolean; detentionAuthority?: string },
    ) => {
        const juvenileLabel = row
            ? formatJuvenileInvestigationDetentionDashboardStatus(status, {
                  isJuvenile: Boolean(row.isJuvenile),
                  detentionAuthority: row.detentionAuthority,
              })
            : null;
        if (juvenileLabel) return juvenileLabel;
        const base = formatDefendantStatusShortLabel(status);
        if (!base || base === '—') return 'اختر الحالة';
        if (status === 'bailed_pending_appeal') return `⏳ ${base}`;
        if (status === 'psychiatric_eval') return `🧠 ${base}`;
        return base;
    };

    /** لوحة المحامي الخاصة — الأسماء الرباعية كاملة دون ترميز. */
    const partyDisplayName = (fullName: string, _isJuvenile?: boolean) =>
        String(fullName ?? '').trim() || '—';

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
                <div
                    className={`${COMPLAINANT_COLUMN_CLASS} ${
                        isPrivateRightWaived ? 'bg-emerald-950/25' : ''
                    }`}
                >
                    <div className="w-full flex items-center justify-start mb-1 pb-1 border-b border-emerald-500/20">
                        <div className="inline-flex items-center text-sm font-black text-emerald-200/85 leading-none whitespace-nowrap">
                            {/*
                             * ⚖️ في حالة الشكوى المتقابلة (case-level أو per-complainant) تتداخل الصفات
                             *    على نفس الأشخاص، فنُحدِّث عنوان العمود إلى «مشتكي/متهم» لكي يَعكس
                             *    ازدواجية الصفة بدقة قانونية. تَبقى التسمية الافتراضية «المشتكي» في
                             *    سائر الحالات لمنع تَسريب المُفهوم إلى دعاوى عادية.
                             */}
                            <span>{caseHasCrossComplaint ? 'المشتكي/المتهم' : 'المشتكي'}</span>
                        </div>
                    </div>
                    {isPrivateRightWaived ? (
                        <div className="w-full rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-emerald-200 font-bold text-[11px] whitespace-normal break-words mb-2">
                            أسقط حقه الشخصي بتاريخ {waiverDate || '—'} — الدعوى مستمرة للحق العام
                        </div>
                    ) : null}
                    <div className="space-y-1.5 w-full">
                        {complainants.length ? (
                            complainants.map((c) => {
                                // ⚖️ شكوى متقابلة: المشتكي يَكتسب صفة المتهم على مستوى الكيس
                                //    أو على مستوى المشتكي الفردي (per-complainant flag).
                                const isAccusedToo =
                                    isMutualComplaint || (c as any).isCrossComplaint === true;
                                const isJuvenileComplainant = Boolean((c as any).isJuvenile);
                                const legalGuardianName = safeTrim((c as any).guardianName);
                                const accusedStatusValue = String((c as any).accusedStatus ?? '').trim();
                                const accusedDetentionAuthority = safeTrim(
                                    (c as any).accusedDetentionAuthority,
                                );
                                const accusedDetentionExpiryDate = safeTrim(
                                    (c as any).accusedDetentionExpiryDate,
                                );
                                const accusedStatusLabel = defendantStatusDisplayLabel(
                                    accusedStatusValue,
                                    {
                                        isJuvenile: isJuvenileComplainant,
                                        detentionAuthority: accusedDetentionAuthority,
                                    },
                                );
                                const accusedStatusOptions = isAccusedToo
                                    ? getDefendantStatusSelectOptions({
                                          isJuvenile: isJuvenileComplainant,
                                          crimeType,
                                          stage,
                                          currentStatus: (accusedStatusValue || '') as DefendantStatus | '',
                                      })
                                    : [];
                                const showAccusedDetentionAuthority =
                                    accusedStatusValue === 'موقوف' ||
                                    accusedStatusValue === 'ملقى القبض عليه' ||
                                    accusedStatusValue === 'juvenile_detention';
                                const showAccusedDetentionExpiry =
                                    showDetentionIndicators && showAccusedDetentionAuthority;
                                const accusedDetentionDaysLeft = (() => {
                                    if (!accusedDetentionExpiryDate) return null;
                                    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
                                        accusedDetentionExpiryDate,
                                    );
                                    if (!m) return null;
                                    const expMs = Date.UTC(
                                        Number(m[1]),
                                        Number(m[2]) - 1,
                                        Number(m[3]),
                                    );
                                    const now = new Date();
                                    const todayMs = Date.UTC(
                                        now.getFullYear(),
                                        now.getMonth(),
                                        now.getDate(),
                                    );
                                    const diff = expMs - todayMs;
                                    return Math.ceil(diff / (1000 * 60 * 60 * 24));
                                })();
                                /**
                                 * 🛡️ تَفاصيل الكفالة على المشتكي المتقابل (مرآة لِبطاقة المتهم).
                                 * تَستخدم نفس النَورمالايزر العام `normalizeGuarantorDetails`.
                                 */
                                const accusedGuarantor = isAccusedToo
                                    ? normalizeGuarantorDetails((c as any).accusedGuarantorDetails)
                                    : null;
                                const accusedBailAmount = safeTrim(accusedGuarantor?.bailAmount);
                                const accusedGuarantorInfo = safeTrim(accusedGuarantor?.guarantorInfo);
                                const accusedHasGuarantorData = Boolean(
                                    accusedBailAmount || accusedGuarantorInfo,
                                );
                                const accusedIsForfeited = isGuarantorForfeited(accusedGuarantor);
                                /**
                                 * 📦 محجوزات الأموال على المشتكي المتقابل — تَظهر فقط عند تَفعيل
                                 *    الشكوى المتقابلة، وعند توفّر سَجلٍّ في `accusedSeizedAssets`.
                                 */
                                const accusedSeizedAssets =
                                    isAccusedToo && Array.isArray((c as any).accusedSeizedAssets)
                                        ? ((c as any).accusedSeizedAssets as SeizedAsset[])
                                        : [];
                                /**
                                 * 💀 قُفل سجل المشتكي بصفته متهماً — لحماية البطاقة بعد توثيق الوفاة.
                                 */
                                const accusedDeathLocked =
                                    isAccusedToo &&
                                    (Boolean((c as any).accusedIsPartyRecordLocked) ||
                                        (c as any).accusedPersonalStage === 'lawsuit_dropped_death');
                                const displayName = partyDisplayName(
                                    safeTrim((c as any).fullName) || '—',
                                    Boolean((c as any).isJuvenile),
                                );
                                const isOfficeClient = resolveComplainantOfficeClientMark(c, ourRepresentation);
                                return (
                                    /*
                                     * 🪜 «البِطاقة داخل البِطاقة» تَظهَر فَقَط عَند الحاجة:
                                     *    - كُلّ صَفّ داخل إِطار زُجاجي خَفيف (موحّد مع عمود المتهم)
                                     *      البَصري بَين الأَطراف.
                                     *    - حالة قُفل الوَفاة → تَحتَفظ بِإِطارها الأَحمَر السيادي
                                     *      بِغَضّ النَظَر عَن العَدَد، لِأَنّها حَدَث قانوني يَجب
                                     *      تَمييزه عَلى الطَرف المُحَدَّد دائماً.
                                     */
                                    <div
                                        key={c.id}
                                        className={partyInnerCardClass(accusedDeathLocked)}
                                    >
                                        <div className="w-full flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1 overflow-hidden">
                                                <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setActiveProfile({ kind: 'complainant', data: c })
                                                        }
                                                        className={`${PARTY_NAME_BUTTON_CLASS} flex-1`}
                                                    >
                                                        {displayName}
                                                    </button>
                                                    {isOfficeClient ? <OfficeClientBadge inline /> : null}
                                                    {accusedSeizedAssets.length > 0 ? (
                                                        <SeizedAssetsInlineMark
                                                            count={accusedSeizedAssets.length}
                                                            expanded={Boolean(seizureDisclosureOpen[c.id])}
                                                            onToggle={() => toggleSeizureDisclosure(c.id)}
                                                        />
                                                    ) : null}
                                                </div>
                                                {isJuvenileComplainant ? (
                                                    legalGuardianName ? (
                                                        <div className="mt-0.5 w-full min-w-0">
                                                            <JuvenileGuardianInline name={legalGuardianName} />
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex max-w-full rounded-full border border-red-500/45 bg-red-500/15 px-2 py-0.5 text-[10px] font-black text-red-200 whitespace-nowrap overflow-hidden">
                                                            ولي الأمر / الوصي القانوني — إلزامي
                                                        </div>
                                                    )
                                                ) : null}
                                                {accusedDeathLocked ? (
                                                    <div className="text-[10px] font-black text-red-200/90 whitespace-normal break-words">
                                                        🔒 سجل مغلق — سقوط الدعوى الفرعية لوفاة المشتكي
                                                    </div>
                                                ) : null}
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {isAccusedToo ? (
                                                    <DropdownMenu
                                                        modal={false}
                                                        onOpenChange={(open) => {
                                                            if (open) setActiveProfile(null);
                                                        }}
                                                    >
                                                        <DropdownMenuTrigger asChild>
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    isFrozen ||
                                                                    partyMenusLocked ||
                                                                    accusedDeathLocked
                                                                }
                                                                title={
                                                                    accusedDeathLocked
                                                                        ? 'السجل مغلق — لا يمكن تعديل الحالة'
                                                                        : DEFENDANT_STATUS_MENU_TITLE
                                                                }
                                                                className={`inline-flex max-w-[9.5rem] items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black whitespace-nowrap transition hover:brightness-110 disabled:opacity-45 disabled:cursor-not-allowed data-[state=open]:ring-1 data-[state=open]:ring-[#E6C673]/40 ${getDefendantStatusButtonClass(
                                                                    accusedStatusValue,
                                                                )}`}
                                                            >
                                                                <span className="truncate">
                                                                    {accusedStatusLabel}
                                                                </span>
                                                                {!isFrozen &&
                                                                !partyMenusLocked &&
                                                                !accusedDeathLocked ? (
                                                                    <ChevronDown className="h-3 w-3 shrink-0 opacity-80" />
                                                                ) : null}
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent
                                                            align="end"
                                                            sideOffset={6}
                                                            collisionPadding={12}
                                                            className="z-[300] min-w-[15rem] max-h-[min(60vh,320px)] overflow-y-auto border border-slate-600 bg-slate-900 text-white font-['Tajawal'] shadow-xl shadow-black/40 p-1"
                                                        >
                                                            {isFrozen || partyMenusLocked || accusedDeathLocked ? (
                                                                <div className="px-3 py-2 text-xs font-bold text-white/50 whitespace-normal break-words">
                                                                    {accusedDeathLocked
                                                                        ? 'السجل مغلق — لا يمكن تعديل الحالة'
                                                                        : 'غير متاح أثناء فتح نافذة أخرى'}
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <DropdownMenuLabel className="px-3 py-2 text-[11px] font-black text-[#E6C673]/90 whitespace-normal break-words leading-relaxed">
                                                                        {DEFENDANT_STATUS_MENU_TITLE}
                                                                    </DropdownMenuLabel>
                                                                    <DropdownMenuSeparator className="bg-slate-700/80" />
                                                                    <DropdownMenuItem
                                                                        onClick={() => {
                                                                            setDeathConfirm({
                                                                                defendantId: `complainant:${c.id}`,
                                                                                displayName,
                                                                            });
                                                                        }}
                                                                        className="cursor-pointer text-sm font-black text-red-200 focus:bg-red-950/40 focus:text-red-100"
                                                                    >
                                                                        💀 تسجيل وفاة المشتكي/المتهم
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator className="bg-slate-700/80" />
                                                                    {accusedStatusOptions.length ? (
                                                                        accusedStatusOptions.map((opt) => (
                                                                            <DropdownMenuItem
                                                                                key={opt.value}
                                                                                onClick={() => {
                                                                                    updateCrossComplainantAccusedStatus(
                                                                                        caseId,
                                                                                        c.id,
                                                                                        opt.value,
                                                                                    );
                                                                                }}
                                                                                className={`cursor-pointer text-sm font-bold focus:bg-slate-800 focus:text-white ${
                                                                                    accusedStatusValue === opt.value ||
                                                                                    (opt.value === 'juvenile_detention' &&
                                                                                        (accusedStatusValue === 'موقوف' ||
                                                                                            accusedStatusValue ===
                                                                                                'ملقى القبض عليه'))
                                                                                        ? 'bg-slate-800/80 text-[#E6C673]'
                                                                                        : ''
                                                                                }`}
                                                                            >
                                                                                {opt.label}
                                                                            </DropdownMenuItem>
                                                                        ))
                                                                    ) : (
                                                                        <div className="px-3 py-2 text-xs font-bold text-white/50">
                                                                            لا توجد حالات متاحة
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                ) : null}
                                            </div>
                                        </div>
                                        {accusedHasGuarantorData && accusedIsForfeited ? (
                                            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-black text-red-200 whitespace-nowrap">
                                                ⛔ مصادَرة الكفالة
                                            </div>
                                        ) : null}
                                        {accusedSeizedAssets.length > 0 && seizureDisclosureOpen[c.id] ? (
                                            <PartySeizedAssetsDisclosure
                                                caseId={caseId}
                                                partyId={c.id}
                                                partyName={displayName}
                                                assets={accusedSeizedAssets}
                                                disabled={isFrozen || lockPartyMenus || accusedDeathLocked}
                                                kind="complainant"
                                            />
                                        ) : null}
                                        {showAccusedDetentionExpiry &&
                                        accusedDetentionDaysLeft !== null &&
                                        accusedDetentionDaysLeft <= 3 ? (
                                            <div className="mt-1.5 w-full rounded-md bg-red-900/20 border border-red-500/40 px-2.5 py-1.5 text-red-200 font-black text-[10px] whitespace-normal break-words animate-pulse">
                                                ⚠️ التوقيف ينتهي قريباً ({accusedDetentionExpiryDate}) — تمديد أو إفراج
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-white/60 text-sm whitespace-normal break-words">—</div>
                        )}
                    </div>
                </div>

                <div className={DEFENDANT_COLUMN_CLASS}>
                    <div className="w-full flex items-center justify-start mb-1 pb-1 border-b border-sky-500/20">
                        <div className="inline-flex items-center text-sm font-black text-sky-200/85 leading-none whitespace-nowrap">
                            <span>{caseHasCrossComplaint ? 'المتهم/المشتكي' : 'المتهم'}</span>
                        </div>
                    </div>
                    <div className="space-y-1.5 w-full">
                        {unknownDefendantsList.map((d) => (
                            <UnknownDefendantRevealCard
                                key={d.id}
                                caseId={caseId}
                                defendant={d}
                                disabled={isFrozen || lockPartyMenus}
                                crimeType={crimeType}
                                stage={stage}
                            />
                        ))}
                        {identifiedDefendantsList.length ? (
                            identifiedDefendantsList.map((d) => {
                                    const isUnderSevenDefendant = Boolean((d as any).isUnderSeven);
                                    const isJuvenileDefendant =
                                        Boolean((d as any).isJuvenile) && !isUnderSevenDefendant;
                                    const isMinorDefendant = isJuvenileDefendant || isUnderSevenDefendant;
                                    const partyRoleLabel = defendantPartyRoleLabel(
                                        stage,
                                        isJuvenileDefendant,
                                        isUnderSevenDefendant,
                                    );
                                    const showDetentionAuthority =
                                        d.status === 'موقوف' ||
                                        d.status === 'ملقى القبض عليه' ||
                                        d.status === 'juvenile_detention';
                                    const detentionAuthority = safeTrim((d as any).detentionAuthority);
                                    const showDetentionExpiry =
                                        showDetentionIndicators &&
                                        (d.status === 'موقوف' ||
                                            d.status === 'ملقى القبض عليه' ||
                                            d.status === 'juvenile_detention');
                                    const detentionExpiryDate = safeTrim((d as any).detentionExpiryDate);
                                    const detentionDaysLeft = (() => {
                                        if (!detentionExpiryDate) return null;
                                        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(detentionExpiryDate);
                                        if (!m) return null;
                                        const expMs = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
                                        const now = new Date();
                                        const todayMs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
                                        const diff = expMs - todayMs;
                                        return Math.ceil(diff / (1000 * 60 * 60 * 24));
                                    })();
                                    const statusValue = String(d.status ?? '').trim();
                                    const statusLabel = defendantStatusDisplayLabel(statusValue, {
                                        isJuvenile: isJuvenileDefendant,
                                        detentionAuthority,
                                    });
                                    const statusOptions = getDefendantStatusSelectOptions({
                                        isJuvenile: isJuvenileDefendant,
                                        crimeType,
                                        stage,
                                        currentStatus: (statusValue || '') as DefendantStatus | '',
                                    });
                                    const guarantor = normalizeGuarantorDetails((d as any).guarantorDetails);
                                    const bailAmount = safeTrim(guarantor?.bailAmount);
                                    const guarantorInfo = safeTrim(guarantor?.guarantorInfo);
                                    const isForfeited = isGuarantorForfeited(guarantor);
                                    const hasGuarantorData = Boolean(bailAmount || guarantorInfo);
                                    const legalGuardianName = safeTrim((d as any).guardianName);
                                    const personalStage = d.personalStage ?? defaultPersonalStage();
                                    const isDeathLocked =
                                        Boolean(d.isPartyRecordLocked) ||
                                        personalStage === 'lawsuit_dropped_death' ||
                                        personalStage === 'lawsuit_dropped';
                                    const displayName = partyDisplayName(
                                        resolveDefendantFullName(d) || '—',
                                        isJuvenileDefendant,
                                    );
                                    const isOfficeClient = resolveDefendantOfficeClientMark(d, ourRepresentation);
                                    return (
                                        /*
                                         * 🪜 «البِطاقة داخل البِطاقة» تَظهَر فَقَط عَند الحاجة:
                                         *    - كُلّ صَفّ داخل إِطار زُجاجي خَفيف (موحّد مع عمود المشتكي)
                                         *      البَصري بَين الأَطراف.
                                         *    - حالة قُفل الوَفاة → تَحتَفظ بِإِطارها الأَحمَر السيادي
                                         *      بِغَضّ النَظَر عَن العَدَد، لِأَنّها حَدَث قانوني يَجب
                                         *      تَمييزه عَلى الطَرف المُحَدَّد دائماً.
                                         */
                                        <div
                                            key={d.id}
                                            className={partyInnerCardClass(isDeathLocked)}
                                        >
                                            <div className="w-full flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1 overflow-hidden">
                                                    {partyRoleLabel ? (
                                                        <div className="text-[10px] font-black text-cyan-200/85 mb-0.5 whitespace-nowrap">
                                                            {partyRoleLabel}
                                                        </div>
                                                    ) : null}
                                                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                                                        <button
                                                            type="button"
                                                            onClick={() => setActiveProfile({ kind: 'defendant', data: d })}
                                                            className={`${PARTY_NAME_BUTTON_CLASS} flex-1`}
                                                        >
                                                            {displayName}
                                                        </button>
                                                        {isUnderSevenDefendant ? <UnderSevenPartyBadge inline /> : null}
                                                        {isOfficeClient ? <OfficeClientBadge inline /> : null}
                                                        {Array.isArray(d.seizedAssets) && d.seizedAssets.length > 0 ? (
                                                            <SeizedAssetsInlineMark
                                                                count={d.seizedAssets.length}
                                                                expanded={Boolean(seizureDisclosureOpen[d.id])}
                                                                onToggle={() => toggleSeizureDisclosure(d.id)}
                                                            />
                                                        ) : null}
                                                    </div>
                                                    {isMinorDefendant ? (
                                                        legalGuardianName ? (
                                                            <div className="mt-0.5 w-full min-w-0">
                                                                <JuvenileGuardianInline name={legalGuardianName} />
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex max-w-full rounded-full border border-red-500/45 bg-red-500/15 px-2 py-0.5 text-[10px] font-black text-red-200 whitespace-nowrap overflow-hidden">
                                                                ولي الأمر / الوصي القانوني — إلزامي
                                                            </div>
                                                        )
                                                    ) : null}
                                                    {isDeathLocked ? (
                                                        <div className="text-[10px] font-black text-red-200/90 whitespace-normal break-words">
                                                            🔒 سجل مغلق — سقوط الدعوى لوفاة المتهم
                                                        </div>
                                                    ) : null}
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {!isUnderSevenDefendant ? (
                                                    <DropdownMenu
                                                        modal={false}
                                                        onOpenChange={(open) => {
                                                            if (open) setActiveProfile(null);
                                                        }}
                                                    >
                                                        <DropdownMenuTrigger asChild>
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    isFrozen || partyMenusLocked || isDeathLocked
                                                                }
                                                                title={
                                                                    isDeathLocked
                                                                        ? 'السجل مغلق — لا يمكن تعديل الحالة'
                                                                        : DEFENDANT_STATUS_MENU_TITLE
                                                                }
                                                                className={`inline-flex max-w-[9.5rem] items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black whitespace-nowrap transition hover:brightness-110 disabled:opacity-45 disabled:cursor-not-allowed data-[state=open]:ring-1 data-[state=open]:ring-[#E6C673]/40 ${getDefendantStatusButtonClass(
                                                                    statusValue,
                                                                )}`}
                                                            >
                                                                <span className="truncate">{statusLabel}</span>
                                                                {!isFrozen && !partyMenusLocked && !isDeathLocked ? (
                                                                    <ChevronDown className="h-3 w-3 shrink-0 opacity-80" />
                                                                ) : null}
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent
                                                            align="end"
                                                            sideOffset={6}
                                                            collisionPadding={12}
                                                            className="z-[300] min-w-[15rem] max-h-[min(60vh,320px)] overflow-y-auto border border-slate-600 bg-slate-900 text-white font-['Tajawal'] shadow-xl shadow-black/40 p-1"
                                                        >
                                                            {isFrozen || partyMenusLocked || isDeathLocked ? (
                                                                <div className="px-3 py-2 text-xs font-bold text-white/50 whitespace-normal break-words">
                                                                    {isDeathLocked
                                                                        ? 'السجل مغلق — لا يمكن تعديل الحالة'
                                                                        : 'غير متاح أثناء فتح نافذة أخرى'}
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <DropdownMenuLabel className="px-3 py-2 text-[11px] font-black text-[#E6C673]/90 whitespace-normal break-words leading-relaxed">
                                                                        {DEFENDANT_STATUS_MENU_TITLE}
                                                                    </DropdownMenuLabel>
                                                                    <DropdownMenuSeparator className="bg-slate-700/80" />
                                                                    <DropdownMenuItem
                                                                        onClick={() => {
                                                                            setDeathConfirm({
                                                                                defendantId: d.id,
                                                                                displayName,
                                                                            });
                                                                        }}
                                                                        className="cursor-pointer text-sm font-black text-red-200 focus:bg-red-950/40 focus:text-red-100"
                                                                    >
                                                                        💀 تسجيل وفاة المتهم
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator className="bg-slate-700/80" />
                                                                    {statusOptions.length ? (
                                                                        statusOptions.map((opt) => (
                                                                            <DropdownMenuItem
                                                                                key={opt.value}
                                                                                onClick={() => {
                                                                                    updateCaseDefendantStatus(
                                                                                        caseId,
                                                                                        d.id,
                                                                                        opt.value,
                                                                                    );
                                                                                }}
                                                                                className={`cursor-pointer text-sm font-bold focus:bg-slate-800 focus:text-white ${
                                                                                    statusValue === opt.value ||
                                                                                    (opt.value === 'juvenile_detention' &&
                                                                                        (statusValue === 'موقوف' ||
                                                                                            statusValue ===
                                                                                                'ملقى القبض عليه'))
                                                                                        ? 'bg-slate-800/80 text-[#E6C673]'
                                                                                        : ''
                                                                                }`}
                                                                            >
                                                                                {opt.label}
                                                                            </DropdownMenuItem>
                                                                        ))
                                                                    ) : (
                                                                        <div className="px-3 py-2 text-xs font-bold text-white/50">
                                                                            لا توجد حالات متاحة
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    ) : null}
                                                </div>
                                            </div>

                                            {hasGuarantorData && isForfeited ? (
                                                <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-black text-red-200 whitespace-nowrap">
                                                    ⛔ مصادَرة الكفالة
                                                </div>
                                            ) : null}

                                            {Array.isArray(d.seizedAssets) &&
                                            d.seizedAssets.length > 0 &&
                                            seizureDisclosureOpen[d.id] ? (
                                                <PartySeizedAssetsDisclosure
                                                    caseId={caseId}
                                                    partyId={d.id}
                                                    partyName={displayName}
                                                    assets={d.seizedAssets}
                                                    disabled={isFrozen || lockPartyMenus || isDeathLocked}
                                                    kind="defendant"
                                                />
                                            ) : null}

                                            {showDetentionExpiry &&
                                            detentionDaysLeft !== null &&
                                            detentionDaysLeft <= 3 ? (
                                                <div className="mt-1.5 w-full rounded-md bg-red-900/20 border border-red-500/40 px-2.5 py-1.5 text-red-200 font-black text-[10px] whitespace-normal break-words animate-pulse">
                                                    ⚠️ التوقيف ينتهي قريباً ({detentionExpiryDate}) — تمديد أو إفراج
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })
                        ) : !unknownDefendantsList.length ? (
                            <div className="text-white/60 text-sm whitespace-normal break-words">—</div>
                        ) : null}
                    </div>
                </div>
            </div>

            {activeProfile ? (
                <CriminalModalPortal zIndex={CRIMINAL_MODAL_Z.severance}>
                    {(() => {
                        const profileData = activeProfile.data as Record<string, unknown>;
                        const profileIsJuvenile = Boolean(profileData.isJuvenile);
                        const profilePhone = safeTrim(profileData.phone);
                        const profileAddress = safeTrim(profileData.address);
                        const guardianName = safeTrim(profileData.guardianName);
                        const guardianRelationship = safeTrim(profileData.guardianRelationship);
                        const profileIsOfficeClient =
                            activeProfile.kind === 'complainant'
                                ? resolveComplainantOfficeClientMark(
                                      activeProfile.data as CriminalComplainant,
                                      ourRepresentation,
                                  )
                                : resolveDefendantOfficeClientMark(
                                      activeProfile.data as CriminalDefendant,
                                      ourRepresentation,
                                  );
                        const showGuardianNameLine = profileIsJuvenile && guardianName !== '';
                        const showJuvenileDetailExtras =
                            profileIsJuvenile &&
                            (showGuardianNameLine || Boolean(guardianRelationship));

                        return (
                            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden shadow-2xl">
                                <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                                    <div className="text-white font-black text-sm">تفاصيل الشخص</div>
                                    <div className="flex items-center gap-2">
                                        {canEditPartyNames && onEditPartyName ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onEditPartyName(activeProfile.kind, activeProfile.data.id, {
                                                        fullName: safeTrim((activeProfile.data as any).fullName),
                                                        phone:
                                                            activeProfile.kind === 'complainant'
                                                                ? profilePhone
                                                                : undefined,
                                                        address: profileAddress,
                                                    });
                                                    setActiveProfile(null);
                                                }}
                                                className="rounded-md border border-[#E6C673]/35 bg-[#E6C673]/10 px-2 py-1 text-[10px] font-black text-[#E6C673] hover:bg-[#E6C673]/20 transition"
                                            >
                                                ✏️ تصحيح البيانات
                                            </button>
                                        ) : null}
                                        <button
                                            type="button"
                                            onClick={() => setActiveProfile(null)}
                                            className="text-white/60 hover:text-white transition text-xs font-bold px-2 py-1 rounded-md hover:bg-slate-700/60"
                                        >
                                            إغلاق
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4 space-y-2.5 max-h-[min(70vh,520px)] overflow-y-auto">
                                    <div className="w-full text-right">
                                        <label className="block text-white/80 text-xs font-black mb-1.5 whitespace-normal break-words">
                                            الاسم الكامل
                                        </label>
                                        <div className="w-full rounded-xl border border-slate-700/80 bg-slate-800/25 px-3 py-2.5 text-right">
                                            <div className="flex flex-wrap items-center gap-1.5 text-sm font-black text-white whitespace-normal break-words leading-relaxed">
                                                <span>{safeTrim((activeProfile.data as any).fullName) || '—'}</span>
                                                {profileIsOfficeClient ? <OfficeClientBadge inline /> : null}
                                            </div>
                                        </div>
                                    </div>
                                    {profilePhone ? (
                                        <ProfileReadOnlyField label="رقم الهاتف" value={profilePhone} />
                                    ) : null}
                                    {profileAddress ? (
                                        <ProfileReadOnlyField label="العنوان" value={profileAddress} />
                                    ) : null}
                                    <div className="rounded-xl border border-slate-700/80 bg-slate-800/25 px-3 py-2.5 text-right space-y-1.5">
                                        <div className="text-white/55 text-xs font-black whitespace-normal break-words">
                                            صفة العمر
                                        </div>
                                        <div className="text-white text-sm font-bold whitespace-normal break-words">
                                            {profileIsJuvenile ? '👶 حدث (قاصر)' : '👤 بالغ'}
                                        </div>
                                        {showJuvenileDetailExtras ? (
                                            <div className="space-y-2 pt-2 border-t border-slate-700/60">
                                                {showGuardianNameLine ? (
                                                    <ProfileReadOnlyField
                                                        label="ولي الأمر / الوصي"
                                                        value={guardianName}
                                                    />
                                                ) : null}
                                                {guardianRelationship ? (
                                                    <ProfileReadOnlyField
                                                        label="صلة قرابة الوصي"
                                                        value={guardianRelationship}
                                                    />
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </div>
                                    {(() => {
                                        /**
                                         * 🛡️ تَفاصيل الكفالة في بطاقة التفاصيل تَظهر لِكلٍّ من:
                                         *  - المتهم الأصلي (guarantorDetails).
                                         *  - المشتكي المتقابل (accusedGuarantorDetails) — حصراً عند الشكوى المتقابلة.
                                         * المعروض نَفس البِنية والثيم — لا تَكرار في الـ JSX.
                                         */
                                        let bail = null as ReturnType<typeof normalizeGuarantorDetails>;
                                        if (activeProfile.kind === 'defendant') {
                                            const defendantData = activeProfile.data as CriminalDefendant;
                                            bail = normalizeGuarantorDetails(defendantData.guarantorDetails);
                                        } else if (activeProfile.kind === 'complainant') {
                                            const complainantData = activeProfile.data as CriminalComplainant;
                                            const isAccusedToo =
                                                isMutualComplaint ||
                                                (complainantData as { isCrossComplaint?: boolean })
                                                    .isCrossComplaint === true;
                                            if (isAccusedToo) {
                                                bail = normalizeGuarantorDetails(
                                                    (complainantData as { accusedGuarantorDetails?: unknown })
                                                        .accusedGuarantorDetails,
                                                );
                                            }
                                        }
                                        if (!bail) return null;
                                        const isFinancial =
                                            bail.kind === 'financial' || (bail.bailAmount && !bail.kind);
                                        const isPersonal =
                                            bail.kind === 'personal' ||
                                            (Array.isArray(bail.guarantors) && bail.guarantors.length > 0);
                                        const namesFromList = Array.isArray(bail.guarantors)
                                            ? bail.guarantors.map((g) => g.fullName).filter(Boolean)
                                            : [];
                                        const guarantorNames = namesFromList.length
                                            ? namesFromList
                                            : bail.guarantorInfo
                                              ? bail.guarantorInfo.split(/\s•\s|،|,/).map((s) => s.trim()).filter(Boolean)
                                              : [];
                                        return (
                                            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 px-3 py-2.5 text-right space-y-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="text-emerald-100/90 text-xs font-black whitespace-normal break-words">
                                                        🛡️ تفاصيل الكفالة
                                                    </div>
                                                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-100">
                                                        مكفل
                                                    </span>
                                                </div>
                                                {isFinancial && bail.bailAmount ? (
                                                    <ProfileReadOnlyField
                                                        label="نوع الكفالة"
                                                        value="كفالة مالية"
                                                    />
                                                ) : isPersonal ? (
                                                    <ProfileReadOnlyField
                                                        label="نوع الكفالة"
                                                        value="كفالة شخص ضامن"
                                                    />
                                                ) : null}
                                                {isFinancial && bail.bailAmount ? (
                                                    <ProfileReadOnlyField
                                                        label="مبلغ الكفالة"
                                                        value={bail.bailAmount}
                                                    />
                                                ) : null}
                                                {isPersonal && guarantorNames.length ? (
                                                    <div>
                                                        <div className="text-white/55 text-xs font-black mb-1 whitespace-normal break-words">
                                                            الكفلاء ({guarantorNames.length})
                                                        </div>
                                                        <ol className="space-y-1 pr-4 list-decimal text-sm text-white">
                                                            {guarantorNames.map((name, i) => (
                                                                <li key={`${i}-${name}`} className="whitespace-normal break-words">
                                                                    {name}
                                                                </li>
                                                            ))}
                                                        </ol>
                                                    </div>
                                                ) : null}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        );
                    })()}
                </CriminalModalPortal>
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
