import { ChevronDown } from 'lucide-react';
import type {
    CrimeType,
    CriminalComplainant,
    DefendantStatus,
    OurRepresentation,
} from '../criminalStore';
import { isGuarantorForfeited, normalizeGuarantorDetails } from '../criminalStore';
import {
    getDefendantStatusButtonClass,
    getDefendantStatusSelectOptions,
} from '../criminalStagePresentationCore';
import { resolveComplainantOfficeClientMark } from '../criminalOfficeClient';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { JuvenileGuardianInline, OfficeClientBadge, SeizedAssetsInlineMark } from './PartyBadges';
import { PartySeizedAssetsDisclosure } from './PartySeizedAssetsDisclosure';
import type { ActiveProfile, DeathConfirmTarget } from './types';
import {
    COMPLAINANT_COLUMN_CLASS,
    DEFENDANT_STATUS_MENU_TITLE,
    PARTY_NAME_BUTTON_CLASS,
    asPartyRecord,
    computeDetentionDaysLeft,
    defendantStatusDisplayLabel,
    partyDisplayName,
    partyInnerCardClass,
    readPartyBoolean,
    readPartySeizedAssets,
    readPartyString,
    safeTrim,
} from './shared';

export function ComplainantColumn({
    caseId,
    complainants,
    crimeType,
    stage,
    isMutualComplaint,
    isPrivateRightWaived,
    waiverDate,
    showDetentionIndicators,
    isFrozen,
    lockPartyMenus,
    partyMenusLocked,
    ourRepresentation,
    caseHasCrossComplaint,
    seizureDisclosureOpen,
    toggleSeizureDisclosure,
    setActiveProfile,
    setDeathConfirm,
    updateCrossComplainantAccusedStatus,
}: {
    caseId: string;
    complainants: CriminalComplainant[];
    crimeType: CrimeType | '';
    stage: string;
    isMutualComplaint: boolean;
    isPrivateRightWaived: boolean;
    waiverDate: string;
    showDetentionIndicators: boolean;
    isFrozen: boolean;
    lockPartyMenus: boolean;
    partyMenusLocked: boolean;
    ourRepresentation: OurRepresentation | '';
    caseHasCrossComplaint: boolean;
    seizureDisclosureOpen: Record<string, boolean>;
    toggleSeizureDisclosure: (id: string) => void;
    setActiveProfile: (profile: ActiveProfile) => void;
    setDeathConfirm: (target: DeathConfirmTarget) => void;
    updateCrossComplainantAccusedStatus: (
        caseId: string,
        complainantId: string,
        status: DefendantStatus,
    ) => void;
}) {
    return (
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
                        const complainantRow = asPartyRecord(c);
                        // ⚖️ شكوى متقابلة: المشتكي يَكتسب صفة المتهم على مستوى الكيس
                        //    أو على مستوى المشتكي الفردي (per-complainant flag).
                        const isAccusedToo =
                            isMutualComplaint || readPartyBoolean(complainantRow, 'isCrossComplaint');
                        const isJuvenileComplainant = readPartyBoolean(complainantRow, 'isJuvenile');
                        const legalGuardianName = readPartyString(complainantRow, 'guardianName');
                        const accusedStatusValue = readPartyString(complainantRow, 'accusedStatus');
                        const accusedDetentionAuthority = readPartyString(
                            complainantRow,
                            'accusedDetentionAuthority',
                        );
                        const accusedDetentionExpiryDate = readPartyString(
                            complainantRow,
                            'accusedDetentionExpiryDate',
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
                        const accusedDetentionDaysLeft = computeDetentionDaysLeft(accusedDetentionExpiryDate);
                        /**
                         * 🛡️ تَفاصيل الكفالة على المشتكي المتقابل (مرآة لِبطاقة المتهم).
                         * تَستخدم نفس النَورمالايزر العام `normalizeGuarantorDetails`.
                         */
                        const accusedGuarantor = isAccusedToo
                            ? normalizeGuarantorDetails(complainantRow.accusedGuarantorDetails)
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
                            isAccusedToo
                                ? readPartySeizedAssets(complainantRow, 'accusedSeizedAssets')
                                : [];
                        /**
                         * 💀 قُفل سجل المشتكي بصفته متهماً — لحماية البطاقة بعد توثيق الوفاة.
                         */
                        const accusedDeathLocked =
                            isAccusedToo &&
                            (readPartyBoolean(complainantRow, 'accusedIsPartyRecordLocked') ||
                                readPartyString(complainantRow, 'accusedPersonalStage') ===
                                    'lawsuit_dropped_death');
                        const displayName = partyDisplayName(
                            readPartyString(complainantRow, 'fullName') || '—',
                            readPartyBoolean(complainantRow, 'isJuvenile'),
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
                                    <div className="mt-1.5 w-full rounded-md bg-red-900/20 border border-red-500/40 px-2.5 py-1.5 text-red-200 font-black text-[10px] whitespace-normal break-words motion-safe:animate-pulse">
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
    );
}
