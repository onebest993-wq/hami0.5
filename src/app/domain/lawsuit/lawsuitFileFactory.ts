import type { FileData } from './lawsuitFileTypes';
import type { CaseType, Party } from '@/app/components/lawyer/lawyerShared/fileDataTypes';
import type { TimelineEvent } from '@/app/components/lawyer/lawyerShared/stageTimelineTypes';
import { FIRST_HEARING_TIMELINE_APPT_ID } from './firstHearingTimelineId';

export { FIRST_HEARING_TIMELINE_APPT_ID };
export { allLawsuitFilesForArchive } from './lawsuitArchivePool';

function buildFirstHearingTimelineEvent(date: string): TimelineEvent {
    return {
        id: FIRST_HEARING_TIMELINE_APPT_ID,
        type: 'appointment',
        date,
        title: 'أول مرافعة',
        details: 'تاريخ أول مرافعة عند إنشاء الإضبارة',
        subType: 'pleading',
        isDeleted: false,
        isNew: true,
    };
}

function normalizeYmd(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : undefined;
}

function isRecord(v: unknown): v is Record<string, unknown> {
    return v !== null && typeof v === 'object';
}

function toParty(
    p: Record<string, unknown>,
    idx: number,
    listSide: 'right' | 'left',
): Party | null {
    const name = typeof p.name === 'string' ? p.name.trim() : '';
    if (!name) return null;
    const idRaw = p.id;
    const id =
        typeof idRaw === 'number'
            ? idRaw
            : typeof idRaw === 'string' && /^\d+$/.test(idRaw)
              ? Number(idRaw)
              : Date.now() + idx;
    const role =
        typeof p.status === 'string' && p.status.trim()
            ? p.status
            : typeof p.role === 'string' && p.role.trim()
              ? p.role
              : listSide === 'right'
                ? 'المدعي'
                : 'المدعى عليه';
    const isClient = p.isClient === true;
    return {
        id,
        name,
        role,
        isClient,
        phone: typeof p.phone === 'string' ? p.phone : undefined,
        address: typeof p.address === 'string' ? p.address : undefined,
        side: listSide,
    };
}

function thirdPartyToParty(tp: Record<string, unknown>, idx: number): Party | null {
    const name = typeof tp.name === 'string' ? tp.name.trim() : '';
    if (!name) return null;
    const affiliatedSide = tp.affiliatedSide === 1 || tp.affiliatedSide === 2 ? tp.affiliatedSide : null;
    const entryMode = typeof tp.entryMode === 'string' ? tp.entryMode : '';
    const roleLabel =
        typeof tp.roleLabel === 'string' && tp.roleLabel.trim()
            ? tp.roleLabel.trim()
            : entryMode === 'interpleader'
              ? 'شخص ثالث (اختصامي)'
              : entryMode === 'affiliative'
                ? affiliatedSide === 1
                    ? 'شخص ثالث (انضمامي — جانب المدعي)'
                    : 'شخص ثالث (انضمامي — جانب المدعى عليه)'
                : 'شخص ثالث';
    const side: 'right' | 'left' | undefined =
        entryMode === 'interpleader'
            ? undefined
            : affiliatedSide === 1
              ? 'right'
              : affiliatedSide === 2
                ? 'left'
                : undefined;
    const idRaw = tp.id;
    const id =
        typeof idRaw === 'number'
            ? idRaw
            : typeof idRaw === 'string' && /^\d+$/.test(idRaw)
              ? Number(idRaw)
              : Date.now() + idx + 200;
    return {
        id,
        name,
        role: roleLabel,
        isClient: tp.isClient === true,
        phone: typeof tp.phone === 'string' ? tp.phone : undefined,
        address: typeof tp.address === 'string' ? tp.address : undefined,
        ...(side ? { side } : {}),
    };
}

function resolveRepresentedPartyFromPayload(
    parties1: Record<string, unknown>[],
    parties2: Record<string, unknown>[],
    thirdParties: Record<string, unknown>[],
): 'المدعي' | 'المدعى عليه' | undefined {
    if (parties1.some((p) => p.isClient === true)) return 'المدعي';
    if (parties2.some((p) => p.isClient === true)) return 'المدعى عليه';
    if (thirdParties.some((tp) => tp.isClient === true && tp.affiliatedSide === 1)) return 'المدعي';
    if (thirdParties.some((tp) => tp.isClient === true && tp.affiliatedSide === 2)) return 'المدعى عليه';
    return undefined;
}

function buildFromStructuredPayload(d: Record<string, unknown>): FileData {
    const details = isRecord(d.details) ? d.details : {};
    const mainCategory =
        d.mainCategory === 'lawsuit' || d.mainCategory === 'transaction' || d.mainCategory === 'execution'
            ? (d.mainCategory as CaseType)
            : 'lawsuit';

    const caseNo =
        typeof details.number === 'string' && details.number.trim()
            ? details.number.trim()
            : typeof d.caseNumber === 'string' && d.caseNumber.trim()
              ? d.caseNumber.trim()
              : 'جديد';
    const court = typeof details.court === 'string' ? details.court : typeof d.court === 'string' ? d.court : 'بداءة الكرخ';
    const docType =
        typeof details.type === 'string'
            ? details.type
            : typeof d.subType === 'string'
              ? d.subType
              : undefined;
    const feesRaw =
        typeof details.totalAgreedFees === 'string'
            ? details.totalAgreedFees
            : typeof d.feesTotal === 'string'
              ? d.feesTotal
              : '';
    const feesTotal = feesRaw ? feesRaw.replace(/[^0-9.]/g, '') : '0';
    const judge =
        typeof details.judge === 'string' && details.judge.trim()
            ? details.judge.trim()
            : typeof d.judge === 'string'
              ? d.judge.trim()
              : undefined;
    const currentStage =
        typeof details.stage === 'string' && details.stage.trim()
            ? details.stage.trim()
            : typeof d.currentStage === 'string'
              ? d.currentStage.trim()
              : undefined;
    const claimValueRaw =
        typeof details.claimValue === 'string'
            ? details.claimValue
            : typeof d.claimValue === 'string'
              ? d.claimValue
              : '';
    const claimValue = claimValueRaw.replace(/[^0-9]/g, '') || undefined;

    const isUndeterminedValue = d.isUndeterminedValue === true;
    const isFixedFee = d.isFixedFee === true;
    const retrialTargetStage =
        typeof details.retrialTargetStage === 'string' && details.retrialTargetStage.trim()
            ? details.retrialTargetStage.trim()
            : typeof d.retrialTargetStage === 'string' && d.retrialTargetStage.trim()
              ? d.retrialTargetStage.trim()
              : undefined;

    const applicableLawRaw =
        typeof details.applicableLaw === 'string'
            ? details.applicableLaw
            : typeof d.applicableLaw === 'string'
              ? d.applicableLaw
              : undefined;
    const applicableLaw =
        applicableLawRaw === 'law_188_1959' || applicableLawRaw === 'jaafari_code'
            ? applicableLawRaw
            : undefined;

    const firstHearingDate = normalizeYmd(details.firstHearingDate);

    const parties1 = Array.isArray(d.parties1) ? (d.parties1 as Record<string, unknown>[]) : [];
    const parties2 = Array.isArray(d.parties2) ? (d.parties2 as Record<string, unknown>[]) : [];
    const thirdParties = Array.isArray(d.thirdParties) ? (d.thirdParties as Record<string, unknown>[]) : [];

    const parties: Party[] = [
        ...parties1
            .map((p, idx) => toParty(p, idx, 'right'))
            .filter((x): x is Party => x !== null),
        ...parties2
            .map((p, idx) => toParty(p, idx + 100, 'left'))
            .filter((x): x is Party => x !== null),
        ...thirdParties
            .map((p, idx) => thirdPartyToParty(p, idx))
            .filter((x): x is Party => x !== null),
    ];

    const representedParty = resolveRepresentedPartyFromPayload(parties1, parties2, thirdParties);
    const firstHearingHistory = firstHearingDate ? [buildFirstHearingTimelineEvent(firstHearingDate)] : [];

    if (parties.length === 0 && Array.isArray(d.parties)) {
        return buildFromCaseFormPayload(d);
    }

    const rawJurisdiction =
        typeof d.selectedType === 'string'
            ? d.selectedType
            : typeof d.lawsuitJurisdiction === 'string'
              ? d.lawsuitJurisdiction
              : undefined;
    const lawsuitJurisdiction =
        rawJurisdiction === 'civil' || rawJurisdiction === 'personal'
            ? rawJurisdiction
            : undefined;

    return {
        id: Date.now(),
        type: mainCategory,
        status: 'active',
        caseNo,
        caseNoParts: { year: new Date().getFullYear().toString(), type: '', seq: '' },
        court,
        docType,
        ...(judge ? { judge } : {}),
        ...(currentStage ? { currentStage } : {}),
        ...(claimValue ? { claimValue } : {}),
        ...(isUndeterminedValue ? { isUndeterminedValue: true } : {}),
        ...(isFixedFee ? { isFixedFee: true } : {}),
        ...(retrialTargetStage ? { retrialTargetStage } : {}),
        feesTotal,
        feesPaid: '0',
        date: new Date().toLocaleDateString('ar-EG'),
        parties,
        history: firstHearingHistory,
        notes: [],
        images: [],
        ...(representedParty ? { representedParty } : {}),
        ...(thirdParties.length > 0 ? { thirdParties } : {}),
        ...(lawsuitJurisdiction ? { lawsuitJurisdiction } : {}),
        ...(applicableLaw ? { applicableLaw } : {}),
        ...(firstHearingDate ? { firstHearingDate, nextDate: firstHearingDate } : {}),
    };
}

function buildFromCaseFormPayload(d: Record<string, unknown>): FileData {
    const title = typeof d.title === 'string' ? d.title : 'lawsuit';
    const mainCategory: CaseType =
        title === 'transaction' || title === 'execution' ? title : 'lawsuit';

    const caseNo =
        typeof d.caseNumber === 'string' && d.caseNumber.trim() ? d.caseNumber.trim() : 'جديد';
    const court = typeof d.court === 'string' && d.court.trim() ? d.court : 'بداءة الكرخ';
    const docType = typeof d.subType === 'string' ? d.subType : undefined;

    const rawParties = Array.isArray(d.parties) ? (d.parties as Record<string, unknown>[]) : [];
    const parties: Party[] = rawParties
        .map((p, idx) => {
            const isClient = p.isClient === true;
            return toParty(p, idx, isClient ? 'right' : 'left');
        })
        .filter((x): x is Party => x !== null);

    return {
        id: Date.now(),
        type: mainCategory,
        status: 'active',
        caseNo,
        caseNoParts: { year: new Date().getFullYear().toString(), type: '', seq: '' },
        court,
        docType,
        feesTotal: '0',
        feesPaid: '0',
        date: new Date().toLocaleDateString('ar-EG'),
        parties,
        history: [],
        notes: [],
        images: [],
    };
}

/** بناء FileData من حفظ LawyerNewCase أو الحمولة المنظّمة للداشبورد. */
export function buildFileDataFromNewCaseSave(data: unknown): FileData | null {
    if (!isRecord(data)) return null;

    if (Array.isArray(data.parties1) || Array.isArray(data.parties2) || isRecord(data.details)) {
        return buildFromStructuredPayload(data);
    }

    if (Array.isArray(data.parties)) {
        return buildFromCaseFormPayload(data);
    }

    return buildFromStructuredPayload(data);
}
