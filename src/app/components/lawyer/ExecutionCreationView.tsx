import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    X, Plus, Trash2, Gavel, FileText,
    DollarSign, AlertTriangle, Code, Calendar, Zap,
    ChevronDown, Scale, Package, Building2, Sparkles
} from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { motion, AnimatePresence } from 'motion/react';
import { debug } from '@/app/utils/debug';
import logger from '@/app/utils/logger';
import { SupabaseService } from '@/app/services/SupabaseService';
import { deriveMonetaryClaimNature } from '@/app/utils/summoningImmunityEngine';
import { isEvictionClaim } from '@/app/utils/executionModuleStrategies';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    isLegalEntityDebtorKind,
    normalizeDebtorEntityKind,
} from '@/app/utils/debtorEntityKindUtils';
import type { ExecutionArchiveFile, ModalProps } from '@/app/types/common';
import { PartiesSection } from './ExecutionCreationView/components/PartiesSection';
import ExecutionOptionSheet from './ExecutionCreationView/components/ExecutionOptionSheet';
import { ecg } from './ExecutionCreationView/components/executionCreationGlassUi';
import { SmartAlimonyCalculator } from './ExecutionCreationView/components/SmartAlimonyCalculator';
import {
    PastAlimonyFieldsSection,
    PastAlimonyResultPreview,
} from './ExecutionCreationView/components/PastAlimonySection';
import { DirectorateSection } from './ExecutionCreationView/components/DirectorateSection';
import { ExecutionCreationSection } from './ExecutionCreationView/components/ExecutionCreationSection';
import { ForeignJudgmentSection } from './ExecutionCreationView/components/ForeignJudgmentSection';
import { EvictionSection } from './ExecutionCreationView/components/EvictionSection';
import {
    VisitationScheduleSetupSection,
    createEmptyVisitationScheduleDraft,
} from './ExecutionCreationView/components/VisitationScheduleSetupSection';
import { MaritalFurnitureSetupSection } from './ExecutionCreationView/components/MaritalFurnitureSetupSection';
import { ExecutionSaveButton } from './ExecutionCreationView/components/ExecutionSaveButton';
import {
    claimHasFinancialAmountSection,
    claimUsesMonetaryAmountField,
    isFinancialClaimForPartySplit,
    isShariaLinkedFinancialClaim,
    parseMoneyInput,
    SHARIA_LINKED_FINANCIAL_CLAIM_VALUES,
    splitAmountEqually,
} from './ExecutionCreationView/hooks/executionFormUtils';
import {
    useExecutionCreationFormOptions,
    EXECUTION_DOC_TYPE_OPTIONS,
    EXECUTION_DOC_TYPE_COMING_SOON,
} from './ExecutionCreationView/hooks/useExecutionCreationFormOptions';
import { useLegalWarnings } from './ExecutionCreationView/hooks/useLegalWarnings';
import { useAlimonyCalculator } from './ExecutionCreationView/hooks/useAlimonyCalculator';
import { useStatuteCalculations } from './ExecutionCreationView/hooks/useStatuteCalculations';
import { useImprisonmentEligibility } from './ExecutionCreationView/hooks/useImprisonmentEligibility';
import { generateExecutionDossierId } from '@/app/utils/executionStorageKeys';
import type { VisitationScheduleConfig } from '@/app/types/visitationSchedule';
import { buildVisitationScheduleBundle } from '@/app/utils/visitationScheduleEngine';
import type { MaritalFurnitureItem } from '@/app/types/maritalFurniture';
import {
    createEmptyMaritalFurnitureItem,
    normalizeMaritalFurnitureItems,
    sumMaritalFurnitureTotal,
} from '@/app/utils/maritalFurniture';

interface ExecutionCreationViewProps extends ModalProps {
    onSave: (fileData: ExecutionArchiveFile) => void;
}

export const ExecutionCreationView: React.FC<ExecutionCreationViewProps> = ({ isOpen, onClose, onSave }) => {
    // === SECTION 1: DIRECTORATE INFO ===
    const [directorate, setDirectorate] = useState('');
    // Merged File Number/Year logic
    const [fileNumber, setFileNumber] = useState(''); 
    
    // PHASE 17: Arrays of creditors and debtors
    const [creditors, setCreditors] = useState([
        { id: 1, name: '', phone: '', address: '', occupation: 'كاسب' as 'موظف' | 'كاسب', isClient: false }
    ]);
    const [debtors, setDebtors] = useState([
        { id: 1, name: '', phone: '', address: '', occupation: 'كاسب' as 'موظف' | 'كاسب', isClient: false }
    ]);

    /** دائنون إضافيون (الدائن الأول يبقى في creditors[0]) */
    const [additionalCreditors, setAdditionalCreditors] = useState<
        Array<{
            id: string;
            name: string;
            phone: string;
            address: string;
            occupation: 'موظف' | 'كاسب';
            isClient: boolean;
        }>
    >([]);
    /** مدينون إضافيون (المدين الأول يبقى في debtors[0]) */
    const [additionalDebtorsForm, setAdditionalDebtorsForm] = useState<
        Array<{
            id: string;
            name: string;
            phone: string;
            address: string;
            occupation: 'موظف' | 'كاسب';
            isClient: boolean;
        }>
    >([]);
    /** التضامن والتكافل — يُضبط أسفل المدينين عند إضافة مدين إضافي */
    const [isSolidaryLiability, setIsSolidaryLiability] = useState(false);

    useEffect(() => {
        if (additionalDebtorsForm.length === 0) {
            setIsSolidaryLiability(false);
        }
    }, [additionalDebtorsForm.length]);

    // === SECTION 3: DOCUMENT & EXECUTION TYPE ===
    const [docType, setDocType] = useState('');
    const [docNumber, setDocNumber] = useState('');
    const [judgmentDate, setJudgmentDate] = useState(''); // ✅ تاريخ الحكم للأحكام القضائية
    
    // === PHASE 49: SHARIA DEED IDENTIFICATION ===
    const [shariaDeedNumber, setShariaDeedNumber] = useState(''); // العدد / رقم الحجة
    const [shariaRegisterNumber, setShariaRegisterNumber] = useState(''); // رقم السجل
    const [shariaIssueDate, setShariaIssueDate] = useState(''); // تاريخ الإصدار
    const [shariaIssuingCourt, setShariaIssuingCourt] = useState(''); // المحكمة الشرعية المصدرة
    
    // ✅ IRAQI LAW: Statute of Limitations & Notification Period Tracker
    const [lastProcedureDate, setLastProcedureDate] = useState(''); // تاريخ آخر إجراء (لحساب التقادم)
    const [notificationDate, setNotificationDate] = useState(''); // تاريخ إخبار المدين
    
    // === PHASE 25: CASCADING DROPDOWNS ===
    const [classification, setClassification] = useState('');
    const [claimType, setClaimType] = useState('');
    const [activeClaimTypes, setActiveClaimTypes] = useState<string[]>([]);
    const [claimAmountsByType, setClaimAmountsByType] = useState<Record<string, string>>({});
    
    // === PHASE 17: FOREIGN JUDGMENTS ===
    const [foreignData, setForeignData] = useState({ 
        country: '', 
        court: '', 
        isAuthenticated: false 
    });
    
    // === SECTION 4: CIVIL VS SHARIA BRANCHING ===
    // PHASE 29: Removed redundant states (civilExecutionType, shariaClaimType) - using unified claimType
    const [totalAmount, setTotalAmount] = useState('');
    /** أسماء الأولاد — حصراً عند «مشاهدة واستصحاب» (قرارات المحاكم شرعي) */
    const [visitationChildrenNames, setVisitationChildrenNames] = useState<string[]>(['']);
    const [visitationScheduleDraft, setVisitationScheduleDraft] = useState<
        Partial<VisitationScheduleConfig>
    >(() => createEmptyVisitationScheduleDraft());
    /** أسماء المحضونين — حصراً عند «تسليم حضانة» (قيمة الخيار الداخلية: تسليم ولد) */
    const [custodyWardNames, setCustodyWardNames] = useState<string[]>(['']);
    const [docTypeSheetOpen, setDocTypeSheetOpen] = useState(false);
    const [claimTypeSheetOpen, setClaimTypeSheetOpen] = useState(false);
    const [linkedClaimDraft, setLinkedClaimDraft] = useState<string[]>([]);
    
    // === FURNITURE DETAILS (أثاث زوجية) ===
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
    const [specificDeliveryItemNature, setSpecificDeliveryItemNature] = useState<
        'movable' | 'immovable' | ''
    >('');
    
    // === PHASE 28: COMMERCIAL PAPER DUE DATE ===
    const [dueDate, setDueDate] = useState('');
    
    // === 🔍 CHEQUE VALIDATOR & TARGET FILTERS ===
    const [executionTarget, setExecutionTarget] = useState<'المدين الأصلي' | 'المُظَهِّر' | 'كفيل متضامن' | 'كفيل غير متضامن' | ''>('');
    const [showChequeValidatorModal, setShowChequeValidatorModal] = useState(false);
    
    // ✅ CRITICAL LOGIC: PRACTICAL CHEQUE VALIDATION & DATA CAPTURE
    // Instead of useless Yes/No checklist, capture actual data for legal validity
    const [chequeBankName, setChequeBankName] = useState(''); // اسم المصرف المسحوب عليه
    const [chequeIssueDate, setChequeIssueDate] = useState(''); // تاريخ إنشاء الصك
    const [chequeNumber, setChequeNumber] = useState(''); // رقم الصك
    
    // === 🛑 REGULAR DOCUMENT BLOCKER ===
    const [showAbsenteeModal, setShowAbsenteeModal] = useState(false);
    const [absenteeChecks, setAbsenteeChecks] = useState({
        isOutsideIraq: false,
        isAddressUnknown: false,
        isDiedDuringNotice: false
    });
    const [isDocumentBlocked, setIsDocumentBlocked] = useState(false);
    
    // === PHASE 31: SHARIA DEED SPECIFIC INPUTS ===
    const [dowryReason, setDowryReason] = useState<'طلاق' | 'وفاة'>('طلاق'); // Deferred Dowry reason
    const [monthlyAlimonyAmount, setMonthlyAlimonyAmount] = useState(''); // For حجة نفقة
    const [guardianshipDetails, setGuardianshipDetails] = useState(''); // For حجة حضانة/وصاية
    
    // === MASTER PHASE: SHARIA DEED DETAILS (Will & Takharuj only) ===
    const [shariaDeedDetails, setShariaDeedDetails] = useState(''); // تفاصيل الحجة
    
    // === LAWYER FEES TOGGLE (أتعاب المحاماة) ===
    const [includeLawyerFees, setIncludeLawyerFees] = useState(false);
    const [lawyerFeesAmount, setLawyerFeesAmount] = useState('');
    
    // === CLIENT FEES (أتعاب من الموكل) ===
    const [clientFeesAmount, setClientFeesAmount] = useState('');
    
    // === IDDAH ALIMONY (نفقة عدة) ===
    const [iddahAlimonyAmount, setIddahAlimonyAmount] = useState('');
    
    // === 🎯 CRITICAL: SMART ALIMONY CALCULATOR (2026-03-12) ===
    // The Matrix Inputs for Accurate Accumulation Calculation
    const [alimonyBeneficiary, setAlimonyBeneficiary] = useState<'زوجة فقط' | 'أولاد فقط' | 'زوجة وأولاد'>('زوجة وأولاد');
    const [alimonyLawsuitDate, setAlimonyLawsuitDate] = useState(''); // تاريخ إقامة الدعوى
    const [alimonyExecutionDate, setAlimonyExecutionDate] = useState(getLocalTodayYmd()); // تاريخ احتساب التنفيذ
    const [alimonyWifeMonthly, setAlimonyWifeMonthly] = useState(''); // مقدار نفقة الزوجة الشهرية
    const [alimonyChildrenMonthly, setAlimonyChildrenMonthly] = useState(''); // مقدار نفقة الأولاد الشهرية
    const [alimonyChildrenCount, setAlimonyChildrenCount] = useState('1'); // 🆕 V11: عدد الأولاد المحكوم لهم
    const [alimonyPastLawSystem, setAlimonyPastLawSystem] = useState<'قانون الأحوال الشخصية 1959' | 'الفقه الجعفري'>('قانون الأحوال الشخصية 1959');
    const [alimonyPastStartDate, setAlimonyPastStartDate] = useState(''); // تاريخ استحقاق النفقة الماضية
    const [pastWifeAlimonyAmount, setPastWifeAlimonyAmount] = useState(''); // 🆕 V21: مقدار النفقة الماضية المحكوم بها للزوجة
    const [pastChildrenAlimonyAmount, setPastChildrenAlimonyAmount] = useState(''); // 🆕 V21: مقدار النفقة الماضية المحكوم بها للأولاد
    // Dowry amount (مهر) or Compensation
    const [claimAmount, setClaimAmount] = useState('');

    const alimonyCalcClaimType =
        activeClaimTypes.includes('نفقة') || claimType === 'نفقة' || activeClaimTypes.includes('نفقة ماضية')
            ? 'نفقة'
            : claimType;

    /** النفقة الماضية مطالبة منفصلة — تُفعَّل في الحاسبة فقط عند اختيار «نفقة ماضية» */
    const alimonyIncludesPastCalc = activeClaimTypes.includes('نفقة ماضية');

    const { calculatedAlimonyNew } = useAlimonyCalculator(
        alimonyCalcClaimType,
        alimonyLawsuitDate,
        alimonyExecutionDate,
        alimonyWifeMonthly,
        alimonyChildrenMonthly,
        alimonyChildrenCount,
        alimonyIncludesPastCalc,
        alimonyPastLawSystem,
        alimonyPastStartDate,
        pastWifeAlimonyAmount,
    );

    /** إجمالي المطالبة المالية لاستخدام القسمة / التضامن */
    const resolveGlobalClaimTotalNumber = useCallback((): number => {
        const types = activeClaimTypes.length > 0 ? activeClaimTypes : claimType ? [claimType] : [];
        let sum = 0;
        for (const ct of types) {
            if (ct === 'نفقة' || ct === 'حجة نفقة اتفاقية') {
                sum += Math.round(calculatedAlimonyNew?.baseAccumulation ?? 0);
                continue;
            }
            if (ct === 'نفقة ماضية') {
                sum +=
                    Math.round(calculatedAlimonyNew?.pastAccumulation ?? 0) ||
                    parseMoneyInput(claimAmountsByType[ct] ?? '');
                continue;
            }
            if (ct === 'أثاث زوجية') {
                continue;
            }
            if (claimUsesMonetaryAmountField(ct)) {
                sum += parseMoneyInput(claimAmountsByType[ct] ?? totalAmount) || parseMoneyInput(claimAmount);
            }
        }
        return sum;
    }, [
        claimType,
        claimAmount,
        claimAmountsByType,
        calculatedAlimonyNew,
        activeClaimTypes,
        maritalFurnitureItems,
        totalAmount,
    ]);

    useEffect(() => {
        if (claimType !== 'مشاهدة') {
            setVisitationChildrenNames(['']);
            setVisitationScheduleDraft(createEmptyVisitationScheduleDraft());
        }
        if (claimType !== 'تسليم ولد') {
            setCustodyWardNames(['']);
        }
    }, [claimType]);

    useEffect(() => {
        if (!isOpen) {
            setDocTypeSheetOpen(false);
            setClaimTypeSheetOpen(false);
            setAdditionalCreditors([]);
            setAdditionalDebtorsForm([]);
            setIsSolidaryLiability(false);
        }
    }, [isOpen]);

    const { imprisonmentStatus, financialSplitHint } = useImprisonmentEligibility(
        claimType,
        totalAmount,
        isSolidaryLiability,
        additionalDebtorsForm.length,
        debtors
    );

    // === FORMATTING ===
    const formatCurrency = (value: string) => {
        const number = value.replace(/\D/g, '');
        return number.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
        const rawValue = e.target.value.replace(/,/g, '');
        if (!isNaN(Number(rawValue))) {
            setter(rawValue);
        }
    };

    const {
        classificationOptionsList,
        claimTypeOptionsList,
        currentDocTypeLabel,
        currentClaimTypeLabel,
        getClassificationOptions,
        getClaimTypeOptions,
    } = useExecutionCreationFormOptions(docType, classification, claimType, activeClaimTypes);

    const hasLegalEntityDebtor = useMemo(
        () =>
            [...debtors, ...additionalDebtorsForm].some((d) =>
                isLegalEntityDebtorKind(
                    normalizeDebtorEntityKind(
                        (d as { entityKind?: string; entityType?: string; type?: string }).entityKind ??
                            (d as { entityType?: string }).entityType ??
                            ((d as { type?: string }).type === 'company'
                                ? 'legal_entity'
                                : 'natural_person')
                    )
                )
            ),
        [debtors, additionalDebtorsForm]
    );

    const visibleClassificationOptions = useMemo(() => {
        if (hasLegalEntityDebtor) {
            return classificationOptionsList.filter((o) => o.value === 'مدني');
        }
        return classificationOptionsList;
    }, [classificationOptionsList, hasLegalEntityDebtor]);

    useEffect(() => {
        if (!hasLegalEntityDebtor) return;
        const needsClassification = ['قرارات وأحكام المحاكم', 'تنفيذ الأحكام الأجنبية'].includes(
            docType
        );
        if (!needsClassification) return;
        if (classification === 'مدني') return;
        setClassification('مدني');
        setActiveClaimTypes([]);
        setClaimType('');
    }, [hasLegalEntityDebtor, docType, classification]);

    const effectiveClaimTypes = activeClaimTypes.length > 0 ? activeClaimTypes : claimType ? [claimType] : [];
    const nonFinancialLawyerFeesClaims = new Set([
        'تسليم ولد',
        'تسليم طفل',
        'مشاهدة',
        'استصحاب',
        'مبيت',
        'مطاوعة',
        'حجة وصاية',
        'أثاث زوجية',
    ]);
    const showLawyerFeesToggle =
        effectiveClaimTypes.length > 0 &&
        effectiveClaimTypes.some((ct) => !nonFinancialLawyerFeesClaims.has(ct));
    const hasActiveClaim = (ct: string) => effectiveClaimTypes.includes(ct);
    const financialAmountClaimTypes = effectiveClaimTypes.filter(claimHasFinancialAmountSection);
    const showMultiClaimAggregatePanel = financialAmountClaimTypes.length > 1;
    const claimSectionCardClass = showMultiClaimAggregatePanel ? ecg.subCard : ecg.card;
    const aggregatedClaimTotalDisplay = resolveGlobalClaimTotalNumber();
    const showShariaLinkedClaimPanel =
        docType === 'قرارات وأحكام المحاكم' && classification === 'شرعي';
    const shariaLinkedClaimOptions = showShariaLinkedClaimPanel
        ? claimTypeOptionsList.filter((o) => isShariaLinkedFinancialClaim(o.value))
        : [];
    const shariaExclusiveClaimOptions = showShariaLinkedClaimPanel
        ? claimTypeOptionsList.filter((o) => !isShariaLinkedFinancialClaim(o.value))
        : claimTypeOptionsList;

    useEffect(() => {
        if (!claimTypeSheetOpen) return;
        setLinkedClaimDraft(activeClaimTypes.filter((ct) => isShariaLinkedFinancialClaim(ct)));
    }, [claimTypeSheetOpen, activeClaimTypes]);

    const toggleLinkedClaimDraft = useCallback((value: string) => {
        setLinkedClaimDraft((prev) =>
            prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]
        );
    }, []);

    const saveLinkedClaimDraft = useCallback(() => {
        if (linkedClaimDraft.length === 0) return;
        setActiveClaimTypes(linkedClaimDraft);
        setClaimAmountsByType((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((key) => {
                if (!linkedClaimDraft.includes(key)) delete next[key];
            });
            return next;
        });
        setClaimTypeSheetOpen(false);
    }, [linkedClaimDraft]);

    const removeActiveClaimType = useCallback((value: string) => {
        if (value === 'تسليم شيء معين') {
            setSpecificDeliveryItemNature('');
        }
        setActiveClaimTypes((prev) => {
            const next = prev.filter((x) => x !== value);
            setClaimAmountsByType((amt) => {
                const cleaned = { ...amt };
                delete cleaned[value];
                return cleaned;
            });
            return next;
        });
    }, []);

    useEffect(() => {
        setClaimType(activeClaimTypes[0] ?? '');
    }, [activeClaimTypes]);

    useEffect(() => {
        if (!activeClaimTypes.includes('نفقة ماضية') || activeClaimTypes.includes('نفقة')) return;
        const past = calculatedAlimonyNew?.pastAccumulation;
        if (!past || past <= 0) return;
        const next = String(Math.round(past));
        setClaimAmountsByType((prev) =>
            prev['نفقة ماضية'] === next ? prev : { ...prev, 'نفقة ماضية': next }
        );
    }, [activeClaimTypes, calculatedAlimonyNew?.pastAccumulation, alimonyLawsuitDate, alimonyPastStartDate]);

    useEffect(() => {
        const types = activeClaimTypes.length > 0 ? activeClaimTypes : claimType ? [claimType] : [];
        if (!types.some((ct) => isFinancialClaimForPartySplit(ct))) {
            setIsSolidaryLiability(false);
        }
    }, [claimType, activeClaimTypes]);
    
    const handleDocTypeChange = (newDocType: string) => {
        setDocType(newDocType);
        setClassification('');
        setClaimType('');
        setActiveClaimTypes([]);
        setClaimAmountsByType({});
        setLinkedClaimDraft([]);
        
        // ✅ CRITICAL LOGIC: DYNAMIC FIELD MORPHING (COMMERCIAL PAPERS)
        if (newDocType === 'الأوراق التجارية') {
            setClaimType('استحصال دين مالي');
            setClassification('none');
            setShowChequeValidatorModal(true);
        }
        
        if (newDocType === 'السندات المتضمنة إقراراً بدين') {
            setShowAbsenteeModal(true);
        }
        
        const needsClassification = ['قرارات وأحكام المحاكم', 'تنفيذ الأحكام الأجنبية'].includes(newDocType);
        
        if (!needsClassification) {
            setClassification('none');
        }
    };
    
    const handleClassificationChange = (newClassification: string) => {
        setClassification(newClassification);
        setClaimType('');
        setActiveClaimTypes([]);
        setClaimAmountsByType({});
        setLinkedClaimDraft([]);
    };

    const { currentLegalInfo } = useLegalWarnings(claimType);

    const { calculateStatuteOfLimitations, calculateNotificationPeriod } = useStatuteCalculations(
        lastProcedureDate,
        claimType,
        notificationDate
    );

    // === PHASE 25: AUTO-SELECT SINGLE OPTIONS ===
    useEffect(() => {
        if (docType) {
            const classOpts = getClassificationOptions();
            if (classOpts.length === 1 && !classification) {
                setClassification(classOpts[0].value);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [docType]);

    useEffect(() => {
        if (classification) {
            const claimOpts = getClaimTypeOptions();
            if (claimOpts.length === 1 && activeClaimTypes.length === 0) {
                setActiveClaimTypes([claimOpts[0].value]);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [classification, activeClaimTypes.length]);

    /** إزالة مطالبات لم تعد ضمن الخيارات (مثل تسليم شيء معين بعد إخفائه من المدني) */
    useEffect(() => {
        const allowed = new Set(claimTypeOptionsList.map((o) => o.value));
        setActiveClaimTypes((prev) => {
            const next = prev.filter((ct) => allowed.has(ct));
            return next.length === prev.length ? prev : next;
        });
        if (claimType && !allowed.has(claimType)) {
            setClaimType('');
        }
    }, [claimTypeOptionsList, claimType]);

    // === PHASE 17 + تعدد الخصوم: دائن/مدين أساسي + مصفوفات امتداد ===
    const addCreditor = () => {
        const id = `ac_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        setAdditionalCreditors((prev) => [
            ...prev,
            {
                id,
                name: '',
                phone: '',
                address: '',
                occupation: 'كاسب',
                isClient: false,
            },
        ]);
    };

    const removeAdditionalCreditor = (id: string) => {
        setAdditionalCreditors((prev) => prev.filter((c) => c.id !== id));
    };

    const coerceDebtorClientRow = useCallback(
        <T extends { id: number | string; occupation: string; isClient: boolean }>(
            row: T,
            makeClient: boolean
        ): T => {
            if (!makeClient) return { ...row, isClient: false };
            const loose = row as T & {
                entityKind?: string;
                entityType?: string;
                type?: string;
            };
            const kind = normalizeDebtorEntityKind(
                loose.entityKind ??
                    loose.entityType ??
                    (loose.type === 'company' ? 'legal_entity' : 'natural_person')
            );
            if (kind === 'legal_entity') {
                return {
                    ...row,
                    isClient: true,
                    entityKind: 'natural_person',
                    entityType: 'natural_person',
                    type: 'individual',
                    occupation: row.occupation === 'معنوي' ? 'كاسب' : row.occupation,
                } as T;
            }
            return { ...row, isClient: true };
        },
        []
    );

    const applyExclusiveClient = useCallback(
        (side: 'creditor' | 'debtor', partyId: number | string, isClient: boolean) => {
            if (!isClient) {
                if (side === 'creditor') {
                    if (typeof partyId === 'number') {
                        setCreditors((c0) =>
                            c0.map((c) => (c.id === partyId ? { ...c, isClient: false } : c))
                        );
                    } else {
                        setAdditionalCreditors((c0) =>
                            c0.map((c) => (c.id === partyId ? { ...c, isClient: false } : c))
                        );
                    }
                } else if (typeof partyId === 'number') {
                    setDebtors((d0) =>
                        d0.map((d) => (d.id === partyId ? { ...d, isClient: false } : d))
                    );
                } else {
                    setAdditionalDebtorsForm((d0) =>
                        d0.map((d) => (d.id === partyId ? { ...d, isClient: false } : d))
                    );
                }
                return;
            }

            setCreditors((c0) =>
                c0.map((c) => ({ ...c, isClient: side === 'creditor' && c.id === partyId }))
            );
            setAdditionalCreditors((c0) =>
                c0.map((c) => ({ ...c, isClient: side === 'creditor' && c.id === partyId }))
            );
            setDebtors((d0) =>
                d0.map((d) =>
                    side === 'debtor' && d.id === partyId
                        ? coerceDebtorClientRow(d, true)
                        : { ...d, isClient: false }
                )
            );
            setAdditionalDebtorsForm((d0) =>
                d0.map((d) =>
                    side === 'debtor' && d.id === partyId
                        ? coerceDebtorClientRow(d, true)
                        : { ...d, isClient: false }
                )
            );
        },
        [coerceDebtorClientRow]
    );

    const updateAdditionalCreditor = useCallback(
        (id: string, field: string, value: string | boolean | number) => {
            if (field === 'isClient') {
                applyExclusiveClient('creditor', id, Boolean(value));
                return;
            }
            setAdditionalCreditors((prev) =>
                prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
            );
        },
        [applyExclusiveClient]
    );

    const updateCreditor = useCallback((id: number, field: string, value: string | boolean | number) => {
        if (field === 'isClient') {
            applyExclusiveClient('creditor', id, Boolean(value));
            return;
        }
        setCreditors((c0) => c0.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
    }, [applyExclusiveClient]);

    const addDebtor = () => {
        const id = `ad_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        setAdditionalDebtorsForm((prev) => [
            ...prev,
            {
                id,
                name: '',
                phone: '',
                address: '',
                occupation: 'موظف',
                isClient: false,
            },
        ]);
    };

    const removeAdditionalDebtor = (id: string) => {
        setAdditionalDebtorsForm((prev) => prev.filter((d) => d.id !== id));
    };

    const updateAdditionalDebtor = useCallback(
        (id: string, field: string, value: string | boolean | number) => {
            if (field === 'isClient') {
                applyExclusiveClient('debtor', id, Boolean(value));
                return;
            }
            setAdditionalDebtorsForm((prev) =>
                prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
            );
        },
        [applyExclusiveClient]
    );

    const updateDebtor = useCallback((id: number, field: string, value: string | boolean | number) => {
        if (field === 'isClient') {
            applyExclusiveClient('debtor', id, Boolean(value));
            return;
        }
        setDebtors((d0) => d0.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
    }, [applyExclusiveClient]);

    // === DEVELOPER MODE: AUTO-FILL FUNCTION ===
    // ✅ IRAQI LAW UPDATE: Enhanced with new Sharia Deed examples
    const fillMockData = () => {
        // Randomize between different document types for testing
        const mockScenarios = [
            // Scenario 1: Sharia Deed - Deferred Dowry
            () => {
                setDirectorate('تنفيذ الكرخ');
                setFileNumber('4567/2026');
                setCreditors([
                    { id: 1, name: 'فاطمة أحمد المحمود', phone: '07701234567', address: 'بغداد، الكاظمية', occupation: 'كاسب', isClient: true }
                ]);
                setDebtors([
                    { 
                        id: 1, 
                        name: 'علي حسن الجبوري', 
                        phone: '07901234567', 
                        address: 'بغداد، الكرادة', 
                        occupation: 'موظف', 
                        isClient: false
                    }
                ]);
                setDocType('الحجج الشرعية');
                setClaimType('حجة زواج - مهر مؤجل');
                setShariaDeedNumber('1234');
                setShariaRegisterNumber('56');
                setShariaIssueDate('2020-05-15');
                setTotalAmount('10000000');
                setDowryReason('طلاق');
                setLastProcedureDate('2025-01-15');
                SmartToast.success('✅ سيناريو: حجة زواج - مهر مؤجل (طلاق)');
            },
            
            // Scenario 2: Sharia Deed - Immediate Dowry
            () => {
                setDirectorate('تنفيذ الرصافة');
                setFileNumber('2341/2026');
                setCreditors([
                    { id: 1, name: 'زينب محمد الربيعي', phone: '07751234567', address: 'بغداد، المنصور', occupation: 'موظف', isClient: true }
                ]);
                setDebtors([
                    { 
                        id: 1, 
                        name: 'حسين سعد العراقي', 
                        phone: '07851234567', 
                        address: 'بغداد، الأعظمية', 
                        occupation: 'موظف', 
                        isClient: false
                    }
                ]);
                setDocType('الحجج الشرعية');
                setClaimType('حجة زواج - مهر معجل');
                setShariaDeedNumber('5678');
                setShariaRegisterNumber('89');
                setShariaIssueDate('2023-03-20');
                setTotalAmount('5000000');
                setNotificationDate('2026-03-05');
                SmartToast.success('✅ سيناريو: حجة زواج - مهر معجل غير مقبوض');
            },
            
            // Scenario 3: Sharia Deed - Consensual Alimony
            () => {
                setDirectorate('تنفيذ الكرخ');
                setFileNumber('7890/2026');
                setCreditors([
                    { id: 1, name: 'سارة علي الدليمي', phone: '07801234567', address: 'بغداد، الحرية', occupation: 'كاسب', isClient: true }
                ]);
                setDebtors([
                    { 
                        id: 1, 
                        name: 'أحمد كريم النعيمي', 
                        phone: '07951234567', 
                        address: 'بغداد، الدورة', 
                        occupation: 'موظف', 
                        isClient: false
                    }
                ]);
                setDocType('الحجج الشرعية');
                setClaimType('حجة نفقة اتفاقية');
                setShariaDeedNumber('3456');
                setShariaRegisterNumber('78');
                setShariaIssueDate('2025-01-10');
                setShariaIssuingCourt('محكمة الأحوال الشخصية في الكرخ');
                setTotalAmount('500000');
                setLastProcedureDate('2026-02-01');
                setNotificationDate('2026-03-08');
                SmartToast.success('✅ سيناريو: حجة نفقة اتفاقية');
            },
            
            // Scenario 4: Court Judgment - Civil Debt
            () => {
                setDirectorate('تنفيذ الكرخ');
                setFileNumber('1540/2026');
                setCreditors([
                    { id: 1, name: 'أحمد محمود العراقي', phone: '07701234567', address: 'بغداد، المنصور', occupation: 'كاسب', isClient: true }
                ]);
                setDebtors([
                    { 
                        id: 1, 
                        name: 'محمود سعيد السامرائي', 
                        phone: '07901234567', 
                        address: 'بغداد، الكرادة', 
                        occupation: 'موظف', 
                        isClient: false
                    }
                ]);
                setDocType('قرارات وأحكام المحاكم');
                setDocNumber('1234/س/2025');
                setJudgmentDate('2025-12-15');
                setClassification('مدني');
                setClaimType('استحصال دين مالي');
                setTotalAmount('5000000');
                setClientFeesAmount('500000');
                setIncludeLawyerFees(true);
                setLawyerFeesAmount('150000');
                SmartToast.success('✅ سيناريو: قرار محكمة مدني - دين مالي');
            }
        ];
        
        // Pick a random scenario
        const randomIndex = Math.floor(Math.random() * mockScenarios.length);
        mockScenarios[randomIndex]();
    };

    // === SUBMIT HANDLER WITH ENCRYPTION ===
    const handleSubmit = async () => {
        // Validation
        if (!directorate.trim()) {
            SmartToast.error('⚠️ يرجى كتابة اسم مديرية التنفيذ');
            return;
        }

        if (!fileNumber.trim()) {
            SmartToast.error('⚠️ يرجى إدخال رقم الإضبارة والسنة');
            return;
        }

        // ✅ PROMPT 2: Check if at least one party is marked as client
        const hasClient =
            creditors.some((c) => c.isClient) ||
            additionalCreditors.some((c) => c.isClient) ||
            debtors.some((d) => d.isClient) ||
            additionalDebtorsForm.some((d) => d.isClient);
        if (!hasClient) {
            SmartToast.error('⚠️ يرجى تحديد موكلك من خلال اختيار "موكلي" لأحد الأطراف على الأقل');
            return;
        }

        if (!creditors[0]?.name.trim()) {
            SmartToast.error('⚠️ يرجى إكمال اسم الدائن');
            return;
        }

        for (let i = 0; i < additionalCreditors.length; i++) {
            if (!additionalCreditors[i].name.trim()) {
                SmartToast.error(`⚠️ يرجى إكمال اسم ${i + 2}- دائن`);
                return;
            }
        }

        if (!debtors[0]?.name.trim()) {
            SmartToast.error('⚠️ يرجى إكمال اسم المدين');
            return;
        }
        if (!debtors[0]?.address.trim()) {
            SmartToast.error('⚠️ عنوان المدين مطلوب للتبليغ');
            return;
        }

        for (let i = 0; i < additionalDebtorsForm.length; i++) {
            if (!additionalDebtorsForm[i].name.trim()) {
                SmartToast.error(`⚠️ يرجى إكمال اسم المدين الإضافي ${i + 1}`);
                return;
            }
            if (!additionalDebtorsForm[i].address.trim()) {
                SmartToast.error(`⚠️ عنوان المدين الإضافي ${i + 1} مطلوب للتبليغ`);
                return;
            }
        }

        const pendingClaimTypes =
            activeClaimTypes.length > 0 ? activeClaimTypes : claimType ? [claimType] : [];
        if (
            pendingClaimTypes.includes('تسليم شيء معين') &&
            !specificDeliveryItemNature
        ) {
            SmartToast.error('⚠️ يرجى تحديد طبيعة الشيء (منقول أو غير منقول)');
            return;
        }

        if (isEvictionClaim(claimType)) {
            if (!evictionPropertyNumber.trim()) {
                SmartToast.error('⚠️ رقم العقار (أو رقم الدار) مطلوب لتخلية المأجور');
                return;
            }
            if (!evictionDistrict.trim()) {
                SmartToast.error('⚠️ المقاطعة مطلوبة');
                return;
            }
            if (!evictionPropertyType.trim()) {
                SmartToast.error('⚠️ نوع وجنس العقار مطلوب');
                return;
            }
            if (!evictionFullAddress.trim()) {
                SmartToast.error('⚠️ العنوان الكامل للعين مطلوب');
                return;
            }
        }

        // PHASE 17: Foreign judgment validation
        if (docType === 'تنفيذ الأحكام الأجنبية') {
            if (!foreignData.country.trim()) {
                SmartToast.error('⚠️ يرجى تحديد دولة إصدار الحكم الأجنبي');
                return;
            }
            if (!foreignData.court.trim()) {
                SmartToast.error('⚠️ يرجى تحديد اسم المحكمة المصدرة');
                return;
            }
        }
        
        // 🔍 TARGET FILTER A: Commercial Papers - Endorser Block
        if (docType === 'الأوراق التجارية' && executionTarget === 'المُظَهِّر') {
            SmartToast.error('🛑 يمنع القانون التنفيذ المباشر على المُظَهِّر. يجب إقامة دعوى تجارية في محكمة البداءة أولاً.');
            return;
        }
        
        // 🔍 TARGET FILTER B: Debt Acknowledgments - Non-Joint Guarantor Block
        if (docType === 'السندات المتضمنة إقراراً بدين' && executionTarget === 'كفيل غير متضامن') {
            SmartToast.error('🛑 لا يجوز التنفيذ المباشر. يجب التنفيذ على المدين الأصلي وتجريده من أمواله أولاً.');
            return;
        }
        
        // 🛑 REGULAR DOCUMENT BLOCKER: Hard Block
        if (isDocumentBlocked) {
            SmartToast.error('🛑 توقف: فقدَ هذا السند قوته التنفيذية المباشرة. يجب إقامة دعوى إثبات دين في محكمة البداءة.');
            return;
        }

        if (claimType === 'مشاهدة' || activeClaimTypes.includes('مشاهدة')) {
            const built = buildVisitationScheduleBundle(
                visitationScheduleDraft as VisitationScheduleConfig
            );
            if ('error' in built) {
                SmartToast.error(`⚠️ ${built.error}`);
                return;
            }
        }

        // Parse file number and year
        const fileParts = fileNumber.split('/');
        let extractedNumber = fileParts[0] || fileNumber;
        let extractedYear = fileParts.length > 1 ? fileParts[1] : new Date().getFullYear().toString();

        // Build execution data based on type (PHASE 17: Multi-party + تعدد الخصوم)
        const clientCreditors = [
            ...creditors.filter((c) => c.isClient),
            ...additionalCreditors.filter((c) => c.isClient),
        ];
        const clientDebtors = [...debtors, ...additionalDebtorsForm].filter((d) => d.isClient);
        const representedParty = clientCreditors.length > 0 ? 'creditor' : 'debtor';

        const totalDebtorSlots = 1 + additionalDebtorsForm.length;
        const globalClaimTotal = resolveGlobalClaimTotalNumber();
        const applyPartySplit = isFinancialClaimForPartySplit(claimType) && totalDebtorSlots > 0;
        let debtorAllocatedShares: number[] = Array(totalDebtorSlots).fill(0);
        if (applyPartySplit && globalClaimTotal > 0) {
            if (isSolidaryLiability) {
                debtorAllocatedShares = Array(totalDebtorSlots).fill(globalClaimTotal);
            } else {
                debtorAllocatedShares = splitAmountEqually(globalClaimTotal, totalDebtorSlots);
            }
        }

        const mappedCreditorsForFile = [{ ...creditors[0], type: 'creditor' as any, nationality: '' }];

        let executionData: ExecutionArchiveFile = {
            id: generateExecutionDossierId(),
            directorate,
            fileNumber: extractedNumber.trim(),
            fileYear: extractedYear.trim(),
            // @ts-expect-error - runtime field
            representedParty,
            creditors: mappedCreditorsForFile,
            debtors: debtors,
            creditor: creditors[0],
            debtor: debtors[0],
            docType,
            docNumber,
            judgmentDate,
            status: 'active',
            createdAt: new Date().toISOString(),
            debtorJob: debtors[0]?.occupation || 'كاسب',
        };

        // ✅ CRITICAL LOGIC: Add Commercial Paper Data (Cheque/Bill of Exchange)
        if (docType === 'الأوراق التجارية') {
            executionData.chequeBankName = chequeBankName;
            executionData.chequeIssueDate = chequeIssueDate;
            executionData.chequeNumber = chequeNumber;
            // Override docNumber with chequeNumber for consistency
            executionData.docNumber = chequeNumber;
        }
        
        // PHASE 17: Add foreign judgment data if applicable
        if (docType === 'تنفيذ الأحكام الأجنبية') {
            executionData.foreignData = foreignData;
        }
        
        // PHASE 49: Add Sharia Deed identification if applicable
        if (docType === 'الحجج الشرعية') {
            executionData.shariaDeedNumber = shariaDeedNumber;
            executionData.shariaRegisterNumber = shariaRegisterNumber;
            executionData.shariaIssueDate = shariaIssueDate;
            executionData.shariaIssuingCourt = shariaIssuingCourt;
            
            // MASTER PHASE: Sharia Deed Details (Will & Takharuj)
            if (['حجة وصية', 'حجة تخارج'].includes(claimType)) {
                executionData.shariaDeedDetails = shariaDeedDetails;
            }
        }

        // PHASE 29: Unified claim type logic (+ جمع مطالبات أحوال شخصية المرتبطة)
        const savedClaimTypes =
            activeClaimTypes.length > 0 ? activeClaimTypes : claimType ? [claimType] : [];
        executionData.claimType = savedClaimTypes[0] ?? claimType;
        if (savedClaimTypes.length > 0) {
            (executionData as Record<string, unknown>).claimTypes = savedClaimTypes;
        }
        const parsedClaimAmounts = Object.fromEntries(
            Object.entries(claimAmountsByType)
                .map(([k, v]) => [k, parseMoneyInput(v)] as const)
                .filter(([, n]) => n > 0)
        );
        if (Object.keys(parsedClaimAmounts).length > 0) {
            (executionData as Record<string, unknown>).claimAmountsByType = parsedClaimAmounts;
        }

        // ─── محرك الإحضار: استنتاج تلقائي من نوع المطالبة ومهنة المدين وهدف التنفيذ (دون حقول يدوية) ───
        const inferIsAlimonyClaim = (ct: string) =>
            Boolean(ct?.includes('نفقة') && !ct?.includes('نفقة عدة') && !ct?.includes('مهر'));
        const hasOngoingAlimonyClaim = savedClaimTypes.some((ct) => ct === 'نفقة' || ct === 'حجة نفقة اتفاقية');
        // @ts-expect-error - runtime field
        executionData.summoningClaimNature = deriveMonetaryClaimNature(claimType, null);
        // @ts-expect-error - dynamic runtime property
        executionData.isAlimony =
            hasOngoingAlimonyClaim || savedClaimTypes.some((ct) => inferIsAlimonyClaim(ct));
        const targetHasGuarantor =
            typeof executionTarget === 'string' && executionTarget.includes('كفيل');
        // @ts-expect-error - dynamic runtime property
        executionData.hasGuarantor = targetHasGuarantor;
        const firstDebtorOcc = debtors[0]?.occupation;
        /** بدون إدخال يدوي: نفترض تغطية الراتب عند موظف+نفقة حتى يُثبت العجز لاحقاً من الإضبارة */
        // @ts-expect-error - dynamic runtime property
        executionData.salaryCoversAlimony =
            firstDebtorOcc === 'موظف' && (executionData as any).isAlimony ? true : false;
        executionData.debtors = debtors.map((d, i) => {
            const emp = d.occupation === 'موظف';
            return {
                ...d,
                employmentType: d.occupation,
                isEmployee: emp,
                employmentInitialWasEmployee: emp,
                hasGuarantor: i === 0 ? targetHasGuarantor : false,
                ...(applyPartySplit
                    ? { allocated_debt: debtorAllocatedShares[i] ?? 0, paid_amount: 0 }
                    : {}),
            };
        });
        if (executionData.debtor && executionData.debtors[0]) {
            executionData.debtor = executionData.debtors[0];
        }

        const additionalDebtorRecords = additionalDebtorsForm.map((d, i) => {
            const emp = d.occupation === 'موظف';
            const occ = d.occupation === 'موظف' ? 'موظف' : 'كاسب';
            return {
                id: String(d.id),
                name: d.name.trim(),
                phone: d.phone.trim() || undefined,
                address: d.address.trim() || undefined,
                occupation: occ,
                employmentType: occ,
                isEmployee: emp,
                employmentInitialWasEmployee: emp,
                status: 'Active' as const,
                allocated_debt: applyPartySplit ? debtorAllocatedShares[i + 1] ?? 0 : 0,
                paid_amount: 0,
            };
        });

        let trimmedAdditionalCreditors = additionalCreditors
            .filter((c) => c.name.trim())
            .map((c) => {
                const emp = c.occupation === 'موظف';
                const occ = c.occupation === 'موظف' ? 'موظف' : 'كاسب';
                return {
                    id: c.id,
                    name: c.name.trim(),
                    phone: c.phone.trim() || undefined,
                    address: c.address.trim() || undefined,
                    occupation: occ,
                    employmentType: occ,
                    isEmployee: emp,
                    isClient: c.isClient || false,
                    paid_amount: 0,
                };
            });

        const totalCreditorSlots = 1 + trimmedAdditionalCreditors.length;
        const creditorClaimTotal =
            globalClaimTotal > 0
                ? globalClaimTotal
                : parseMoneyInput(totalAmount) > 0
                  ? parseMoneyInput(totalAmount)
                  : parseMoneyInput(claimAmount);
        if (creditorClaimTotal > 0 && totalCreditorSlots >= 1) {
            const creditorShares = splitAmountEqually(creditorClaimTotal, totalCreditorSlots);
            const primaryCreditor = {
                ...executionData.creditors[0],
                allocated_debt: creditorShares[0] ?? 0,
                paid_amount: 0,
            };
            executionData.creditors = [primaryCreditor];
            executionData.creditor = primaryCreditor;
            trimmedAdditionalCreditors = trimmedAdditionalCreditors.map((c, i) => ({
                ...c,
                allocated_debt: creditorShares[i + 1] ?? 0,
            }));
        }

        if (
            trimmedAdditionalCreditors.length > 0 ||
            additionalDebtorRecords.length > 0 ||
            isSolidaryLiability
        ) {
            (executionData as any).party_multiplicity = {
                additionalCreditors: trimmedAdditionalCreditors,
                additionalDebtors: additionalDebtorRecords,
                isSolidaryLiability,
            };
        }

        // PHASE 30: Financial amounts (expanded list + MASTER PHASE: All 3 Sharia Deeds)
        const aggregatedClaimTotal = resolveGlobalClaimTotalNumber();
        if (aggregatedClaimTotal > 0) {
            executionData.totalAmount = aggregatedClaimTotal;
        } else if (parseMoneyInput(totalAmount) > 0) {
            executionData.totalAmount = parseMoneyInput(totalAmount);
        } else if (parseMoneyInput(claimAmount) > 0) {
            executionData.totalAmount = parseMoneyInput(claimAmount);
        }
        
        // === 🎯 CRITICAL: SMART ALIMONY DATA SAVE (2026-03-12) ===
        if (hasOngoingAlimonyClaim || claimType === 'نفقة') {
            // النظام الذكي الجديد
            const parsedChildrenCount = Math.max(1, parseInt(alimonyChildrenCount, 10) || 1);
            const parsedWifeMonthly = parseFloat(alimonyWifeMonthly) || 0;
            const parsedChildrenMonthly = parseFloat(alimonyChildrenMonthly) || 0;

            executionData.alimony = {
                beneficiary: alimonyBeneficiary,
                lawsuitDate: alimonyLawsuitDate,
                executionDate: alimonyExecutionDate,
                wifeMonthly: alimonyWifeMonthly,
                childrenMonthly: alimonyChildrenMonthly,
                childrenCount: parsedChildrenCount,
                hasPastWife: alimonyIncludesPastCalc,
                pastLawSystem: alimonyPastLawSystem,
                pastStartDate: alimonyPastStartDate,
                pastWifeMonthly: pastWifeAlimonyAmount || alimonyWifeMonthly,
                calculated: calculatedAlimonyNew ? {
                    baseDurationMonths: calculatedAlimonyNew.baseDurationMonths,
                    baseDurationDays: calculatedAlimonyNew.baseDurationDays,
                    baseAccumulation: calculatedAlimonyNew.baseAccumulation,
                    wifeBaseAccumulation: calculatedAlimonyNew.wifeBaseAccumulation,
                    childrenBaseAccumulation: calculatedAlimonyNew.childrenBaseAccumulation,
                    pastDurationDays: calculatedAlimonyNew.pastDurationDays,
                    pastDurationMonths: calculatedAlimonyNew.pastDurationMonths,
                    pastDurationMonthsRaw: calculatedAlimonyNew.pastDurationMonthsRaw,
                    pastYearCapApplied: calculatedAlimonyNew.pastYearCapApplied,
                    pastAccumulation: calculatedAlimonyNew.pastAccumulation,
                    pastMonthlyUsed: calculatedAlimonyNew.pastMonthlyUsed,
                    totalAccumulated: calculatedAlimonyNew.totalAccumulated,
                    monthlyOngoing: calculatedAlimonyNew.monthlyOngoing,
                    legalCapApplied: calculatedAlimonyNew.legalCapApplied,
                    explanation: calculatedAlimonyNew.explanation,
                } : null,
            };
            
            executionData.monthlyAlimony = calculatedAlimonyNew?.monthlyOngoing || 0;
            executionData.monthlyWifeAlimony = parsedWifeMonthly;
            executionData.monthlyChildrenAlimony = parsedChildrenMonthly;
            executionData.childrenCount = parsedChildrenCount;
            if (alimonyIncludesPastCalc && calculatedAlimonyNew?.pastAccumulation) {
                executionData.pastWifeAlimony = Math.round(calculatedAlimonyNew.pastAccumulation);
            }
            if (alimonyIncludesPastCalc && (calculatedAlimonyNew?.pastAccumulation ?? 0) > 0) {
                (executionData as Record<string, unknown>).pastAlimonyClaim = {
                    pastLawSystem: alimonyPastLawSystem,
                    pastStartDate: alimonyPastStartDate,
                    lawsuitDate: alimonyLawsuitDate,
                    pastWifeMonthly: pastWifeAlimonyAmount || alimonyWifeMonthly,
                    amount: Math.round(calculatedAlimonyNew?.pastAccumulation ?? 0),
                    calculatedMonths: calculatedAlimonyNew?.pastDurationMonths ?? 0,
                    pastDurationDays: calculatedAlimonyNew?.pastDurationDays ?? 0,
                    pastYearCapApplied: calculatedAlimonyNew?.pastYearCapApplied ?? false,
                };
            }
            if (savedClaimTypes.length <= 1) {
                executionData.totalAmount = Math.max(
                    0,
                    Math.round(
                        savedClaimTypes.includes('نفقة ماضية')
                            ? (calculatedAlimonyNew?.pastAccumulation ?? 0)
                            : (calculatedAlimonyNew?.baseAccumulation ??
                              calculatedAlimonyNew?.totalAccumulated ??
                              0)
                    )
                );
            } else if (aggregatedClaimTotal > 0) {
                executionData.totalAmount = aggregatedClaimTotal;
            }
        }

        if (savedClaimTypes.includes('نفقة ماضية')) {
            const pastTotal =
                Math.round(calculatedAlimonyNew?.pastAccumulation ?? 0) ||
                parseMoneyInput(claimAmountsByType['نفقة ماضية'] ?? '');
            (executionData as Record<string, unknown>).pastAlimonyClaim = {
                pastLawSystem: alimonyPastLawSystem,
                pastStartDate: alimonyPastStartDate,
                lawsuitDate: alimonyLawsuitDate,
                pastWifeMonthly: pastWifeAlimonyAmount || alimonyWifeMonthly,
                amount: pastTotal,
                calculatedMonths: calculatedAlimonyNew?.pastDurationMonths ?? 0,
                pastDurationDays: calculatedAlimonyNew?.pastDurationDays ?? 0,
                pastYearCapApplied: calculatedAlimonyNew?.pastYearCapApplied ?? false,
            };
            if (pastTotal > 0) {
                executionData.pastWifeAlimony = pastTotal;
            }
            // مطالبة نفقة ماضية منفصلة — لقطة calculated للمركز المالي
            if (!hasOngoingAlimonyClaim && (pastTotal > 0 || calculatedAlimonyNew)) {
                executionData.alimony = {
                    beneficiary: alimonyBeneficiary || 'زوجة فقط',
                    lawsuitDate: alimonyLawsuitDate,
                    executionDate: alimonyExecutionDate,
                    hasPastWife: true,
                    pastLawSystem: alimonyPastLawSystem,
                    pastStartDate: alimonyPastStartDate,
                    pastWifeMonthly: pastWifeAlimonyAmount || alimonyWifeMonthly,
                    calculated: calculatedAlimonyNew
                        ? {
                              baseDurationMonths: 0,
                              baseDurationDays: 0,
                              baseAccumulation: 0,
                              wifeBaseAccumulation: 0,
                              childrenBaseAccumulation: 0,
                              pastDurationDays: calculatedAlimonyNew.pastDurationDays,
                              pastDurationMonths: calculatedAlimonyNew.pastDurationMonths,
                              pastDurationMonthsRaw: calculatedAlimonyNew.pastDurationMonthsRaw,
                              pastYearCapApplied: calculatedAlimonyNew.pastYearCapApplied,
                              pastAccumulation: pastTotal || calculatedAlimonyNew.pastAccumulation,
                              pastMonthlyUsed: calculatedAlimonyNew.pastMonthlyUsed,
                              totalAccumulated: pastTotal || calculatedAlimonyNew.pastAccumulation,
                              monthlyOngoing: 0,
                              legalCapApplied: calculatedAlimonyNew.legalCapApplied,
                              explanation: calculatedAlimonyNew.explanation,
                          }
                        : pastTotal > 0
                          ? {
                                baseDurationMonths: 0,
                                baseDurationDays: 0,
                                baseAccumulation: 0,
                                wifeBaseAccumulation: 0,
                                childrenBaseAccumulation: 0,
                                pastAccumulation: pastTotal,
                                totalAccumulated: pastTotal,
                                monthlyOngoing: 0,
                            }
                          : null,
                };
                if (savedClaimTypes.length <= 1 && pastTotal > 0) {
                    executionData.totalAmount = pastTotal;
                }
            }
        }
        
        // مشاهدة واستصحاب: جدولة + أسماء الأولاد
        if (savedClaimTypes.includes('مشاهدة') || claimType === 'مشاهدة') {
            const built = buildVisitationScheduleBundle(
                visitationScheduleDraft as VisitationScheduleConfig
            );
            if ('bundle' in built) {
                (executionData as Record<string, unknown>).visitationSchedule = built.bundle;
                executionData.includesSleepover =
                    visitationScheduleDraft.decisionMode === 'viewing_pickup_sleepover';
            }
            const trimmedChildNames = visitationChildrenNames.map((n) => n.trim()).filter(Boolean);
            if (trimmedChildNames.length > 0) {
                (executionData as any).visitationChildrenNames = trimmedChildNames;
            }
        }

        if (savedClaimTypes.includes('تسليم ولد') || claimType === 'تسليم ولد') {
            const trimmedWards = custodyWardNames.map((n) => n.trim()).filter(Boolean);
            if (trimmedWards.length > 0) {
                (executionData as any).custodyWardNames = trimmedWards;
            }
        }

        if (isEvictionClaim(claimType)) {
            (executionData as any).property_number = evictionPropertyNumber.trim();
            (executionData as any).district = evictionDistrict.trim();
            (executionData as any).property_type = evictionPropertyType.trim();
            (executionData as any).full_address = evictionFullAddress.trim();
            (executionData as any).eviction_premises_use = evictionPremisesUse;
            (executionData as any).eviction_lawyer_fee_waived_at_intake = !includeLawyerFees;
        }

        if (
            savedClaimTypes.includes('تسليم شيء معين') &&
            (specificDeliveryItemNature === 'movable' || specificDeliveryItemNature === 'immovable')
        ) {
            executionData.specificDeliveryItemNature = specificDeliveryItemNature;
        }
        
        // Furniture details
        if (claimType === 'أثاث زوجية') {
            const normalizedFurniture = normalizeMaritalFurnitureItems(maritalFurnitureItems);
            executionData.maritalFurnitureItems = normalizedFurniture;
            executionData.furnitureValue = sumMaritalFurnitureTotal(normalizedFurniture);
            executionData.furnitureDetails = normalizedFurniture
                .map((row) => `${row.name} × ${row.quantity}`)
                .join('؛ ');
            executionData.debtAmount = 0;
            executionData.totalAmount = 0;
            (executionData as { total_remaining_balance?: number }).total_remaining_balance = 0;
            (executionData as { paidDebt?: number }).paidDebt = 0;
        }
        
        // PHASE 30: Iddah alimony now handled via totalAmount in financial claims section
        
        // Lawyer fees
        if (includeLawyerFees) {
            executionData.includeLawyerFees = true;
            executionData.lawyerFeesAmount = parseMoneyInput(lawyerFeesAmount);
        }
        
        // Commercial paper due date
        if (dueDate) {
            executionData.dueDate = dueDate;
        }
        
        // 🔍 Execution Target (للأوراق التجارية والسندات العادية)
        if (executionTarget) {
            executionData.executionTarget = executionTarget;
        }
        
        // PHASE 31: Sharia Deed specific data
        // ✅ UPDATED: Support new marriage deed types
        if (docType === 'الحجج الشرعية') {
            if (claimType === 'مهر مؤجل' || claimType === 'حجة زواج - مهر مؤجل') {
                executionData.dowryReason = dowryReason;
            }
            if (claimType === 'حجة وصاية' || claimType === 'حجة تخارج') {
                executionData.guardianshipDetails = guardianshipDetails;
            }
        }

        // ✅ PROMPT 2: Use representedParty derived from isClient flags (يشمل المدين الإضافي كموكل)
        const creditorClientRow =
            creditors.find((c) => c.isClient) ||
            additionalCreditors.find((c) => c.isClient) ||
            creditors[0];
        const debtorClientRow =
            [...debtors, ...additionalDebtorsForm].find((d) => d.isClient) || debtors[0];
        executionData.applicant =
            representedParty === 'creditor' ? creditorClientRow as any : debtorClientRow as any;
        executionData.respondent =
            representedParty === 'creditor' ? debtors[0] as any : creditors[0] as any;
        executionData.initiatorRole = representedParty as string;

        if (
            (savedClaimTypes.some((ct) => isFinancialClaimForPartySplit(ct)) ||
                isFinancialClaimForPartySplit(claimType)) &&
            globalClaimTotal > 0
        ) {
            // @ts-expect-error - runtime field
            executionData.debtAmount = globalClaimTotal;
            (executionData as any).total_remaining_balance = globalClaimTotal;
            (executionData as any).paidDebt = 0;
        }
        
        // Add classification (from unified dropdown) — executionType للشريط الجوزي (ليس docType)
        if (classification && classification !== 'none') {
            executionData.classification = classification;
            executionData.executionType =
                classification === 'شرعي' ? 'شرعي / أحوال شخصية' : 'مدني';
        }
        
        // Add clientFeesAmount if it exists
        if (parseMoneyInput(clientFeesAmount) > 0) {
            executionData.clientFeesAmount = parseMoneyInput(clientFeesAmount);
        }

        debug.log('📋 [ExecutionCreationView] Submitting Execution Data:', executionData);
        
        // ✅ NO ENCRYPTION - Save data as-is for lawyer access
        try {
            const creditorData = executionData.creditor || executionData.creditors?.[0];
            const debtorData = executionData.debtor || executionData.debtors?.[0];
            
            // ✅ Backend Integration: Save to Supabase Cloud (attempt, but don't require)
            try {
                const fileId = await SupabaseService.saveExecutionFile({
                    id: executionData.id,
                    caseNo: executionData.fileNumber + '/' + executionData.fileYear,
                    executionType: executionData.docType as any,
                    court: executionData.directorate,
                    executionBasis: executionData.executionBasis || '',
                    creditor: creditorData as any,
                    debtor: debtorData as any,
                    totalAmount: parseFloat(String(executionData.totalAmount || 0).replace(/,/g, '')),
                    status: executionData.status as any
                });
                debug.log('[ExecutionCreationView] ✅ Saved to Supabase:', fileId);
            } catch (cloudError) {
                // ✅ FIX: Don't log as error - user might be working in local mode
                debug.log('[ExecutionCreationView] 💾 وضع محلي - البيانات محفوظة محلياً فقط');
                // لا نعرض خطأ للمستخدم - البيانات محفوظة محلياً
            }
            
            onSave(executionData);
            SmartToast.success('✅ تم فتح الإضبارة التنفيذية بنجاح');
        } catch (error) {
            logger.error('❌ [ExecutionCreation] Save failed:', error);
            SmartToast.error('⚠️ فشل حفظ البيانات. يرجى المحاولة مرة أخرى.');
            return;
        }
        
        // DON'T call onClose() here - handleAddExecutionFile will manage the flow
    };

    if (!isOpen) return null;

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            dir="rtl"
            className={ecg.modalShell}
        >
                <div className={ecg.modalHeader}>
                    <div className="flex items-center gap-3">
                        <h1 className={ecg.modalTitle}>
                            <Gavel size={22} />
                            فتح إضبارة تنفيذ
                        </h1>
                    </div>
                    <button type="button" onClick={onClose} className={ecg.modalClose}>
                        <X size={20} />
                        <span className="text-sm font-medium">إغلاق</span>
                    </button>
                </div>

                <div className={ecg.modalBody}>
                    <div className={ecg.modalBodyStack}>
                        
                        <DirectorateSection
                            directorate={directorate}
                            fileNumber={fileNumber}
                            onDirectorateChange={setDirectorate}
                            onFileNumberChange={setFileNumber}
                        />

                        <PartiesSection
                            creditors={creditors}
                            additionalCreditors={additionalCreditors}
                            debtors={debtors}
                            additionalDebtorsForm={additionalDebtorsForm}
                            isSolidaryLiability={isSolidaryLiability}
                            financialSplitHint={financialSplitHint}
                            claimType={claimType}
                            onAddCreditor={addCreditor}
                            onRemoveAdditionalCreditor={removeAdditionalCreditor}
                            onUpdateAdditionalCreditor={updateAdditionalCreditor}
                            onUpdateCreditor={updateCreditor}
                            onAddDebtor={addDebtor}
                            onRemoveAdditionalDebtor={removeAdditionalDebtor}
                            onUpdateAdditionalDebtor={updateAdditionalDebtor}
                            onUpdateDebtor={updateDebtor}
                            onSetIsSolidaryLiability={setIsSolidaryLiability}
                        />

                        <ExecutionCreationSection title="السند المنفذ">
                            <div className="flex flex-col gap-3">
                                {/* ✅ تصحيح 1: تغيير الاسم من "نوع السند" إلى "قرارات المحاكم" عند اختيار أحكام المحاكم */}
                                <div>
                                    <label className={ecg.labelGold}>نوع السند المنفذ</label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setClaimTypeSheetOpen(false);
                                            setDocTypeSheetOpen(true);
                                        }}
                                        className={ecg.pickerBtn}
                                    >
                                        <ChevronDown size={18} className="text-gray-400 shrink-0" />
                                        <span className="flex-1 truncate font-medium">
                                            {currentDocTypeLabel || '-- اختر نوع السند المنفذ --'}
                                        </span>
                                    </button>
                                </div>

                                {/* ✅ تصحيح 1: رقم الحكم وتاريخ الحكم - يظهر فقط للأحكام القضائية */}
                                {docType === 'قرارات وأحكام المحاكم' && (
                                    <div className={`${ecg.card} !p-4`}>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className={ecg.labelGold}>رقم الحكم</label>
                                                <input 
                                                    type="text"
                                                    placeholder="مثال: 1234/2024"
                                                    value={docNumber}
                                                    onChange={(e) => setDocNumber(e.target.value)}
                                                    className={ecg.field}
                                                />
                                            </div>
                                            <div>
                                                <label className={ecg.labelGold}>تاريخ الحكم</label>
                                                <input 
                                                    type="date"
                                                    value={judgmentDate}
                                                    onChange={(e) => setJudgmentDate(e.target.value)}
                                                    placeholder="DD/MM/YYYY"
                                                    style={{ direction: 'ltr', textAlign: 'right' }}
                                                    className={ecg.field}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 2. CLASSIFICATION DROPDOWN (التصنيف) - PHASE 31: HIDE for Sharia Deeds */}
                                {docType !== 'الحجج الشرعية' && getClassificationOptions().length > 0 && (
                                    <div>
                                        <label className={ecg.labelGold}>التصنيف</label>
                                        {!docType ? (
                                            <p className="text-sm text-slate-500 px-1">-- اختر نوع السند أولاً --</p>
                                        ) : (
                                            <div className={ecg.choiceRow} role="group" aria-label="التصنيف">
                                                {visibleClassificationOptions.map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => handleClassificationChange(opt.value)}
                                                        className={`${ecg.choiceBtn} ${
                                                            classification === opt.value
                                                                ? ecg.choiceBtnActive
                                                                : ecg.choiceBtnIdle
                                                        }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 3. CLAIM TYPE DROPDOWN (نوع المطالبة والتنفيذ) - PHASE 28: Unified */}
                                <div>
                                    <label className={`${ecg.labelGold} flex items-center gap-2 flex-wrap`}>
                                        نوع المطالبة والتنفيذ
                                        {/* ✅ CRITICAL LOGIC: Auto-filled & Locked for Commercial Papers */}
                                        {docType === 'الأوراق التجارية' && (
                                            <span className="text-xs text-[#E6C673]/80 font-normal">(تلقائي - الصكوك دائماً مطالبات مالية)</span>
                                        )}
                                    </label>
                                    {(() => {
                                        const claimPickerLocked = (!docType && !classification) || docType === 'الأوراق التجارية';
                                        const claimPickerEmpty = !claimPickerLocked && claimTypeOptionsList.length === 0;
                                        const claimButtonLabel = claimPickerLocked
                                            ? ((!docType && !classification) ? '-- اختر نوع السند أولاً --' : currentClaimTypeLabel || '-- اختر نوع المطالبة والتنفيذ --')
                                            : claimPickerEmpty
                                                ? '-- اختر التصنيف أولاً (إن وُجد) --'
                                                : (currentClaimTypeLabel || '-- اختر نوع المطالبة والتنفيذ --');
                                        return (
                                            <button
                                                type="button"
                                                disabled={claimPickerLocked || claimPickerEmpty}
                                                onClick={() => {
                                                    if (!claimPickerLocked && !claimPickerEmpty) {
                                                        setClaimTypeSheetOpen(true);
                                                    }
                                                }}
                                                className={`${ecg.pickerBtn} ${
                                                    claimPickerLocked || claimPickerEmpty ? ecg.pickerBtnDisabled : ''
                                                }`}
                                            >
                                                <ChevronDown size={18} className="text-gray-400 shrink-0" />
                                                <span className="flex-1 truncate font-medium">{claimButtonLabel}</span>
                                            </button>
                                        );
                                    })()}
                                    {effectiveClaimTypes.length > 1 ? (
                                        <div className="mt-2.5 flex flex-wrap gap-2 justify-end">
                                            {effectiveClaimTypes.map((ct) => (
                                                <button
                                                    key={ct}
                                                    type="button"
                                                    onClick={() => removeActiveClaimType(ct)}
                                                    className={ecg.chip}
                                                    title="إزالة من المطالبة المجمّعة"
                                                >
                                                    {claimTypeOptionsList.find((o) => o.value === ct)?.label ?? ct} ×
                                                </button>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>

                                {/* ✅ حقل رقم السند تم نقله للأعلى في قسم "رقم الحكم" للأحكام القضائية */}
                                {/* يظهر فقط لغير الأحكام القضائية والحجج الشرعية */}
                                {/* ✅ CRITICAL LOGIC: Dynamic Labels for Commercial Papers */}
                                {docType !== 'الحجج الشرعية' && docType !== 'قرارات وأحكام المحاكم' && docType && (
                                    <div>
                                        {docType === 'الأوراق التجارية' && (
                                            <label className={ecg.labelGold}>رقم الصك / الكمبيالة</label>
                                        )}
                                        <input 
                                            type="text"
                                            placeholder={docType === 'الأوراق التجارية' ? 'رقم الصك / الكمبيالة' : 'رقم السند'}
                                            value={docType === 'الأوراق التجارية' ? chequeNumber : docNumber}
                                            onChange={(e) => {
                                                if (docType === 'الأوراق التجارية') {
                                                    setChequeNumber(e.target.value);
                                                } else {
                                                    setDocNumber(e.target.value);
                                                }
                                            }}
                                            className={ecg.field}
                                            disabled={docType === 'الأوراق التجارية'}
                                            title={docType === 'الأوراق التجارية' ? 'تم إدخال هذا الرقم في مدقق الصك' : ''}
                                        />
                                        {docType === 'الأوراق التجارية' && chequeNumber && (
                                            <p className="text-xs text-gray-500 mt-1">✓ تم التحقق من البيانات</p>
                                        )}
                                    </div>
                                )}
                                
                                {/* PHASE 49: SHARIA DEED IDENTIFICATION FIELDS */}
                                {docType === 'الحجج الشرعية' && (
                                    <div className={`${ecg.subCard} animate-fade-in`}>
                                        <h4 className={`${ecg.subCardTitle} text-[#E6C673] border-b border-white/8 pb-2 mb-3 flex items-center gap-2`}>
                                            <FileText size={16} />
                                            بيانات الحجة الشرعية
                                        </h4>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className={ecg.labelGold}>العدد / رقم الحجة</label>
                                                <input
                                                    type="text"
                                                    placeholder="مثال: 1234"
                                                    value={shariaDeedNumber}
                                                    onChange={(e) => setShariaDeedNumber(e.target.value)}
                                                    className={`${ecg.field} text-sm`}
                                                />
                                            </div>
                                            <div>
                                                <label className={ecg.labelGold}>رقم السجل</label>
                                                <input
                                                    type="text"
                                                    placeholder="مثال: 56"
                                                    value={shariaRegisterNumber}
                                                    onChange={(e) => setShariaRegisterNumber(e.target.value)}
                                                    className={`${ecg.field} text-sm`}
                                                />
                                            </div>
                                            <div>
                                                <label className={ecg.labelGold}>تاريخ الإصدار</label>
                                                <input
                                                    type="date"
                                                    value={shariaIssueDate}
                                                    onChange={(e) => setShariaIssueDate(e.target.value)}
                                                    style={{ direction: 'ltr', textAlign: 'right' }}
                                                    className={`${ecg.field} text-sm`}
                                                />
                                            </div>
                                        </div>
                                        {!['مهر مؤجل', 'حجة زواج - مهر معجل', 'حجة زواج - مهر مؤجل'].includes(claimType) && (
                                            <div className="mt-3">
                                                <label className={ecg.labelGold}>المحكمة الشرعية المصدرة</label>
                                                <input
                                                    type="text"
                                                    placeholder="مثال: محكمة الأحوال الشخصية في الكرخ"
                                                    value={shariaIssuingCourt}
                                                    onChange={(e) => setShariaIssuingCourt(e.target.value)}
                                                    className={`${ecg.field} text-sm`}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {/* === PHASE 28: CONDITIONAL DYNAMIC INPUTS === */}
                                {(() => {
                                    const claimTypeInputSections = effectiveClaimTypes.map((ct) => {
                                    const ctLabel =
                                        claimTypeOptionsList.find((o) => o.value === ct)?.label ?? ct;
                                    if (ct === 'نفقة') {
                                        return (
                                            <SmartAlimonyCalculator
                                                key={ct}
                                                alimonyBeneficiary={alimonyBeneficiary}
                                                alimonyLawsuitDate={alimonyLawsuitDate}
                                                alimonyExecutionDate={alimonyExecutionDate}
                                                alimonyWifeMonthly={alimonyWifeMonthly}
                                                alimonyChildrenMonthly={alimonyChildrenMonthly}
                                                alimonyChildrenCount={alimonyChildrenCount}
                                                calculatedAlimonyNew={calculatedAlimonyNew}
                                                onBeneficiaryChange={setAlimonyBeneficiary}
                                                onLawsuitDateChange={setAlimonyLawsuitDate}
                                                onExecutionDateChange={setAlimonyExecutionDate}
                                                onWifeMonthlyChange={setAlimonyWifeMonthly}
                                                onChildrenMonthlyChange={setAlimonyChildrenMonthly}
                                                onChildrenCountChange={setAlimonyChildrenCount}
                                            />
                                        );
                                    }
                                    if (ct === 'نفقة ماضية') {
                                        const pastCalc = calculatedAlimonyNew;
                                        return (
                                            <div key={ct} className={`${claimSectionCardClass} space-y-4`}>
                                                <div className={ecg.cardHeader}>
                                                    <h4 className={ecg.cardTitle}>
                                                        <DollarSign size={18} className="text-[#E6C673]" />
                                                        {ctLabel}
                                                    </h4>
                                                    <p className={ecg.cardSubtitle}>
                                                        احتساب النفقة الماضية من تاريخ الاستحقاق حتى إقامة الدعوى
                                                    </p>
                                                </div>
                                                <PastAlimonyFieldsSection
                                                    alimonyPastLawSystem={alimonyPastLawSystem}
                                                    alimonyPastStartDate={alimonyPastStartDate}
                                                    alimonyLawsuitDate={alimonyLawsuitDate}
                                                    alimonyPastWifeMonthly={pastWifeAlimonyAmount}
                                                    onPastLawSystemChange={setAlimonyPastLawSystem}
                                                    onPastStartDateChange={setAlimonyPastStartDate}
                                                    onLawsuitDateChange={setAlimonyLawsuitDate}
                                                    onPastWifeMonthlyChange={setPastWifeAlimonyAmount}
                                                    calculated={pastCalc}
                                                />
                                                <PastAlimonyResultPreview
                                                    calculated={pastCalc}
                                                    pastLawSystem={alimonyPastLawSystem}
                                                    variant="standalone"
                                                />
                                            </div>
                                        );
                                    }
                                    if (claimUsesMonetaryAmountField(ct)) {
                                        return (
                                            <div key={ct} className={claimSectionCardClass}>
                                                <label className={ecg.labelGold}>
                                                    {ctLabel} — المبلغ المطلوب (دينار)
                                                </label>
                                                <div className={ecg.moneyWrap}>
                                                    <DollarSign className="text-slate-500 flex-shrink-0" size={18} />
                                                    <input
                                                        type="text"
                                                        value={formatCurrency(
                                                            claimAmountsByType[ct] ??
                                                                (effectiveClaimTypes.length === 1 ? totalAmount : '')
                                                        )}
                                                        onChange={(e) =>
                                                            handleAmountChange(e, (v) => {
                                                                setClaimAmountsByType((prev) => ({
                                                                    ...prev,
                                                                    [ct]: v,
                                                                }));
                                                                if (effectiveClaimTypes.length === 1) {
                                                                    setTotalAmount(v);
                                                                }
                                                            })
                                                        }
                                                        className={ecg.moneyInput}
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                });

                                    if (showMultiClaimAggregatePanel) {
                                        return (
                                            <div className={ecg.aggregatePanel}>
                                                <div className={ecg.cardHeader}>
                                                    <h4 className={ecg.cardTitle}>
                                                        <Scale size={18} className="text-[#E6C673]" />
                                                        تفاصيل المطالبات المالية المجمّعة
                                                    </h4>
                                                    <p className={ecg.cardSubtitle}>
                                                        أدخل مبلغ كل مطالبة على حدة؛ يُحسب الإجمالي تلقائياً أدناه.
                                                    </p>
                                                </div>
                                                <div className="space-y-3">{claimTypeInputSections}</div>
                                                <div className={ecg.aggregateTotalRow}>
                                                    <span className={ecg.aggregateTotalLabel}>
                                                        إجمالي المطالبات (دينار)
                                                    </span>
                                                    <span className={ecg.aggregateTotalValue}>
                                                        {formatCurrency(String(aggregatedClaimTotalDisplay))}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return <>{claimTypeInputSections}</>;
                                })()}

                                {/* مطالبات مالية لمسارات غير المجمّع (مدني / سندات) */}
                                {effectiveClaimTypes.length === 0 &&
                                claimType &&
                                claimUsesMonetaryAmountField(claimType) &&
                                !isShariaLinkedFinancialClaim(claimType) ? (
                                    <div className={ecg.card}>
                                        <label className={ecg.labelGold}>المبلغ المطلوب (دينار)</label>
                                        <div className={ecg.moneyWrap}>
                                            <DollarSign className="text-slate-500 flex-shrink-0" size={18} />
                                            <input
                                                type="text"
                                                value={formatCurrency(totalAmount)}
                                                onChange={(e) => handleAmountChange(e, setTotalAmount)}
                                                className={ecg.moneyInput}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                ) : null}
                                
                                {claimType === 'حجة نفقة اتفاقية' && (
                                    <SmartAlimonyCalculator
                                        alimonyBeneficiary={alimonyBeneficiary}
                                        alimonyLawsuitDate={alimonyLawsuitDate}
                                        alimonyExecutionDate={alimonyExecutionDate}
                                        alimonyWifeMonthly={alimonyWifeMonthly}
                                        alimonyChildrenMonthly={alimonyChildrenMonthly}
                                        alimonyChildrenCount={alimonyChildrenCount}
                                        calculatedAlimonyNew={calculatedAlimonyNew}
                                        onBeneficiaryChange={setAlimonyBeneficiary}
                                        onLawsuitDateChange={setAlimonyLawsuitDate}
                                        onExecutionDateChange={setAlimonyExecutionDate}
                                        onWifeMonthlyChange={setAlimonyWifeMonthly}
                                        onChildrenMonthlyChange={setAlimonyChildrenMonthly}
                                        onChildrenCountChange={setAlimonyChildrenCount}
                                    />
                                )}
                                
                                {/* ✅ IRAQI LAW: Deferred Dowry Reason — مخفي لمسار أحكام المحاكم + مهر مؤجل (الطلب حصراً من مسار الحجج الشرعية) */}
                                {hasActiveClaim('مهر مؤجل') &&
                                ['مهر مؤجل', 'حجة زواج - مهر مؤجل'].includes(claimType) &&
                                !(docType === 'قرارات وأحكام المحاكم' && claimType === 'مهر مؤجل') && (
                                    <div className={ecg.callout}>
                                        <label className={ecg.labelGold}>
                                            سبب استحقاق المهر المؤجل
                                            <span className="text-slate-500 text-xs font-normal mr-2">
                                                (أقرب الأجلين: الطلاق أو الوفاة)
                                            </span>
                                        </label>
                                        <div className={ecg.choiceRow}>
                                            <button
                                                type="button"
                                                onClick={() => setDowryReason('طلاق')}
                                                className={`${ecg.choiceBtn} ${
                                                    dowryReason === 'طلاق' ? ecg.choiceBtnActive : ecg.choiceBtnIdle
                                                }`}
                                            >
                                                طلاق
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDowryReason('وفاة')}
                                                className={`${ecg.choiceBtn} ${
                                                    dowryReason === 'وفاة' ? ecg.choiceBtnActive : ecg.choiceBtnIdle
                                                }`}
                                            >
                                                وفاة
                                            </button>
                                        </div>
                                        <div className={ecg.hintDangerInline}>
                                            {dowryReason === 'طلاق' 
                                                ? '⚠️ يجب إرفاق قرار حكم الطلاق القطعي (المكتسب الدرجة القطعية)'
                                                : '⚠️ يجب إرفاق شهادة وفاة الزوج + قسام شرعي لتحديد الورثة'
                                            }
                                        </div>
                                    </div>
                                )}

                                {/* MASTER PHASE: SHARIA DEED DETAILS (Will & Takharuj only) */}
                                {['حجة وصية', 'حجة تخارج'].includes(claimType) && (
                                    <div className={ecg.subCard}>
                                        <label className={ecg.labelGold}>
                                            تفاصيل الحجة
                                            <span className="text-slate-500 text-xs font-normal mr-2">
                                                (مثال: لمن الوصية، أو من تخارج لمن)
                                            </span>
                                        </label>
                                        <textarea
                                            value={shariaDeedDetails}
                                            onChange={(e) => setShariaDeedDetails(e.target.value)}
                                            rows={3}
                                            placeholder="اكتب تفاصيل الحجة هنا..."
                                            className={ecg.textarea}
                                        />
                                    </div>
                                )}
                                
                                {isEvictionClaim(claimType) && (
                                    <EvictionSection
                                        evictionPropertyNumber={evictionPropertyNumber}
                                        evictionDistrict={evictionDistrict}
                                        evictionPropertyType={evictionPropertyType}
                                        evictionFullAddress={evictionFullAddress}
                                        onPropertyNumberChange={setEvictionPropertyNumber}
                                        onDistrictChange={setEvictionDistrict}
                                        onPropertyTypeChange={setEvictionPropertyType}
                                        onFullAddressChange={setEvictionFullAddress}
                                    />
                                )}

                                {hasActiveClaim('تسليم شيء معين') && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.28 }}
                                        className="relative overflow-hidden rounded-2xl border border-[#E6C673]/20 bg-gradient-to-br from-[#0A0F1C]/95 via-[#0B1120]/90 to-[#05060D]/95 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.45)] ring-1 ring-white/5 backdrop-blur-xl"
                                    >
                                        <div
                                            className="pointer-events-none absolute -top-12 -left-12 h-32 w-32 rounded-full bg-[#E6C673]/8 blur-3xl"
                                            aria-hidden
                                        />
                                        <div
                                            className="pointer-events-none absolute -bottom-10 -right-8 h-28 w-28 rounded-full bg-sky-500/10 blur-3xl"
                                            aria-hidden
                                        />
                                        <div className="relative flex flex-row-reverse items-center justify-between gap-2 mb-3">
                                            <div className="flex flex-row-reverse items-center gap-2">
                                                <Sparkles className="h-4 w-4 text-[#E6C673]/80" />
                                                <p className="text-sm font-bold tracking-wide text-[#F5E6B8]">
                                                    طبيعة الشيء
                                                </p>
                                            </div>
                                            <span className="rounded-full border border-[#E6C673]/25 bg-[#E6C673]/8 px-2 py-0.5 text-[9px] font-bold text-[#E6C673]/90">
                                                مطلوب
                                            </span>
                                        </div>
                                        <p className="relative mb-3 text-[10px] leading-relaxed text-slate-400/90 text-right">
                                            يحدد مسار الإجراءات الميدانية والجبرية في محضر المتابعة.
                                        </p>
                                        <div className="relative grid grid-cols-2 gap-2.5">
                                            {(
                                                [
                                                    {
                                                        value: 'movable' as const,
                                                        label: 'منقول',
                                                        hint: 'سيارة، آلة، منقولات…',
                                                        Icon: Package,
                                                    },
                                                    {
                                                        value: 'immovable' as const,
                                                        label: 'غير منقول',
                                                        hint: 'عقار، أرض، بناء…',
                                                        Icon: Building2,
                                                    },
                                                ] as const
                                            ).map(({ value, label, hint, Icon }) => {
                                                const selected = specificDeliveryItemNature === value;
                                                return (
                                                    <button
                                                        key={value}
                                                        type="button"
                                                        onClick={() => setSpecificDeliveryItemNature(value)}
                                                        className={`group relative flex flex-col items-end gap-2 rounded-2xl border px-3 py-3.5 text-right transition-all duration-300 ${
                                                            selected
                                                                ? ecg.choiceBtnActive +
                                                                  ' border-[#E6C673]/50 shadow-[0_0_24px_-8px_rgba(230,198,115,0.55)]'
                                                                : ecg.choiceBtnIdle +
                                                                  ' border-white/10 bg-white/[0.02] hover:border-[#E6C673]/20'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
                                                                selected
                                                                    ? 'border-[#E6C673]/40 bg-[#E6C673]/12 text-[#F5E6B8]'
                                                                    : 'border-white/10 bg-black/20 text-slate-400 group-hover:text-[#E6C673]/80'
                                                            }`}
                                                        >
                                                            <Icon className="h-5 w-5" />
                                                        </span>
                                                        <span className="text-sm font-extrabold text-inherit">
                                                            {label}
                                                        </span>
                                                        <span className="text-[9px] font-medium text-slate-500 group-hover:text-slate-400">
                                                            {hint}
                                                        </span>
                                                        {selected ? (
                                                            <span className="absolute top-2 left-2 h-2 w-2 rounded-full bg-[#E6C673] shadow-[0_0_8px_rgba(230,198,115,0.9)]" />
                                                        ) : null}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}

                                {claimType === 'أثاث زوجية' && (
                                    <MaritalFurnitureSetupSection
                                        items={maritalFurnitureItems}
                                        onChange={setMaritalFurnitureItems}
                                        formatCurrency={formatCurrency}
                                        onPriceInput={(e, onParsed) => {
                                            const raw = e.target.value.replace(/[^\d]/g, '');
                                            onParsed(parseMoneyInput(raw));
                                        }}
                                    />
                                )}
                                
                                {/* STATE C: COMMERCIAL PAPERS - Due Date */}
                                {docType === 'الأوراق التجارية' && (
                                    <div className={ecg.subCard}>
                                        <label className={`${ecg.labelGold} flex items-center gap-2`}>
                                            <Calendar size={16} />
                                            تاريخ الاستحقاق (إلزامي)
                                        </label>
                                        <input
                                            type="date"
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                            style={{ direction: 'ltr', textAlign: 'right' }}
                                            className={ecg.field}
                                        />
                                        {dueDate && new Date(dueDate) > new Date() && (
                                            <p className="text-[#E6C673] text-xs mt-2 flex items-center gap-1">
                                                <AlertTriangle size={14} />
                                                التاريخ في المستقبل - لن يتم قبول التقديم حتى تاريخ الاستحقاق
                                            </p>
                                        )}
                                    </div>
                                )}
                                
                                {/* 🔍 EXECUTION TARGET FILTER - Commercial Papers & Debt Acknowledgments */}
                                {(docType === 'الأوراق التجارية' || docType === 'السندات المتضمنة إقراراً بدين') && (
                                    <div className={ecg.subCard}>
                                        <label className={ecg.labelGold}>
                                            المنفذ ضده (الطرف المستهدف بالتنفيذ)
                                        </label>
                                        <select
                                            value={executionTarget}
                                            onChange={(e) => setExecutionTarget(e.target.value as any)}
                                            className={ecg.select}
                                        >
                                            <option value="">-- اختر المنفذ ضده --</option>
                                            <option value="المدين الأصلي">المدين الأصلي (الساحب)</option>
                                            {docType === 'الأوراق التجارية' && (
                                                <>
                                                    <option value="المُظَهِّر">المُظَهِّر (ممنوع قانوناً)</option>
                                                    <option value="كفيل متضامن">كفيل</option>
                                                </>
                                            )}
                                            {docType === 'السندات المتضمنة إقراراً بدين' && (
                                                <>
                                                    <option value="كفيل متضامن">كفيل متضامن</option>
                                                    <option value="كفيل غير متضامن">كفيل غير متضامن (ممنوع)</option>
                                                </>
                                            )}
                                        </select>
                                        
                                        {/* Dynamic Warnings */}
                                        {docType === 'الأوراق التجارية' && executionTarget === 'كفيل متضامن' && (
                                            <div className={ecg.hintWarn}>
                                                <p className="text-amber-200 text-xs flex items-center gap-1">
                                                    <AlertTriangle size={14} />
                                                    مسموح، لكن المنفذ العدل مُلزم بتبليغ المدين الأصلي أولاً للوقوف على اعتراضاته
                                                </p>
                                            </div>
                                        )}
                                        
                                        {docType === 'السندات المتضمنة إقراراً بدين' && executionTarget === 'كفيل متضامن' && (
                                            <div className={ecg.hintSuccess}>
                                                <p className="text-emerald-300 text-xs flex items-center gap-1">
                                                    <Zap size={14} />
                                                    سيتم إمهال المدين الأصلي 7 أيام من تاريخ التبليغ قبل الحجز على الكفيل
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {/* 🛑 DOCUMENT BLOCKED BANNER */}
                                {isDocumentBlocked && (
                                    <div className={ecg.calloutDanger}>
                                        <h4 className={ecg.calloutDangerTitle}>
                                            <AlertTriangle size={20} />
                                            🛑 توقف - السند فقد قوته التنفيذية
                                        </h4>
                                        <p className="text-rose-200/90 text-sm leading-relaxed">
                                            استناداً للفقرة رابعاً من المادة 14، فقدَ هذا السند قوته التنفيذية المباشرة. لا تراجع مديرية التنفيذ.
                                        </p>
                                        <div className={ecg.hintDangerInline}>
                                            <p className="text-white text-sm font-bold mb-1">الحل القانوني:</p>
                                            <p className="text-slate-300 text-xs">
                                                أقم (دعوى إثبات دين) في محكمة البداءة، وبعد اكتساب الحكم الدرجة القطعية قم بتنفيذه.
                                            </p>
                                        </div>
                                    </div>
                                )}
                                
                                {/* === PHASE 31: SHARIA DEED DYNAMIC INPUTS === */}
                                
                                {/* VARIANT A: DEFERRED DOWRY (مهر مؤجل) */}
                                {docType === 'الحجج الشرعية' && claimType === 'مهر مؤجل' && (
                                    <div className="space-y-3">
                                        {/* Amount already shown above in STATE A */}
                                        
                                        {/* Dowry Reason Radio */}
                                        <div className={ecg.subCard}>
                                            <label className={ecg.labelGold}>سبب الاستحقاق:</label>
                                            <div className={`${ecg.choiceRow} !gap-3`}>
                                                <label className={`${ecg.radioRow} ${dowryReason === 'طلاق' ? ecg.radioRowActive : ecg.radioRowIdle} flex-1`}>
                                                    <input
                                                        type="radio"
                                                        name="dowryReason"
                                                        value="طلاق"
                                                        checked={dowryReason === 'طلاق'}
                                                        onChange={(e) => setDowryReason(e.target.value as 'طلاق' | 'وفاة')}
                                                        className="accent-[#E6C673]"
                                                    />
                                                    <span className="text-white text-sm">الطلاق</span>
                                                </label>
                                                <label className={`${ecg.radioRow} ${dowryReason === 'وفاة' ? ecg.radioRowActive : ecg.radioRowIdle} flex-1`}>
                                                    <input
                                                        type="radio"
                                                        name="dowryReason"
                                                        value="وفاة"
                                                        checked={dowryReason === 'وفاة'}
                                                        onChange={(e) => setDowryReason(e.target.value as 'طلاق' | 'وفاة')}
                                                        className="accent-[#E6C673]"
                                                    />
                                                    <span className="text-white text-sm">الوفاة</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {/* VARIANT C: WILL & TAKHARUJ DEEDS - PHASE 42 */}
                                {docType === 'الحجج الشرعية' && (claimType === 'حجة وصية' || claimType === 'حجة تخارج') && (
                                    <div className={ecg.subCard}>
                                        <label className={ecg.labelGold}>
                                            تفاصيل الحجة (مثال: اسم الموصى له، أو تفاصيل حصص التخارج)
                                        </label>
                                        <textarea
                                            value={guardianshipDetails}
                                            onChange={(e) => setGuardianshipDetails(e.target.value)}
                                            className={ecg.textarea}
                                            rows={4}
                                            placeholder={claimType === 'حجة وصية' 
                                                ? "مثال: الموصى له: محمد علي، الحصة الموصى بها: ربع التركة..."
                                                : "مثال: تفاصيل حصص الورثة المتخارجين والمبالغ المتفق عليها..."
                                            }
                                        />
                                    </div>
                                )}

                                {docType === 'تنفيذ الأحكام الأجنبية' && (
                                    <ForeignJudgmentSection
                                        foreignData={foreignData}
                                        onForeignDataChange={setForeignData}
                                    />
                                )}
                            </div>
                        </ExecutionCreationSection>

                        {/* ✅ DELETED: دليل التنفيذ القانوني - All tracking, calculations, and legal warnings belong exclusively to the Active Dashboard, NOT the creation form */}

                        {/* ✅ DELETED: متتبع المواعيد القانونية - Statute of Limitations & Notification Tracker belong to Dashboard */}

                        {claimType && ['مشاهدة', 'تسليم ولد', 'أثاث زوجية'].includes(claimType) && (
                            <ExecutionCreationSection title="تفاصيل إضافية للمطالبة الشرعية">
                                {claimType === 'مشاهدة' && (
                                    <div className={`${ecg.subCard} space-y-4`}>
                                        <p className={`${ecg.subCardTitle} text-[#E6C673]`}>
                                            أسماء الأولاد (مشاهدة واستصحاب)
                                        </p>
                                        {visitationChildrenNames.map((childName, idx) => (
                                            <div key={idx} className="flex gap-2 items-center flex-row-reverse">
                                                <input
                                                    type="text"
                                                    value={childName}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        setVisitationChildrenNames((prev) =>
                                                            prev.map((n, i) => (i === idx ? v : n))
                                                        );
                                                    }}
                                                    className={`${ecg.field} flex-1 text-sm`}
                                                />
                                                {visitationChildrenNames.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setVisitationChildrenNames((prev) =>
                                                                prev.filter((_, i) => i !== idx)
                                                            )
                                                        }
                                                        className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
                                                        title="حذف السطر"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => setVisitationChildrenNames((prev) => [...prev, ''])}
                                            className={`${ecg.addBtn} !mt-0`}
                                        >
                                            <Plus size={14} />
                                            إضافة اسم
                                        </button>
                                    </div>
                                )}

                                {claimType === 'مشاهدة' && (
                                    <VisitationScheduleSetupSection
                                        draft={visitationScheduleDraft}
                                        onChange={setVisitationScheduleDraft}
                                    />
                                )}

                                {claimType === 'تسليم ولد' && (
                                    <div className={`${ecg.subCard} space-y-3`}>
                                        <p className={ecg.subCardTitle}>أسماء المحضونين (تسليم حضانة)</p>
                                        {custodyWardNames.map((wardName, idx) => (
                                            <div key={idx} className="flex gap-2 items-center flex-row-reverse">
                                                <input
                                                    type="text"
                                                    value={wardName}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        setCustodyWardNames((prev) =>
                                                            prev.map((n, i) => (i === idx ? v : n))
                                                        );
                                                    }}
                                                    placeholder={`اسم المحضون ${idx + 1}`}
                                                    className={`${ecg.field} flex-1 text-sm`}
                                                />
                                                {custodyWardNames.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setCustodyWardNames((prev) =>
                                                                prev.filter((_, i) => i !== idx)
                                                            )
                                                        }
                                                        className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
                                                        title="حذف السطر"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => setCustodyWardNames((prev) => [...prev, ''])}
                                            className={`${ecg.addBtn} !mt-0`}
                                        >
                                            <Plus size={14} />
                                            إضافة محضون
                                        </button>
                                    </div>
                                )}
                            </ExecutionCreationSection>
                        )}
                        
                        {/* ✅ DELETED: الملخص المالي الذكي - Auto-calculated financial summary belongs to Dashboard */}

                        {/* === FINANCIAL SETTINGS & FEES (الإعدادات المالية والأتعاب) === */}
                        {/* ✅ CRITICAL UPDATE (2026-03-11): HIDE FOR ALL NON-FINANCIAL CLAIMS */}
                        {/* Rule: Hide "المبلغ المطلوب" field for non-financial executions */}
                        {showLawyerFeesToggle ? (
                            <div
                                className={[
                                    'rounded-2xl border backdrop-blur-sm transition-all duration-300 overflow-hidden',
                                    includeLawyerFees
                                        ? 'border-[#E6C673]/40 bg-gradient-to-l from-[#E6C673]/12 via-[#E6C673]/5 to-transparent shadow-[0_0_24px_-12px_rgba(230,198,115,0.35)]'
                                        : 'border-white/10 bg-white/[0.03]',
                                ].join(' ')}
                            >
                                <label
                                    className="flex flex-row-reverse items-center gap-3 min-h-[48px] px-3.5 py-3 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={includeLawyerFees}
                                        onChange={(e) => setIncludeLawyerFees(e.target.checked)}
                                        className="sr-only"
                                    />
                                    <span
                                        className={`${ecg.multiToggle} ${
                                            includeLawyerFees ? ecg.multiToggleChecked : ecg.multiToggleIdle
                                        }`}
                                        aria-hidden
                                    >
                                        {includeLawyerFees ? (
                                            <Scale size={12} className="text-[#0A0F1C]" strokeWidth={2.5} />
                                        ) : null}
                                    </span>
                                    <span className="flex-1 text-right text-sm font-bold text-[#F0DFA8]">
                                        المطالبة بأتعاب المحاماة المحكوم بها
                                    </span>
                                </label>

                                <AnimatePresence initial={false}>
                                    {includeLawyerFees ? (
                                        <motion.div
                                            key="lawyer-fees-amount"
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                                            className="overflow-hidden"
                                        >
                                            <div className="border-t border-[#E6C673]/15 px-3.5 pb-3.5 pt-3">
                                                <div className={`${ecg.moneyWrap} focus-within:border-[#E6C673]/45`}>
                                                    <Scale className="text-[#E6C673]/80 flex-shrink-0" size={16} />
                                                    <input
                                                        type="text"
                                                        value={formatCurrency(lawyerFeesAmount)}
                                                        onChange={(e) =>
                                                            handleAmountChange(e, setLawyerFeesAmount)
                                                        }
                                                        className={ecg.moneyInput}
                                                        placeholder="مقدار أتعاب المحاماة (دينار)"
                                                        aria-label="مقدار أتعاب المحاماة (دينار)"
                                                    />
                                                    <span className="text-slate-500 text-[10px] font-bold">IQD</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ) : null}
                                </AnimatePresence>
                            </div>
                        ) : null}
                        
                        <div className="h-6"></div> {/* Spacer */}
                    </div>
                </div>

                <ExecutionSaveButton onSubmit={handleSubmit} />

                <ExecutionOptionSheet
                    open={docTypeSheetOpen}
                    onClose={() => setDocTypeSheetOpen(false)}
                    title="نوع السند المنفذ"
                    options={EXECUTION_DOC_TYPE_OPTIONS}
                    comingSoonOptions={EXECUTION_DOC_TYPE_COMING_SOON}
                    selectedValue={docType}
                    onSelect={(v) => handleDocTypeChange(v)}
                />
                <ExecutionOptionSheet
                    open={claimTypeSheetOpen}
                    onClose={() => setClaimTypeSheetOpen(false)}
                    title="نوع المطالبة والتنفيذ"
                    options={shariaExclusiveClaimOptions}
                    selectedValue={claimType}
                    exclusiveSectionTitle={
                        showShariaLinkedClaimPanel ? 'مطالبات منفردة' : undefined
                    }
                    onSelect={(v) => {
                        setActiveClaimTypes([v]);
                        setClaimAmountsByType({});
                        setLinkedClaimDraft([]);
                        setClaimTypeSheetOpen(false);
                    }}
                    multiSelectPanel={
                        showShariaLinkedClaimPanel
                            ? {
                                  sectionTitle: 'مطالبات مالية',
                                  options: shariaLinkedClaimOptions,
                                  draftValues: linkedClaimDraft,
                                  onToggleDraft: toggleLinkedClaimDraft,
                                  onConfirm: saveLinkedClaimDraft,
                                  confirmLabel: 'حفظ الاختيار',
                              }
                            : undefined
                    }
                />
                
                {/* ✅ PRACTICAL CHEQUE VALIDATOR - DATA CAPTURE MODAL */}
                {showChequeValidatorModal && (
                    <div className={ecg.modalBackdrop} onClick={() => {
                        if (!chequeBankName && !chequeIssueDate && !chequeNumber) {
                            setShowChequeValidatorModal(false);
                        }
                    }}>
                        <div className={ecg.modalPanel} onClick={(e) => e.stopPropagation()}>
                            <h3 className={ecg.modalTitle}>
                                <AlertTriangle size={24} />
                                بيانات الورقة التجارية (صك/كمبيالة)
                            </h3>
                            <p className="text-slate-400 text-sm mb-4">
                                📋 هذه البيانات ستُستخدم في طلب التنفيذ ومخاطبة المصرف
                            </p>
                            
                            <div className="space-y-4 mb-6">
                                {/* Bank Name */}
                                <div>
                                    <label className={ecg.labelGold}>اسم المصرف المسحوب عليه *</label>
                                    <input
                                        type="text"
                                        value={chequeBankName}
                                        onChange={(e) => setChequeBankName(e.target.value)}
                                        placeholder="مثال: مصرف الرافدين، المصرف الأهلي العراقي..."
                                        className={ecg.field}
                                    />
                                </div>
                                <div>
                                    <label className={ecg.labelGold}>رقم الصك / الكمبيالة *</label>
                                    <input
                                        type="text"
                                        value={chequeNumber}
                                        onChange={(e) => setChequeNumber(e.target.value)}
                                        placeholder="مثال: 12345678"
                                        className={ecg.field}
                                    />
                                </div>
                                <div>
                                    <label className={`${ecg.labelGold} flex items-center gap-2 flex-wrap`}>
                                        <Calendar size={16} />
                                        تاريخ إنشاء الصك
                                        <span className="text-slate-500 text-xs font-normal">(اختياري لكن مهم قانونياً)</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={chequeIssueDate}
                                        onChange={(e) => setChequeIssueDate(e.target.value)}
                                        className={ecg.field}
                                    />
                                    {!chequeIssueDate && (
                                        <p className="text-rose-400 text-xs mt-2 flex items-center gap-1">
                                            <AlertTriangle size={12} />
                                            ⚠️ تحذير: الصك بدون تاريخ قد يفقد قوته التنفيذية ويتحول لسند عادي
                                        </p>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex gap-3">
                                <button type="button"
                                    onClick={() => {
                                        // Validation Rule: If no issue date, downgrade document power
                                        if (!chequeIssueDate) {
                                            setDocType('السندات المتضمنة إقراراً بدين');
                                            setClaimType('استحصال دين مالي');
                                            SmartToast.warning('⚠️ تنبيه قانوني: لعدم وجود تاريخ إنشاء، تحول الصك إلى سند عادي. يجب إثبات الدين وفق شروط مشددة.');
                                        }
                                        setShowChequeValidatorModal(false);
                                    }}
                                    disabled={!chequeBankName || !chequeNumber}
                                    className={ecg.modalBtnPrimary}
                                >
                                    {chequeIssueDate ? 'تأكيد البيانات' : 'متابعة كسند عادي'}
                                </button>
                                <button type="button"
                                    onClick={() => {
                                        setShowChequeValidatorModal(false);
                                        setDocType('');
                                        setClaimType('');
                                    }}
                                    className={ecg.modalBtnGhost}
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* 🛑 ABSENTEE CHECKLIST MODAL */}
                {showAbsenteeModal && (
                    <div className={ecg.modalBackdrop} onClick={() => setShowAbsenteeModal(false)}>
                        <div className={ecg.modalPanelDanger} onClick={(e) => e.stopPropagation()}>
                            <h3 className={`${ecg.calloutDangerTitle} mb-4`}>
                                <AlertTriangle size={24} />
                                فحص الغياب الإلزامي
                            </h3>
                            <p className="text-slate-400 text-sm mb-4">
                                يرجى الإجابة على الأسئلة التالية:
                            </p>
                            <div className="space-y-3 mb-6">
                                {[
                                    { key: 'isOutsideIraq', label: 'هل المدين متواجد خارج العراق؟' },
                                    { key: 'isAddressUnknown', label: 'هل محل إقامة المدين مجهول؟' },
                                    { key: 'isDiedDuringNotice', label: 'هل توفي المدين خلال فترة الإخبار؟' }
                                ].map(item => (
                                    <label key={item.key} className={ecg.optionRow}>
                                        <span className="text-white text-sm flex-1">{item.label}</span>
                                        <div className="flex gap-2">
                                            <label className="flex items-center gap-1 cursor-pointer">
                                                <input 
                                                    type="radio"
                                                    name={item.key}
                                                    checked={absenteeChecks[item.key as keyof typeof absenteeChecks] === true}
                                                    onChange={() => setAbsenteeChecks({...absenteeChecks, [item.key]: true})}
                                                    className="accent-rose-500"
                                                />
                                                <span className="text-xs text-gray-400">نعم</span>
                                            </label>
                                            <label className="flex items-center gap-1 cursor-pointer">
                                                <input 
                                                    type="radio"
                                                    name={item.key}
                                                    checked={absenteeChecks[item.key as keyof typeof absenteeChecks] === false}
                                                    onChange={() => setAbsenteeChecks({...absenteeChecks, [item.key]: false})}
                                                    className="accent-emerald-500"
                                                />
                                                <span className="text-xs text-gray-400">لا</span>
                                            </label>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <button type="button"
                                onClick={() => {
                                    const hasAnyYes = Object.values(absenteeChecks).some(v => v === true);
                                    if (hasAnyYes) {
                                        setIsDocumentBlocked(true);
                                        SmartToast.error('🛑 توقف: استناداً للفقرة رابعاً من المادة 14، فقدَ هذا السند قوته التنفيذية المباشرة.');
                                    } else {
                                        setIsDocumentBlocked(false);
                                    }
                                    setShowAbsenteeModal(false);
                                }}
                                className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-lg transition-all"
                            >
                                تأكيد
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
    );
};
