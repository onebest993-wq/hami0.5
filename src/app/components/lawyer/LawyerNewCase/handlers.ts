import type { Party, ThirdParty } from './types';
import { validateForm } from './validation';
const DEPARTMENTS_LABELS = ['بداءة الكرخ', 'بداءة الرصافة', 'استئناف بغداد', 'تمييز بغداد'];

export const updateParty = (
    parties: Party[],
    setParties: React.Dispatch<React.SetStateAction<Party[]>>,
    index: number,
    field: 'name' | 'status' | 'isClient' | 'phone' | 'address',
    value: string | boolean,
    side: 1 | 2,
    stage: string,
    getRole: (stage: string, side: 1 | 2, count: number) => string
) => {
    setParties(prev => {
        const updated = prev.map((p, i) => {
            if (i === index) {
                const newParty = { ...p, [field]: value };
                if (field === 'name' && !prev.some(p2 => p2.name === value)) {
                    newParty.status = getRole(stage, side, prev.length);
                }
                return newParty;
            }
            return p;
        });
        return updated;
    });
};

export const removeParty = (
    parties: Party[],
    setParties: React.Dispatch<React.SetStateAction<Party[]>>,
    index: number,
    stage: string,
    getRole: (stage: string, side: 1 | 2, count: number) => string
) => {
    if (parties.length <= 1) return;
    setParties(prev => {
        const filtered = prev.filter((_, i) => i !== index);
        return filtered.map(p => ({ ...p, status: getRole(stage, 2, filtered.length) }));
    });
};

export const addParty = (
    setParties: React.Dispatch<React.SetStateAction<Party[]>>,
    side: 1 | 2,
    stage: string,
    getRole: (stage: string, side: 1 | 2, count: number) => string,
    startId: string
) => {
    setParties(prev => [...prev.map(p => ({ ...p, status: getRole(stage, side, prev.length + 1) })), {
        id: `${startId}_${Date.now()}`,
        name: '',
        status: getRole(stage, side, prev.length + 1),
        isClient: false,
        phone: '',
        address: ''
    }]);
};

export const toggleAgent = (
    setParties: React.Dispatch<React.SetStateAction<Party[]>>,
    side: 1 | 2,
    id: string
) => {
    setParties(prev => prev.map(p =>
        p.id === id ? { ...p, isMyOffice: !p.isMyOffice, isClient: false, hasLawyer: false, lawyerName: '', lawyerPhone: '', status: p.status } : p
    ));
};

export const handleThirdPartySave = (
    party: ThirdParty,
    thirdParties: ThirdParty[],
    setThirdParties: React.Dispatch<React.SetStateAction<ThirdParty[]>>,
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
) => {
    setThirdParties(prev => [...prev, party]);
    setIsOpen(false);
};

export const handleFormSubmit = (
    e: React.FormEvent,
    errorMap: Record<string, string>,
    caseNumberError: string | null,
    caseDetails: { court: string; type: string; stage: string; number: string },
    parties1: Party[],
    parties2: Party[],
    refs: {
        topFormRef: React.RefObject<HTMLDivElement | null>;
        courtRef: React.RefObject<HTMLInputElement | null>;
        typeRef: React.RefObject<HTMLInputElement | null>;
        stageRef: React.RefObject<HTMLSelectElement | null>;
        numberRef: React.RefObject<HTMLInputElement | null>;
    },
    setErrorMap: React.Dispatch<React.SetStateAction<Record<string, string>>>
): boolean => {
    e.preventDefault();
    const { errors, firstErrorField } = validateForm(
        caseDetails, errorMap, caseNumberError, parties1, parties2
    );
    setErrorMap(errors);

    if (Object.keys(errors).length > 0) {
        if (firstErrorField === 'court') refs.courtRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        else if (firstErrorField === 'type') refs.typeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        else if (firstErrorField === 'stage') refs.stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        else if (firstErrorField === 'number') refs.numberRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        else refs.topFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return false;
    }
    return true;
};

export const triggerDemoData = (
    setCaseDetails: React.Dispatch<React.SetStateAction<{ number: string; court: string; type: string; judge: string; stage: string; claimValue: string; totalAgreedFees: string }>>,
    setIsExpertMode: React.Dispatch<React.SetStateAction<boolean>>,
    setIsAnalyzing: React.Dispatch<React.SetStateAction<boolean>>,
    setParties1: React.Dispatch<React.SetStateAction<Party[]>>,
    setParties2: React.Dispatch<React.SetStateAction<Party[]>>,
    setThirdParties: React.Dispatch<React.SetStateAction<ThirdParty[]>>,
    setErrorMap: React.Dispatch<React.SetStateAction<Record<string, string>>>
) => {
    setCaseDetails({
        number: '234 / ب / 2024',
        court: 'محكمة بداءة الكرادة',
        type: 'تخلي',
        judge: 'القاضي عامر',
        stage: 'بداءة بدرجة أخيرة',
        claimValue: '500000',
        totalAgreedFees: '250000'
    });
    setIsExpertMode(true);
    setIsAnalyzing(true);
    setParties1([{ id: 'p1_1', name: 'حسن عبد الله', status: 'مدعي', isClient: true, phone: '07701234567', address: 'بغداد - الكرادة' }]);
    setParties2([{ id: 'p2_1', name: 'علي كريم', status: 'مدعى عليه', isClient: false, phone: '07807654321', address: 'بغداد - زيونة' }]);
    setThirdParties([
        { id: 1, name: 'مكتب التسجيل العقاري', type: 'جهة حكومية', roleLabel: 'الجهة المختصة', entryType: 'official', role: '', alignment: '', hasLawyer: false, lawyerName: '', lawyerPhone: '', isMyOffice: false },
        { id: 2, name: 'شركة الكهرباء', type: 'جهة حكومية', roleLabel: 'جهة ذات علاقة', entryType: 'official', role: '', alignment: '', hasLawyer: false, lawyerName: '', lawyerPhone: '', isMyOffice: false }
    ]);
    setErrorMap({});
    setTimeout(() => setIsAnalyzing(false), 1000);
};

export const handleSave = (
    saveCaseMutation: { mutate: (data: unknown) => void },
    caseDetails: { court: string; type: string; judge: string; number: string; claimValue: string; totalAgreedFees: string },
    parties1: Party[],
    parties2: Party[],
    thirdParties: ThirdParty[],
    step: string
) => {
    const formData = {
        court: caseDetails.court,
        type: caseDetails.type,
        judge: caseDetails.judge,
        number: caseDetails.number,
        claimValue: caseDetails.claimValue,
        totalAgreedFees: caseDetails.totalAgreedFees,
        parties1: parties1.filter(p => p.name.trim()),
        parties2: parties2.filter(p => p.name.trim()),
        thirdParties,
        step
    };
    saveCaseMutation.mutate(formData);
};

export const getRandomDepartment = () => DEPARTMENTS_LABELS[Math.floor(Math.random() * DEPARTMENTS_LABELS.length)];
