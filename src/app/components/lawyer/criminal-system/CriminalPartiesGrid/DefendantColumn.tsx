import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import type {
    CrimeType,
    CriminalDefendant,
    DefendantStatus,
    OurRepresentation,
} from '../criminalStore';
import { isGuarantorForfeited, normalizeGuarantorDetails } from '../criminalStore';
import {
    getDefendantStatusButtonClass,
    getDefendantStatusSelectOptions,
} from '../criminalStagePresentationCore';
import { resolveDefendantOfficeClientMark } from '../criminalOfficeClient';
import { defaultPersonalStage } from '../partyPersonalStage';
import { getIdentifiedDefendants, resolveDefendantFullName } from '../criminalUnknownDefendant';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import {
    JuvenileGuardianInline,
    OfficeClientBadge,
    SeizedAssetsInlineMark,
    UnderSevenPartyBadge,
} from './PartyBadges';
import { PartySeizedAssetsDisclosure } from './PartySeizedAssetsDisclosure';
import { UnknownDefendantRevealCard } from './UnknownDefendantRevealCard';
import type { ActiveProfile, DeathConfirmTarget } from './types';
import {
    DEFENDANT_COLUMN_CLASS,
    DEFENDANT_STATUS_MENU_TITLE,
    PARTY_NAME_BUTTON_CLASS,
    asPartyRecord,
    computeDetentionDaysLeft,
    defendantPartyRoleLabel,
    defendantStatusDisplayLabel,
    partyDisplayName,
    partyInnerCardClass,
    readPartyBoolean,
    readPartyString,
    safeTrim,
} from './shared';

export function DefendantColumn({
    caseId,
    unknownDefendantsList,
    identifiedDefendantsList,
    crimeType,
    stage,
    isFrozen,
    lockPartyMenus,
    partyMenusLocked,
    showDetentionIndicators,
    ourRepresentation,
    caseHasCrossComplaint,
    seizureDisclosureOpen,
    toggleSeizureDisclosure,
    setActiveProfile,
    setDeathConfirm,
    updateCaseDefendantStatus,
}: {
    caseId: string;
    unknownDefendantsList: CriminalDefendant[];
    identifiedDefendantsList: ReturnType<typeof getIdentifiedDefendants>;
    crimeType: CrimeType | '';
    stage: string;
    isFrozen: boolean;
    lockPartyMenus: boolean;
    partyMenusLocked: boolean;
    showDetentionIndicators: boolean;
    ourRepresentation: OurRepresentation | '';
    caseHasCrossComplaint: boolean;
    seizureDisclosureOpen: Record<string, boolean>;
    toggleSeizureDisclosure: (id: string) => void;
    setActiveProfile: (profile: ActiveProfile) => void;
    setDeathConfirm: (target: DeathConfirmTarget) => void;
    updateCaseDefendantStatus: (caseId: string, defendantId: string, status: DefendantStatus) => void;
}) {
    return (
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
                            const defendantRow = asPartyRecord(d);
                            const isUnderSevenDefendant = readPartyBoolean(defendantRow, 'isUnderSeven');
                            const isJuvenileDefendant =
                                readPartyBoolean(defendantRow, 'isJuvenile') && !isUnderSevenDefendant;
                            const isMinorDefendant = isJuvenileDefendant || isUnderSevenDefendant;
                            const partyRoleLabel = defendantPartyRoleLabel(
                                stage,
                                isJuvenileDefendant,
                                isUnderSevenDefendant,
                            );
                            const detentionAuthority = readPartyString(defendantRow, 'detentionAuthority');
                            const showDetentionExpiry =
                                showDetentionIndicators &&
                                (d.status === 'موقوف' ||
                                    d.status === 'ملقى القبض عليه' ||
                                    d.status === 'juvenile_detention');
                            const detentionExpiryDate = readPartyString(
                                defendantRow,
                                'detentionExpiryDate',
                            );
                            const detentionDaysLeft = computeDetentionDaysLeft(detentionExpiryDate);
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
                            const guarantor = normalizeGuarantorDetails(defendantRow.guarantorDetails);
                            const bailAmount = safeTrim(guarantor?.bailAmount);
                            const guarantorInfo = safeTrim(guarantor?.guarantorInfo);
                            const isForfeited = isGuarantorForfeited(guarantor);
                            const hasGuarantorData = Boolean(bailAmount || guarantorInfo);
                            const legalGuardianName = readPartyString(defendantRow, 'guardianName');
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
                                                    className="z-[300] min-w-[15rem] max-h-[min(60vh,320px)] overflow-y-auto border border-slate-600 bg-slate-900 text-white font-['Tajawal'] shadow-lg shadow-black/25 p-1"
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
                                        <div className="mt-1.5 w-full rounded-md bg-red-900/20 border border-red-500/40 px-2.5 py-1.5 text-red-200 font-black text-[10px] whitespace-normal break-words motion-safe:animate-pulse">
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
    );
}
