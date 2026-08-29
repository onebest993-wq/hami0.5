import { getLegalRole, type Party } from '../../LawyerShared';
import {
    classifyPartySideBucket,
    dedupePartiesList,
} from '../smartFile/partyRoleClassification';
import { SmartToast } from '@/app/components/ui/SmartToast';

export type EditCaseParty = {
    name?: string;
    address?: string;
    phone?: string;
    lawyerName?: string;
    lawyerPhone?: string;
    lawyers?: Array<{ name?: string; phone?: string }>;
    lawyer?: { name?: string; phone?: string; isMyOffice?: boolean };
    role?: string;
    legalRole?: string;
    isClient?: boolean;
    [key: string]: unknown;
};

export function createEditCaseParty(type: 'plaintiff' | 'defendant', currentList: EditCaseParty[], activeStage: string): EditCaseParty {
    const inheritedRole = currentList.length > 0 ? currentList[0].role : (type === 'plaintiff' ? 'مدعي' : 'مدعى عليه');
    return {
        name: '',
        address: '',
        phone: '',
        lawyerName: '',
        lawyerPhone: '',
        lawyers: [{ name: '', phone: '' }],
        lawyer: { name: '', phone: '', isMyOffice: false },
        role: inheritedRole,
        legalRole: getLegalRole(activeStage, type === 'plaintiff' ? 1 : 2, 1),
    };
}

export function updateEditCasePartyField(
    list: EditCaseParty[],
    index: number,
    field: string,
    value: unknown,
    type: 'plaintiff' | 'defendant',
    opposingList: EditCaseParty[],
    setRepresentedParty: (v: string | null) => void,
): EditCaseParty[] | null {
    if (field === 'role' || field === 'legalRole') {
        return null;
    }

    return list.map((item, i) => {
        if (i !== index) return item;

        const newItem = { ...item };

        if (field === 'lawyerName' || field === 'lawyerPhone') {
            const currentLawyer = newItem.lawyers?.[0] || { name: '', phone: '' };
            const newLawyer = { ...currentLawyer };

            if (field === 'lawyerName') newLawyer.name = value as string;
            if (field === 'lawyerPhone') newLawyer.phone = value as string;

            newItem.lawyers = [newLawyer];
            newItem[field] = value;

            if (!newItem.lawyer) newItem.lawyer = { name: '', phone: '', isMyOffice: false };
            if (field === 'lawyerName') newItem.lawyer.name = value as string;
            if (field === 'lawyerPhone') newItem.lawyer.phone = value as string;
        } else if (field.startsWith('lawyer.')) {
            if (!newItem.lawyer) newItem.lawyer = { name: '', phone: '', isMyOffice: false };

            const key = field.split('.')[1];

            if (key === 'isMyOffice' && value === true) {
                const hasConflict = opposingList.some(p => p.lawyer?.isMyOffice || p.isClient);

                if (hasConflict) {
                    SmartToast.error("⚠️ تعارض مصالح: لا يمكن تمثيل الطرفين في نفس الدعوى!");
                    return item;
                }

                newItem.isClient = true;
                setRepresentedParty(type === 'plaintiff' ? 'المدعي' : 'المدعى عليه');
            } else if (key === 'isMyOffice' && value === false) {
                newItem.isClient = false;
            }

            newItem.lawyer = { ...newItem.lawyer, [key]: value };

            if (key === 'name') {
                newItem.lawyerName = value as string;
                if (!newItem.lawyers || newItem.lawyers.length === 0) newItem.lawyers = [{}];
                newItem.lawyers[0].name = value as string;
            }
            if (key === 'phone') {
                newItem.lawyerPhone = value as string;
                if (!newItem.lawyers || newItem.lawyers.length === 0) newItem.lawyers = [{}];
                newItem.lawyers[0].phone = value as string;
            }
        } else {
            newItem[field] = value;
        }
        return newItem;
    });
}

export function buildEditCaseSaveData(input: {
    caseNo: string;
    court: string;
    judge: string;
    stageName: string;
    extraordinaryType: string;
    caseType: string;
    hasCrossAppeal: boolean;
    firstInstanceCaseNumber: string;
    firstInstanceCourt: string;
    appealCaseNumber: string;
    appealCourtName: string;
    thirdParties: unknown[];
    representedParty: string | null;
    plaintiffs: EditCaseParty[];
    defendants: EditCaseParty[];
    preservedExtraParties: Party[];
}) {
    const activeStage = input.extraordinaryType || input.stageName;

    const normalizeSideForSave = (list: EditCaseParty[], side: 1 | 2) => {
        const named = list.filter((p) => String(p.name ?? '').trim());
        const source = named.length > 0 ? named : list.slice(0, 1);
        const count = named.length > 0 ? named.length : source.length;
        const role = getLegalRole(activeStage, side, count, input.extraordinaryType || undefined);
        return source.map((p) => ({
            ...p,
            role,
            legalRole: role,
            side: side === 1 ? ('right' as const) : ('left' as const),
            ...(p.lawyer?.isMyOffice === false
                ? { isClient: false, lawyer: { ...p.lawyer, isMyOffice: false } }
                : {}),
        }));
    };

    const updatedPlaintiffs = normalizeSideForSave(input.plaintiffs, 1);
    const updatedDefendants = normalizeSideForSave(input.defendants, 2);

    const allParties = dedupePartiesList([
        ...updatedPlaintiffs,
        ...updatedDefendants,
        ...input.preservedExtraParties,
    ] as Party[]);

    const clientParty = allParties.find((p) => p.isClient || p.lawyer?.isMyOffice);
    const resolvedRepresentedParty = clientParty
        ? (() => {
              const bucket = classifyPartySideBucket(clientParty);
              if (bucket === 'plaintiff') return 'المدعي';
              if (bucket === 'defendant') return 'المدعى عليه';
              return input.representedParty;
          })()
        : null;

    const saveData: Record<string, unknown> = {
        caseNo: input.caseNo,
        court: input.court,
        judge: input.judge,
        stageName: input.stageName,
        extraordinaryType: input.extraordinaryType,
        type: input.caseType,
        parties: allParties,
        thirdParties: input.thirdParties,
        hasCrossAppeal: input.hasCrossAppeal,
        representedParty: resolvedRepresentedParty,
        appealCaseNumber: input.appealCaseNumber,
        appealCourtName: input.appealCourtName,
    };

    if (input.stageName?.includes('استئناف')) {
        saveData.firstInstanceCaseNumber = input.firstInstanceCaseNumber;
        saveData.firstInstanceCourt = input.firstInstanceCourt;
    }

    return saveData;
}

export const EDIT_CASE_GLASS_FIELD =
    'w-full rounded-xl border border-white/10 bg-white/[0.05] backdrop-blur-sm px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-[#E6C673]/45 focus:ring-1 focus:ring-[#E6C673]/15';
export const EDIT_CASE_GLASS_LABEL = 'mb-1.5 block text-[10px] font-bold text-white/45';
