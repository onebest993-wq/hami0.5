import { getLegalRole, type Party } from '../../LawyerShared';
import {
    classifyPartySideBucket,
    dedupePartiesList,
} from '../smartFile/partyRoleClassification';
import { SmartToast } from '@/app/components/ui/SmartToast';

export type EditCaseParty = Record<string, any>;

export function createEditCaseBlankParty(
    type: 'plaintiff' | 'defendant',
    activeStage: string,
    currentList: EditCaseParty[],
) {
    const inheritedRole = currentList.length > 0
        ? currentList[0].role
        : (type === 'plaintiff' ? 'مدعي' : 'مدعى عليه');

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

export function applyEditCasePartyFieldUpdate(
    item: EditCaseParty,
    field: string,
    value: unknown,
    type: 'plaintiff' | 'defendant',
    opposingList: EditCaseParty[],
    setRepresentedParty: (v: string | null) => void,
): EditCaseParty | null {
    const newItem = { ...item };

    if (field === 'lawyerName' || field === 'lawyerPhone') {
        const currentLawyer = newItem.lawyers?.[0] || { name: '', phone: '' };
        const newLawyer = { ...currentLawyer };

        if (field === 'lawyerName') newLawyer.name = value;
        if (field === 'lawyerPhone') newLawyer.phone = value;

        newItem.lawyers = [newLawyer];
        newItem[field] = value;

        if (!newItem.lawyer) newItem.lawyer = { name: '', phone: '', isMyOffice: false };
        if (field === 'lawyerName') newItem.lawyer.name = value;
        if (field === 'lawyerPhone') newItem.lawyer.phone = value;
    } else if (field.startsWith('lawyer.')) {
        if (!newItem.lawyer) newItem.lawyer = { name: '', phone: '', isMyOffice: false };

        const key = field.split('.')[1];

        if (key === 'isMyOffice' && value === true) {
            const hasConflict = opposingList.some(p => p.lawyer?.isMyOffice || p.isClient);

            if (hasConflict) {
                SmartToast.error("⚠️ تعارض مصالح: لا يمكن تمثيل الطرفين في نفس الدعوى!");
                return null;
            }

            newItem.isClient = true;
            setRepresentedParty(type === 'plaintiff' ? 'المدعي' : 'المدعى عليه');
        } else if (key === 'isMyOffice' && value === false) {
            newItem.isClient = false;
        }

        newItem.lawyer = { ...newItem.lawyer, [key]: value };

        if (key === 'name') {
            newItem.lawyerName = value;
            if (!newItem.lawyers || newItem.lawyers.length === 0) newItem.lawyers = [{}];
            newItem.lawyers[0].name = value;
        }
        if (key === 'phone') {
            newItem.lawyerPhone = value;
            if (!newItem.lawyers || newItem.lawyers.length === 0) newItem.lawyers = [{}];
            newItem.lawyers[0].phone = value;
        }
    } else {
        newItem[field] = value;
    }

    return newItem;
}

export function buildEditCaseSavePayload(input: {
    caseNo: string;
    court: string;
    judge: string;
    stageName: string;
    extraordinaryType: string;
    caseType: string;
    plaintiffs: EditCaseParty[];
    defendants: EditCaseParty[];
    preservedExtraParties: Party[];
    thirdParties: unknown[];
    hasCrossAppeal: boolean;
    representedParty: string | null;
    appealCaseNumber: string;
    appealCourtName: string;
    firstInstanceCaseNumber: string;
    firstInstanceCourt: string;
}) {
    const {
        caseNo, court, judge, stageName, extraordinaryType, caseType,
        plaintiffs, defendants, preservedExtraParties, thirdParties,
        hasCrossAppeal, representedParty, appealCaseNumber, appealCourtName,
        firstInstanceCaseNumber, firstInstanceCourt,
    } = input;

    const activeStage = extraordinaryType || stageName;

    const normalizeSideForSave = (list: EditCaseParty[], side: 1 | 2) => {
        const named = list.filter((p) => String(p.name ?? '').trim());
        const source = named.length > 0 ? named : list.slice(0, 1);
        const count = named.length > 0 ? named.length : source.length;
        const role = getLegalRole(activeStage, side, count, extraordinaryType || undefined);
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

    const updatedPlaintiffs = normalizeSideForSave(plaintiffs, 1);
    const updatedDefendants = normalizeSideForSave(defendants, 2);

    const allParties = dedupePartiesList([
        ...updatedPlaintiffs,
        ...updatedDefendants,
        ...preservedExtraParties,
    ] as Party[]);

    const clientParty = allParties.find((p) => p.isClient || p.lawyer?.isMyOffice);
    const resolvedRepresentedParty = clientParty
        ? (() => {
              const bucket = classifyPartySideBucket(clientParty);
              if (bucket === 'plaintiff') return 'المدعي';
              if (bucket === 'defendant') return 'المدعى عليه';
              return representedParty;
          })()
        : null;

    const saveData: Record<string, unknown> = {
        caseNo,
        court,
        judge,
        stageName,
        extraordinaryType,
        type: caseType,
        parties: allParties,
        thirdParties,
        hasCrossAppeal,
        representedParty: resolvedRepresentedParty,
        appealCaseNumber,
        appealCourtName,
    };

    if (stageName?.includes('استئناف')) {
        saveData.firstInstanceCaseNumber = firstInstanceCaseNumber;
        saveData.firstInstanceCourt = firstInstanceCourt;
    }

    return saveData;
}
