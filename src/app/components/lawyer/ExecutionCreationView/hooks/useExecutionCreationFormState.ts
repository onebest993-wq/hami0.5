import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { createEmptyVisitationScheduleDraft } from '../components/VisitationScheduleSetupSection';
import { createEmptyMaritalFurnitureItem } from '@/app/utils/maritalFurniture';
import type { MaritalFurnitureItem } from '@/app/types/maritalFurniture';
import type { VisitationScheduleConfig } from '@/app/types/visitationSchedule';
import { type SpecificDeliveryItem } from '@/app/utils/specificDeliveryItemsUtils';
import type {
    AbsenteeChecks,
    AdditionalCreditorDraft,
    AdditionalDebtorDraft,
    CreditorDraft,
    DebtorDraft,
    ExecutionTargetOption,
} from '../types';

export interface ExecutionCreationFormState {
    directorate: string;
    setDirectorate: Dispatch<SetStateAction<string>>;
    fileNumber: string;
    setFileNumber: Dispatch<SetStateAction<string>>;

    creditors: CreditorDraft[];
    setCreditors: Dispatch<SetStateAction<CreditorDraft[]>>;
    debtors: DebtorDraft[];
    setDebtors: Dispatch<SetStateAction<DebtorDraft[]>>;
    debtorManualDebtClaims: Record<string, string>;
    setDebtorManualDebtClaims: Dispatch<SetStateAction<Record<string, string>>>;
    debtorLawyerFeesClaims: Record<string, string>;
    setDebtorLawyerFeesClaims: Dispatch<SetStateAction<Record<string, string>>>;
    additionalCreditors: AdditionalCreditorDraft[];
    setAdditionalCreditors: Dispatch<SetStateAction<AdditionalCreditorDraft[]>>;
    additionalDebtorsForm: AdditionalDebtorDraft[];
    setAdditionalDebtorsForm: Dispatch<SetStateAction<AdditionalDebtorDraft[]>>;

    docType: string;
    setDocType: Dispatch<SetStateAction<string>>;
    docNumber: string;
    setDocNumber: Dispatch<SetStateAction<string>>;
    judgmentDate: string;
    setJudgmentDate: Dispatch<SetStateAction<string>>;

    shariaDeedNumber: string;
    setShariaDeedNumber: Dispatch<SetStateAction<string>>;
    shariaRegisterNumber: string;
    setShariaRegisterNumber: Dispatch<SetStateAction<string>>;
    shariaIssueDate: string;
    setShariaIssueDate: Dispatch<SetStateAction<string>>;
    shariaIssuingCourt: string;
    setShariaIssuingCourt: Dispatch<SetStateAction<string>>;

    lastProcedureDate: string;
    setLastProcedureDate: Dispatch<SetStateAction<string>>;
    notificationDate: string;
    setNotificationDate: Dispatch<SetStateAction<string>>;

    classification: string;
    setClassification: Dispatch<SetStateAction<string>>;
    claimType: string;
    setClaimType: Dispatch<SetStateAction<string>>;
    activeClaimTypes: string[];
    setActiveClaimTypes: Dispatch<SetStateAction<string[]>>;
    claimAmountsByType: Record<string, string>;
    setClaimAmountsByType: Dispatch<SetStateAction<Record<string, string>>>;

    foreignData: { country: string; court: string; isAuthenticated: boolean };
    setForeignData: Dispatch<
        SetStateAction<{ country: string; court: string; isAuthenticated: boolean }>
    >;

    totalAmount: string;
    setTotalAmount: Dispatch<SetStateAction<string>>;
    visitationChildrenNames: string[];
    setVisitationChildrenNames: Dispatch<SetStateAction<string[]>>;
    visitationScheduleDraft: Partial<VisitationScheduleConfig>;
    setVisitationScheduleDraft: Dispatch<SetStateAction<Partial<VisitationScheduleConfig>>>;
    custodyWardNames: string[];
    setCustodyWardNames: Dispatch<SetStateAction<string[]>>;
    docTypeSheetOpen: boolean;
    setDocTypeSheetOpen: Dispatch<SetStateAction<boolean>>;
    claimTypeSheetOpen: boolean;
    setClaimTypeSheetOpen: Dispatch<SetStateAction<boolean>>;
    linkedClaimDraft: string[];
    setLinkedClaimDraft: Dispatch<SetStateAction<string[]>>;

    maritalFurnitureItems: MaritalFurnitureItem[];
    setMaritalFurnitureItems: Dispatch<SetStateAction<MaritalFurnitureItem[]>>;

    evictionPropertyNumber: string;
    setEvictionPropertyNumber: Dispatch<SetStateAction<string>>;
    evictionDistrict: string;
    setEvictionDistrict: Dispatch<SetStateAction<string>>;
    evictionPropertyType: string;
    setEvictionPropertyType: Dispatch<SetStateAction<string>>;
    evictionFullAddress: string;
    setEvictionFullAddress: Dispatch<SetStateAction<string>>;
    evictionPremisesUse: 'commercial' | 'residential';
    setEvictionPremisesUse: Dispatch<SetStateAction<'commercial' | 'residential'>>;
    specificDeliveryItems: SpecificDeliveryItem[];
    setSpecificDeliveryItems: Dispatch<SetStateAction<SpecificDeliveryItem[]>>;

    dueDate: string;
    setDueDate: Dispatch<SetStateAction<string>>;

    executionTarget: ExecutionTargetOption;
    setExecutionTarget: Dispatch<SetStateAction<ExecutionTargetOption>>;
    showChequeValidatorModal: boolean;
    setShowChequeValidatorModal: Dispatch<SetStateAction<boolean>>;

    chequeBankName: string;
    setChequeBankName: Dispatch<SetStateAction<string>>;
    chequeIssueDate: string;
    setChequeIssueDate: Dispatch<SetStateAction<string>>;
    chequeNumber: string;
    setChequeNumber: Dispatch<SetStateAction<string>>;

    showAbsenteeModal: boolean;
    setShowAbsenteeModal: Dispatch<SetStateAction<boolean>>;
    absenteeChecks: AbsenteeChecks;
    setAbsenteeChecks: Dispatch<SetStateAction<AbsenteeChecks>>;
    isDocumentBlocked: boolean;
    setIsDocumentBlocked: Dispatch<SetStateAction<boolean>>;

    dowryReason: 'طلاق' | 'وفاة';
    setDowryReason: Dispatch<SetStateAction<'طلاق' | 'وفاة'>>;
    monthlyAlimonyAmount: string;
    setMonthlyAlimonyAmount: Dispatch<SetStateAction<string>>;
    guardianshipDetails: string;
    setGuardianshipDetails: Dispatch<SetStateAction<string>>;
    iddahAlimonyAmount: string;
    setIddahAlimonyAmount: Dispatch<SetStateAction<string>>;

    shariaDeedDetails: string;
    setShariaDeedDetails: Dispatch<SetStateAction<string>>;

    includeLawyerFees: boolean;
    setIncludeLawyerFees: Dispatch<SetStateAction<boolean>>;
    lawyerFeesAmount: string;
    setLawyerFeesAmount: Dispatch<SetStateAction<string>>;

    clientFeesAmount: string;
    setClientFeesAmount: Dispatch<SetStateAction<string>>;

    alimonyBeneficiary: 'زوجة فقط' | 'أولاد فقط' | 'زوجة وأولاد';
    setAlimonyBeneficiary: Dispatch<SetStateAction<'زوجة فقط' | 'أولاد فقط' | 'زوجة وأولاد'>>;
    alimonyLawsuitDate: string;
    setAlimonyLawsuitDate: Dispatch<SetStateAction<string>>;
    alimonyExecutionDate: string;
    setAlimonyExecutionDate: Dispatch<SetStateAction<string>>;
    alimonyWifeMonthly: string;
    setAlimonyWifeMonthly: Dispatch<SetStateAction<string>>;
    alimonyChildrenMonthly: string;
    setAlimonyChildrenMonthly: Dispatch<SetStateAction<string>>;
    alimonyChildrenCount: string;
    setAlimonyChildrenCount: Dispatch<SetStateAction<string>>;
    alimonyPastLawSystem: 'قانون الأحوال الشخصية 1959' | 'الفقه الجعفري';
    setAlimonyPastLawSystem: Dispatch<
        SetStateAction<'قانون الأحوال الشخصية 1959' | 'الفقه الجعفري'>
    >;
    alimonyPastStartDate: string;
    setAlimonyPastStartDate: Dispatch<SetStateAction<string>>;
    pastWifeAlimonyAmount: string;
    setPastWifeAlimonyAmount: Dispatch<SetStateAction<string>>;
    pastChildrenAlimonyAmount: string;
    setPastChildrenAlimonyAmount: Dispatch<SetStateAction<string>>;

    claimAmount: string;
    setClaimAmount: Dispatch<SetStateAction<string>>;
}

/**
 * حزمة حالة نموذج فتح إضبارة التنفيذ (useState cluster) — مستخرجة من
 * ExecutionCreationView لتقليص حجم المكوّن الرئيسي (Phase-2 split).
 */
export function useExecutionCreationFormState(isOpen: boolean): ExecutionCreationFormState {
    const [directorate, setDirectorate] = useState('');
    const [fileNumber, setFileNumber] = useState('');

    const [creditors, setCreditors] = useState<CreditorDraft[]>([
        { id: 1, name: '', phone: '', address: '', occupation: 'كاسب' as 'موظف' | 'كاسب', isClient: false },
    ]);
    const [debtors, setDebtors] = useState<DebtorDraft[]>([
        {
            id: 1,
            name: '',
            phone: '',
            address: '',
            occupation: 'كاسب' as 'موظف' | 'كاسب',
            isClient: false,
            isSolidaryLiability: true,
        },
    ]);
    /** دين يدوي لكل مدين مستقل */
    const [debtorManualDebtClaims, setDebtorManualDebtClaims] = useState<Record<string, string>>({});
    /** حصة أتعاب المحاماة لكل مدين مستقل */
    const [debtorLawyerFeesClaims, setDebtorLawyerFeesClaims] = useState<Record<string, string>>({});

    /** دائنون إضافيون (الدائن الأول يبقى في creditors[0]) */
    const [additionalCreditors, setAdditionalCreditors] = useState<AdditionalCreditorDraft[]>([]);
    /** مدينون إضافيون (المدين الأول يبقى في debtors[0]) */
    const [additionalDebtorsForm, setAdditionalDebtorsForm] = useState<AdditionalDebtorDraft[]>([]);

    const [docType, setDocType] = useState('');
    const [docNumber, setDocNumber] = useState('');
    const [judgmentDate, setJudgmentDate] = useState('');

    const [shariaDeedNumber, setShariaDeedNumber] = useState('');
    const [shariaRegisterNumber, setShariaRegisterNumber] = useState('');
    const [shariaIssueDate, setShariaIssueDate] = useState('');
    const [shariaIssuingCourt, setShariaIssuingCourt] = useState('');

    const [lastProcedureDate, setLastProcedureDate] = useState('');
    const [notificationDate, setNotificationDate] = useState('');

    const [classification, setClassification] = useState('');
    const [claimType, setClaimType] = useState('');
    const [activeClaimTypes, setActiveClaimTypes] = useState<string[]>([]);
    const [claimAmountsByType, setClaimAmountsByType] = useState<Record<string, string>>({});

    const [foreignData, setForeignData] = useState({
        country: '',
        court: '',
        isAuthenticated: false,
    });

    const [totalAmount, setTotalAmount] = useState('');
    /** أسماء الأولاد — حصراً عند «مشاهدة واستصحاب» (قرارات المحاكم شرعي) */
    const [visitationChildrenNames, setVisitationChildrenNames] = useState<string[]>(['']);
    const [visitationScheduleDraft, setVisitationScheduleDraft] = useState<
        Partial<VisitationScheduleConfig>
    >(() => createEmptyVisitationScheduleDraft());
    /** أسماء المحضونين — حصراً عند «نزع حضانة» (قيمة الخيار الداخلية: تسليم ولد) */
    const [custodyWardNames, setCustodyWardNames] = useState<string[]>(['']);
    const [docTypeSheetOpen, setDocTypeSheetOpen] = useState(false);
    const [claimTypeSheetOpen, setClaimTypeSheetOpen] = useState(false);
    const [linkedClaimDraft, setLinkedClaimDraft] = useState<string[]>([]);

    const [maritalFurnitureItems, setMaritalFurnitureItems] = useState<MaritalFurnitureItem[]>([
        createEmptyMaritalFurnitureItem(),
    ]);

    /** تخلية مأجور / eviction — بيانات العين */
    const [evictionPropertyNumber, setEvictionPropertyNumber] = useState('');
    const [evictionDistrict, setEvictionDistrict] = useState('');
    const [evictionPropertyType, setEvictionPropertyType] = useState('');
    const [evictionFullAddress, setEvictionFullAddress] = useState('');
    /** تجاري: لا مهلة تخلية سكنية طويلة | سكني: مهلة المنفذ حتى 90 يوماً */
    const [evictionPremisesUse, setEvictionPremisesUse] = useState<'commercial' | 'residential'>('residential');
    const [specificDeliveryItems, setSpecificDeliveryItems] = useState<SpecificDeliveryItem[]>([]);

    const [dueDate, setDueDate] = useState('');

    const [executionTarget, setExecutionTarget] = useState<ExecutionTargetOption>('');
    const [showChequeValidatorModal, setShowChequeValidatorModal] = useState(false);

    const [chequeBankName, setChequeBankName] = useState('');
    const [chequeIssueDate, setChequeIssueDate] = useState('');
    const [chequeNumber, setChequeNumber] = useState('');

    const [showAbsenteeModal, setShowAbsenteeModal] = useState(false);
    const [absenteeChecks, setAbsenteeChecks] = useState<AbsenteeChecks>({
        isOutsideIraq: false,
        isAddressUnknown: false,
        isDiedDuringNotice: false,
    });
    const [isDocumentBlocked, setIsDocumentBlocked] = useState(false);

    const [dowryReason, setDowryReason] = useState<'طلاق' | 'وفاة'>('طلاق');
    const [monthlyAlimonyAmount, setMonthlyAlimonyAmount] = useState('');
    const [guardianshipDetails, setGuardianshipDetails] = useState('');
    const [iddahAlimonyAmount, setIddahAlimonyAmount] = useState('');

    const [shariaDeedDetails, setShariaDeedDetails] = useState('');

    const [includeLawyerFees, setIncludeLawyerFees] = useState(false);
    const [lawyerFeesAmount, setLawyerFeesAmount] = useState('');

    const [clientFeesAmount, setClientFeesAmount] = useState('');

    const [alimonyBeneficiary, setAlimonyBeneficiary] = useState<
        'زوجة فقط' | 'أولاد فقط' | 'زوجة وأولاد'
    >('زوجة وأولاد');
    const [alimonyLawsuitDate, setAlimonyLawsuitDate] = useState('');
    const [alimonyExecutionDate, setAlimonyExecutionDate] = useState(getLocalTodayYmd());
    const [alimonyWifeMonthly, setAlimonyWifeMonthly] = useState('');
    const [alimonyChildrenMonthly, setAlimonyChildrenMonthly] = useState('');
    const [alimonyChildrenCount, setAlimonyChildrenCount] = useState('1');
    const [alimonyPastLawSystem, setAlimonyPastLawSystem] = useState<
        'قانون الأحوال الشخصية 1959' | 'الفقه الجعفري'
    >('قانون الأحوال الشخصية 1959');
    const [alimonyPastStartDate, setAlimonyPastStartDate] = useState('');
    const [pastWifeAlimonyAmount, setPastWifeAlimonyAmount] = useState('');
    const [pastChildrenAlimonyAmount, setPastChildrenAlimonyAmount] = useState('');
    const [claimAmount, setClaimAmount] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setDocTypeSheetOpen(false);
            setClaimTypeSheetOpen(false);
            setAdditionalCreditors([]);
            setAdditionalDebtorsForm([]);
            setDebtorManualDebtClaims({});
            setDebtorLawyerFeesClaims({});
        }
    }, [isOpen]);

    return {
        directorate,
        setDirectorate,
        fileNumber,
        setFileNumber,
        creditors,
        setCreditors,
        debtors,
        setDebtors,
        debtorManualDebtClaims,
        setDebtorManualDebtClaims,
        debtorLawyerFeesClaims,
        setDebtorLawyerFeesClaims,
        additionalCreditors,
        setAdditionalCreditors,
        additionalDebtorsForm,
        setAdditionalDebtorsForm,
        docType,
        setDocType,
        docNumber,
        setDocNumber,
        judgmentDate,
        setJudgmentDate,
        shariaDeedNumber,
        setShariaDeedNumber,
        shariaRegisterNumber,
        setShariaRegisterNumber,
        shariaIssueDate,
        setShariaIssueDate,
        shariaIssuingCourt,
        setShariaIssuingCourt,
        lastProcedureDate,
        setLastProcedureDate,
        notificationDate,
        setNotificationDate,
        classification,
        setClassification,
        claimType,
        setClaimType,
        activeClaimTypes,
        setActiveClaimTypes,
        claimAmountsByType,
        setClaimAmountsByType,
        foreignData,
        setForeignData,
        totalAmount,
        setTotalAmount,
        visitationChildrenNames,
        setVisitationChildrenNames,
        visitationScheduleDraft,
        setVisitationScheduleDraft,
        custodyWardNames,
        setCustodyWardNames,
        docTypeSheetOpen,
        setDocTypeSheetOpen,
        claimTypeSheetOpen,
        setClaimTypeSheetOpen,
        linkedClaimDraft,
        setLinkedClaimDraft,
        maritalFurnitureItems,
        setMaritalFurnitureItems,
        evictionPropertyNumber,
        setEvictionPropertyNumber,
        evictionDistrict,
        setEvictionDistrict,
        evictionPropertyType,
        setEvictionPropertyType,
        evictionFullAddress,
        setEvictionFullAddress,
        evictionPremisesUse,
        setEvictionPremisesUse,
        specificDeliveryItems,
        setSpecificDeliveryItems,
        dueDate,
        setDueDate,
        executionTarget,
        setExecutionTarget,
        showChequeValidatorModal,
        setShowChequeValidatorModal,
        chequeBankName,
        setChequeBankName,
        chequeIssueDate,
        setChequeIssueDate,
        chequeNumber,
        setChequeNumber,
        showAbsenteeModal,
        setShowAbsenteeModal,
        absenteeChecks,
        setAbsenteeChecks,
        isDocumentBlocked,
        setIsDocumentBlocked,
        dowryReason,
        setDowryReason,
        monthlyAlimonyAmount,
        setMonthlyAlimonyAmount,
        guardianshipDetails,
        setGuardianshipDetails,
        iddahAlimonyAmount,
        setIddahAlimonyAmount,
        shariaDeedDetails,
        setShariaDeedDetails,
        includeLawyerFees,
        setIncludeLawyerFees,
        lawyerFeesAmount,
        setLawyerFeesAmount,
        clientFeesAmount,
        setClientFeesAmount,
        alimonyBeneficiary,
        setAlimonyBeneficiary,
        alimonyLawsuitDate,
        setAlimonyLawsuitDate,
        alimonyExecutionDate,
        setAlimonyExecutionDate,
        alimonyWifeMonthly,
        setAlimonyWifeMonthly,
        alimonyChildrenMonthly,
        setAlimonyChildrenMonthly,
        alimonyChildrenCount,
        setAlimonyChildrenCount,
        alimonyPastLawSystem,
        setAlimonyPastLawSystem,
        alimonyPastStartDate,
        setAlimonyPastStartDate,
        pastWifeAlimonyAmount,
        setPastWifeAlimonyAmount,
        pastChildrenAlimonyAmount,
        setPastChildrenAlimonyAmount,
        claimAmount,
        setClaimAmount,
    };
}
