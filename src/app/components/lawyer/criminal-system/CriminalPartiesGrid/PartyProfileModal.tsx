import type { CriminalComplainant, CriminalDefendant, OurRepresentation } from '../criminalStore';
import { normalizeGuarantorDetails } from '../criminalStore';
import { CriminalModalPortal, CRIMINAL_MODAL_Z } from '../criminalModalPortal';
import {
    resolveComplainantOfficeClientMark,
    resolveDefendantOfficeClientMark,
} from '../criminalOfficeClient';
import { OfficeClientBadge, ProfileReadOnlyField } from './PartyBadges';
import type { ActiveProfile } from './types';
import { safeTrim } from './shared';

export function PartyProfileModal({
    activeProfile,
    isMutualComplaint,
    ourRepresentation,
    canEditPartyNames,
    onEditPartyName,
    onClose,
}: {
    activeProfile: Exclude<ActiveProfile, null>;
    isMutualComplaint: boolean;
    ourRepresentation: OurRepresentation | '';
    canEditPartyNames: boolean;
    onEditPartyName?: (
        kind: 'complainant' | 'defendant',
        partyId: string,
        snapshot: { fullName: string; phone?: string; address: string },
    ) => void;
    onClose: () => void;
}) {
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
        profileIsJuvenile && (showGuardianNameLine || Boolean(guardianRelationship));

    /**
     * 🛡️ تَفاصيل الكفالة في بطاقة التفاصيل تَظهر لِكلٍّ من:
     *  - المتهم الأصلي (guarantorDetails).
     *  - المشتكي المتقابل (accusedGuarantorDetails) — حصراً عند الشكوى المتقابلة.
     * المعروض نَفس البِنية والثيم — لا تَكرار في الـ JSX.
     */
    // normalizeGuarantorDetails قد تُرجع undefined — لا نستخدم !== null وحدها
    let bail: NonNullable<ReturnType<typeof normalizeGuarantorDetails>> | null = null;
    if (activeProfile.kind === 'defendant') {
        const defendantData = activeProfile.data as CriminalDefendant;
        bail = normalizeGuarantorDetails(defendantData.guarantorDetails) ?? null;
    } else if (activeProfile.kind === 'complainant') {
        const complainantData = activeProfile.data as CriminalComplainant;
        const isAccusedToo =
            isMutualComplaint ||
            (complainantData as { isCrossComplaint?: boolean }).isCrossComplaint === true;
        if (isAccusedToo) {
            bail =
                normalizeGuarantorDetails(
                    (complainantData as { accusedGuarantorDetails?: unknown }).accusedGuarantorDetails,
                ) ?? null;
        }
    }
    const isFinancial =
        bail != null && (bail.kind === 'financial' || Boolean(bail.bailAmount && !bail.kind));
    const isPersonal =
        bail != null &&
        (bail.kind === 'personal' || (Array.isArray(bail.guarantors) && bail.guarantors.length > 0));
    const namesFromList =
        bail != null && Array.isArray(bail.guarantors)
            ? bail.guarantors.map((g) => g.fullName).filter(Boolean)
            : [];
    const guarantorNames = namesFromList.length
        ? namesFromList
        : bail?.guarantorInfo
          ? bail.guarantorInfo.split(/\s•\s|،|,/).map((s) => s.trim()).filter(Boolean)
          : [];

    return (
        <CriminalModalPortal zIndex={CRIMINAL_MODAL_Z.severance}>
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden shadow-lg">
                <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                    <div className="text-white font-black text-sm">تفاصيل الشخص</div>
                    <div className="flex items-center gap-2">
                        {canEditPartyNames && onEditPartyName ? (
                            <button
                                type="button"
                                onClick={() => {
                                    onEditPartyName(activeProfile.kind, activeProfile.data.id, {
                                        fullName: safeTrim(profileData.fullName),
                                        phone:
                                            activeProfile.kind === 'complainant' ? profilePhone : undefined,
                                        address: profileAddress,
                                    });
                                    onClose();
                                }}
                                className="rounded-md border border-[#E6C673]/35 bg-[#E6C673]/10 px-2 py-1 text-[10px] font-black text-[#E6C673] hover:bg-[#E6C673]/20 transition"
                            >
                                ✏️ تصحيح البيانات
                            </button>
                        ) : null}
                        <button
                            type="button"
                            onClick={onClose}
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
                                <span>{safeTrim(profileData.fullName) || '—'}</span>
                                {profileIsOfficeClient ? <OfficeClientBadge inline /> : null}
                            </div>
                        </div>
                    </div>
                    {profilePhone ? <ProfileReadOnlyField label="رقم الهاتف" value={profilePhone} /> : null}
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
                                    <ProfileReadOnlyField label="ولي الأمر / الوصي" value={guardianName} />
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
                    {bail ? (
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
                                <ProfileReadOnlyField label="نوع الكفالة" value="كفالة مالية" />
                            ) : isPersonal ? (
                                <ProfileReadOnlyField label="نوع الكفالة" value="كفالة شخص ضامن" />
                            ) : null}
                            {isFinancial && bail.bailAmount ? (
                                <ProfileReadOnlyField label="مبلغ الكفالة" value={bail.bailAmount} />
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
                    ) : null}
                </div>
            </div>
        </CriminalModalPortal>
    );
}
