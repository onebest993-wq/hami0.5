import type { FileData, Party } from '@/app/components/lawyer/LawyerShared';
import type { CaseType } from '@/app/components/lawyer/LawyerShared';

function isRecord(v: unknown): v is Record<string, unknown> {
    return v !== null && typeof v === 'object';
}

function toParty(
    p: Record<string, unknown>,
    idx: number,
    defaults: { isClient: boolean; side: 'right' | 'left' },
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
        typeof p.status === 'string'
            ? p.status
            : typeof p.role === 'string'
              ? p.role
              : defaults.isClient
                ? 'المدعي'
                : 'المدعى عليه';
    return {
        id,
        name,
        role,
        isClient: defaults.isClient,
        phone: typeof p.phone === 'string' ? p.phone : undefined,
        address: typeof p.address === 'string' ? p.address : undefined,
        side: defaults.side,
    };
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

    const parties1 = Array.isArray(d.parties1) ? (d.parties1 as Record<string, unknown>[]) : [];
    const parties2 = Array.isArray(d.parties2) ? (d.parties2 as Record<string, unknown>[]) : [];
    const thirdParties = Array.isArray(d.thirdParties) ? (d.thirdParties as Record<string, unknown>[]) : [];

    const parties: Party[] = [
        ...parties1
            .map((p, idx) => toParty(p, idx, { isClient: true, side: 'right' }))
            .filter((x): x is Party => x !== null),
        ...parties2
            .map((p, idx) => toParty(p, idx + 100, { isClient: false, side: 'left' }))
            .filter((x): x is Party => x !== null),
        ...thirdParties
            .map((p, idx) =>
                toParty(
                    {
                        ...p,
                        name: typeof p.name === 'string' ? p.name : '',
                        role: typeof p.entryType === 'string' ? p.entryType : 'طرف ثالث',
                    },
                    idx + 200,
                    { isClient: false, side: 'left' },
                ),
            )
            .filter((x): x is Party => x !== null),
    ];

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
        feesTotal,
        feesPaid: '0',
        date: new Date().toLocaleDateString('ar-EG'),
        parties,
        history: [],
        notes: [],
        images: [],
        ...(lawsuitJurisdiction ? { lawsuitJurisdiction } : {}),
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
        .map((p, idx) =>
            toParty(p, idx, {
                isClient: !!p.isClient,
                side: p.isClient ? 'right' : 'left',
            }),
        )
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

/** ملفات تظهر في تبويب «الدعاوى المدنية» بمساحة العمل (النشطة فقط). */
export function filterLawsuitWorkspaceFiles<T extends { type?: string; status?: string }>(files: T[]): T[] {
    return files.filter((f) => f.type === 'lawsuit' && f.status !== 'deleted' && f.status !== 'archived');
}

/** كل إضابير الدعاوى لبوابة الأرشيف (نشطة + مؤرشفة + سلة). */
export function allLawsuitFilesForArchive<T extends { type?: string }>(files: T[]): T[] {
    return files.filter((f) => f.type === 'lawsuit');
}

/**
 * تحويل FileData إلى صفوف ArchivePortal دون `any`.
 * ArchivePortal يقبل حقولاً موسّعة (LooseArchiveFile) متوافقة مع تخزين المحامي.
 */
export function lawsuitFilesToArchiveRows<T extends FileData>(files: T[]): T[] {
    return files;
}
