import React, { useState, useEffect, useCallback } from 'react';
import { 
    X, Plus, Trash2, Gavel, FileText,
    DollarSign, AlertTriangle, Code, Calendar, Zap,
    ChevronDown
} from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { motion } from 'motion/react';
import { debug } from '@/app/utils/debug';
import logger from '@/app/utils/logger';
import { SupabaseService } from '@/app/services/SupabaseService';
import { deriveMonetaryClaimNature } from '@/app/utils/summoningImmunityEngine';
import { isEvictionClaim } from '@/app/utils/executionModuleStrategies';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import type { ExecutionArchiveFile, ModalProps } from '@/app/types/common';
import { PartiesSection } from './ExecutionCreationView/components/PartiesSection';
import ExecutionOptionSheet from './ExecutionCreationView/components/ExecutionOptionSheet';
import { SmartAlimonyCalculator } from './ExecutionCreationView/components/SmartAlimonyCalculator';
import { DirectorateSection } from './ExecutionCreationView/components/DirectorateSection';
import { ForeignJudgmentSection } from './ExecutionCreationView/components/ForeignJudgmentSection';
import { EvictionSection } from './ExecutionCreationView/components/EvictionSection';
import { ExecutionSaveButton } from './ExecutionCreationView/components/ExecutionSaveButton';
import { isFinancialClaimForPartySplit, parseMoneyInput, splitAmountEqually } from './ExecutionCreationView/hooks/executionFormUtils';
import { useExecutionCreationFormOptions, EXECUTION_DOC_TYPE_OPTIONS } from './ExecutionCreationView/hooks/useExecutionCreationFormOptions';
import { useLegalWarnings } from './ExecutionCreationView/hooks/useLegalWarnings';
import { useAlimonyCalculator } from './ExecutionCreationView/hooks/useAlimonyCalculator';
import { useStatuteCalculations } from './ExecutionCreationView/hooks/useStatuteCalculations';
import { useImprisonmentEligibility } from './ExecutionCreationView/hooks/useImprisonmentEligibility';

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
        { id: 1, name: '', phone: '', address: '', occupation: 'موظف' as 'موظف' | 'كاسب', isClient: false }
    ]);

    /** دائنون إضافيون (الدائن الأول يبقى في creditors[0]) */
    const [additionalCreditors, setAdditionalCreditors] = useState<
        Array<{ id: string; name: string; phone?: string }>
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
    
    // === PHASE 17: FOREIGN JUDGMENTS ===
    const [foreignData, setForeignData] = useState({ 
        country: '', 
        court: '', 
        isAuthenticated: false 
    });
    
    // === SECTION 4: CIVIL VS SHARIA BRANCHING ===
    // PHASE 29: Removed redundant states (civilExecutionType, shariaClaimType) - using unified claimType
    const [totalAmount, setTotalAmount] = useState('');
    const [includesSleepover, setIncludesSleepover] = useState(false);
    /** أسماء الأولاد — حصراً عند «مشاهدة واستصحاب» (قرارات المحاكم شرعي) */
    const [visitationChildrenNames, setVisitationChildrenNames] = useState<string[]>(['']);
    /** أسماء المحضونين — حصراً عند «تسليم حضانة» (قيمة الخيار الداخلية: تسليم ولد) */
    const [custodyWardNames, setCustodyWardNames] = useState<string[]>(['']);
    const [docTypeSheetOpen, setDocTypeSheetOpen] = useState(false);
    const [claimTypeSheetOpen, setClaimTypeSheetOpen] = useState(false);
    
    // === FURNITURE DETAILS (أثاث زوجية) ===
    const [furnitureValue, setFurnitureValue] = useState('');
    const [furnitureDetails, setFurnitureDetails] = useState('');

    /** تخلية مأجور / eviction — بيانات العين */
    const [evictionPropertyNumber, setEvictionPropertyNumber] = useState('');
    const [evictionDistrict, setEvictionDistrict] = useState('');
    const [evictionPropertyType, setEvictionPropertyType] = useState('');
    const [evictionFullAddress, setEvictionFullAddress] = useState('');
    /** تجاري: لا مهلة تخلية سكنية طويلة | سكني: مهلة المنفذ حتى 90 يوماً */
    const [evictionPremisesUse, setEvictionPremisesUse] = useState<'commercial' | 'residential'>('residential');
    
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
    const [alimonyHasPastWife, setAlimonyHasPastWife] = useState(false); // هل حكم للزوجة بنفقة ماضية؟
    const [alimonyPastLawSystem, setAlimonyPastLawSystem] = useState<'قانون الأحوال الشخصية 1959' | 'الفقه الجعفري'>('قانون الأحوال الشخصية 1959');
    const [alimonyPastStartDate, setAlimonyPastStartDate] = useState(''); // تاريخ استحقاق النفقة الماضية
    const [pastWifeAlimonyAmount, setPastWifeAlimonyAmount] = useState(''); // 🆕 V21: مقدار النفقة الماضية المحكوم بها للزوجة
    const [pastChildrenAlimonyAmount, setPastChildrenAlimonyAmount] = useState(''); // 🆕 V21: مقدار النفقة الماضية المحكوم بها للأولاد
    // Dowry amount (مهر) or Compensation
    const [claimAmount, setClaimAmount] = useState('');

    const { calculatedAlimonyNew } = useAlimonyCalculator(
        claimType,
        alimonyLawsuitDate,
        alimonyExecutionDate,
        alimonyWifeMonthly,
        alimonyChildrenMonthly,
        alimonyChildrenCount,
        alimonyHasPastWife,
        alimonyPastLawSystem,
        alimonyPastStartDate
    );

    /** إجمالي المطالبة المالية لاستخدام القسمة / التضامن */
    const resolveGlobalClaimTotalNumber = useCallback((): number => {
        if (claimType === 'نفقة' || claimType === 'حجة نفقة اتفاقية') {
            return Math.round(calculatedAlimonyNew?.totalAccumulated ?? 0);
        }
        if (claimType === 'أثاث زوجية') {
            return parseMoneyInput(furnitureValue);
        }
        if (isFinancialClaimForPartySplit(claimType)) {
            return parseMoneyInput(totalAmount) || parseMoneyInput(claimAmount);
        }
        return 0;
    }, [claimType, totalAmount, claimAmount, furnitureValue, calculatedAlimonyNew]);

    useEffect(() => {
        if (claimType !== 'مشاهدة') {
            setVisitationChildrenNames(['']);
            setIncludesSleepover(false);
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

    useEffect(() => {
        if (!isFinancialClaimForPartySplit(claimType)) {
            setIsSolidaryLiability(false);
        }
    }, [claimType]);

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
    } = useExecutionCreationFormOptions(docType, classification, claimType);
    
    const handleDocTypeChange = (newDocType: string) => {
        setDocType(newDocType);
        setClassification('');
        setClaimType('');
        
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
            if (claimOpts.length === 1 && !claimType) {
                setClaimType(claimOpts[0].value);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [classification]);

    // === PHASE 17 + تعدد الخصوم: دائن/مدين أساسي + مصفوفات امتداد ===
    const addCreditor = () => {
        const id = `ac_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        setAdditionalCreditors((prev) => [...prev, { id, name: '', phone: '' }]);
    };

    const removeAdditionalCreditor = (id: string) => {
        setAdditionalCreditors((prev) => prev.filter((c) => c.id !== id));
    };

    const updateAdditionalCreditor = (id: string, field: 'name' | 'phone', value: string) => {
        setAdditionalCreditors((prev) =>
            prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
        );
    };

    const updateCreditor = (id: number, field: string, value: string | boolean | number) => {
        if (field === 'isClient' && value === true) {
            setDebtors((d0) => d0.map((d) => ({ ...d, isClient: false })));
            setAdditionalDebtorsForm((ad) => ad.map((d) => ({ ...d, isClient: false })));
        }
        setCreditors(creditors.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
    };

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

    const updateAdditionalDebtor = (
        id: string,
        field: string,
        value: string | boolean | number
    ) => {
        if (field === 'isClient' && value === true) {
            setCreditors((c0) => c0.map((c) => ({ ...c, isClient: false })));
            setDebtors((d0) => d0.map((d) => ({ ...d, isClient: false })));
            setAdditionalDebtorsForm((ad) => ad.map((d) => ({ ...d, isClient: false })));
        }
        setAdditionalDebtorsForm((prev) =>
            prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
        );
    };

    const updateDebtor = (id: number, field: string, value: string | boolean | number) => {
        if (field === 'isClient' && value === true) {
            setCreditors((c0) => c0.map((c) => ({ ...c, isClient: false })));
            setAdditionalDebtorsForm((ad) => ad.map((d) => ({ ...d, isClient: false })));
        }
        setDebtors(debtors.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
    };

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
                SmartToast.error(`⚠️ يرجى إكمال اسم الدائن الإضافي ${i + 1}`);
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

        // Parse file number and year
        const fileParts = fileNumber.split('/');
        let extractedNumber = fileParts[0] || fileNumber;
        let extractedYear = fileParts.length > 1 ? fileParts[1] : new Date().getFullYear().toString();

        // Build execution data based on type (PHASE 17: Multi-party + تعدد الخصوم)
        const clientCreditors = creditors.filter((c) => c.isClient);
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
            id: String(Date.now()),
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

        // PHASE 29: Unified claim type logic
        executionData.claimType = claimType;

        // ─── محرك الإحضار: استنتاج تلقائي من نوع المطالبة ومهنة المدين وهدف التنفيذ (دون حقول يدوية) ───
        const inferIsAlimonyClaim = (ct: string) =>
            Boolean(ct?.includes('نفقة') && !ct?.includes('نفقة عدة') && !ct?.includes('مهر'));
        // @ts-expect-error - runtime field
        executionData.summoningClaimNature = deriveMonetaryClaimNature(claimType, null);
        // @ts-expect-error - dynamic runtime property
        executionData.isAlimony = inferIsAlimonyClaim(claimType);
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
            return {
                id: String(d.id),
                name: d.name.trim(),
                phone: d.phone.trim() || undefined,
                address: d.address.trim() || undefined,
                isEmployee: emp,
                employmentInitialWasEmployee: emp,
                status: 'Active' as const,
                allocated_debt: applyPartySplit ? debtorAllocatedShares[i + 1] ?? 0 : 0,
                paid_amount: 0,
            };
        });

        const trimmedAdditionalCreditors = additionalCreditors
            .filter((c) => c.name.trim())
            .map((c) => ({
                id: c.id,
                name: c.name.trim(),
                phone: c.phone?.trim() || undefined,
            }));

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
        // ✅ UPDATED: Support new marriage deed types
        if (parseMoneyInput(totalAmount) > 0) {
            executionData.totalAmount = parseMoneyInput(totalAmount);
        } else if (parseMoneyInput(claimAmount) > 0) {
            executionData.totalAmount = parseMoneyInput(claimAmount);
        }
        
        // === 🎯 CRITICAL: SMART ALIMONY DATA SAVE (2026-03-12) ===
        if (claimType === 'نفقة') {
            // النظام الذكي الجديد
            executionData.alimony = {
                beneficiary: alimonyBeneficiary,
                lawsuitDate: alimonyLawsuitDate,
                executionDate: alimonyExecutionDate,
                wifeMonthly: alimonyWifeMonthly,
                childrenMonthly: alimonyChildrenMonthly,
                hasPastWife: alimonyHasPastWife,
                pastLawSystem: alimonyPastLawSystem,
                pastStartDate: alimonyPastStartDate,
                calculated: calculatedAlimonyNew ? {
                    baseDurationMonths: calculatedAlimonyNew.baseDurationMonths,
                    baseDurationDays: calculatedAlimonyNew.baseDurationDays,
                    baseAccumulation: calculatedAlimonyNew.baseAccumulation,
                    pastDurationMonths: calculatedAlimonyNew.pastDurationMonths,
                    pastAccumulation: calculatedAlimonyNew.pastAccumulation,
                    totalAccumulated: calculatedAlimonyNew.totalAccumulated,
                    monthlyOngoing: calculatedAlimonyNew.monthlyOngoing,
                    legalCapApplied: calculatedAlimonyNew.legalCapApplied,
                    explanation: calculatedAlimonyNew.explanation
                } : null
            };
            
            // للتوافق مع Dashboard: حفظ المبلغ الكلي في totalAmount
            executionData.totalAmount = Math.max(0, Math.round(calculatedAlimonyNew?.totalAccumulated ?? 0));
            executionData.monthlyAlimony = calculatedAlimonyNew?.monthlyOngoing || 0;
        }
        
        // مشاهدة واستصحاب: مبيت جعفري + أسماء الأولاد
        if (claimType === 'مشاهدة') {
            executionData.includesSleepover = includesSleepover;
            const trimmedChildNames = visitationChildrenNames.map((n) => n.trim()).filter(Boolean);
            if (trimmedChildNames.length > 0) {
                (executionData as any).visitationChildrenNames = trimmedChildNames;
            }
        }

        if (claimType === 'تسليم ولد') {
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
        
        // Furniture details
        if (claimType === 'أثاث زوجية') {
            executionData.furnitureValue = parseMoneyInput(furnitureValue);
            executionData.furnitureDetails = furnitureDetails;
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
        const creditorClientRow = creditors.find((c) => c.isClient) || creditors[0];
        const debtorClientRow =
            [...debtors, ...additionalDebtorsForm].find((d) => d.isClient) || debtors[0];
        executionData.applicant =
            representedParty === 'creditor' ? creditorClientRow as any : debtorClientRow as any;
        executionData.respondent =
            representedParty === 'creditor' ? debtors[0] as any : creditors[0] as any;
        executionData.initiatorRole = representedParty as string;

        if (isFinancialClaimForPartySplit(claimType) && globalClaimTotal > 0) {
            // @ts-expect-error - runtime field
            executionData.debtAmount = globalClaimTotal;
            (executionData as any).total_remaining_balance = globalClaimTotal;
            (executionData as any).paidDebt = 0;
        }
        
        // Add classification (from unified dropdown)
        if (classification && classification !== 'none') {
            executionData.classification = classification;
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

    if (!isOpen) {
        debug.log('❌ [ExecutionCreationView] Modal is closed (isOpen = false)');
        return null;
    }

    debug.log('✅ [ExecutionCreationView] Modal is OPEN! Rendering form...');
    
    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            dir="rtl"
            className="flex flex-col w-full h-screen bg-[#0B1120] overflow-hidden fixed inset-0 z-[220]"
        >
                {/* === FIXED HEADER === */}
                <div className="flex-shrink-0 flex justify-between items-center w-full border-b border-gray-800 px-2 py-3 bg-[#0B1120] shadow-sm z-20">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl md:text-2xl font-bold text-amber-500 flex items-center gap-3">
                            <Gavel size={24} />
                            فتح إضبارة تنفيذ
                        </h1>
                        <button 
                            type="button" 
                            onClick={fillMockData} 
                            className="flex items-center gap-1 text-[10px] bg-purple-900/30 text-purple-300 px-2 py-1 rounded border border-purple-700/50 hover:bg-purple-800/50 transition-all cursor-pointer"
                        >
                            <Code size={12} /> 
                            تعبئة للمطور
                        </button>
                    </div>
                    <button type="button" 
                        onClick={onClose}
                        className="text-gray-400 hover:text-rose-500 p-2 rounded-lg transition-colors flex items-center gap-2 bg-gray-900/50"
                    >
                        <X size={20} />
                        <span className="text-sm font-medium">إغلاق</span>
                    </button>
                </div>

                {/* === SCROLLABLE CONTENT === */}
                <div className="flex-1 w-full overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden px-2 py-2">
                    <div className="w-full space-y-3">
                        
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

                        {/* === ✨ V48.6: CARD 3: BORDERLESS - NO BACKGROUND === */}
                        <div className="w-full px-3 py-4">
                            {/* 🎯 V48: Header - NO ICON, Premium Typography, Glowing Cyan/Emerald Accent */}
                            <div className="mb-5 pb-3 border-b border-cyan-500/30">
                                <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-500 to-teal-600 tracking-wide drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">
                                    السند المنفذ
                                </h3>
                            </div>

                            <div className="flex flex-col gap-3">
                                {/* ✅ تصحيح 1: تغيير الاسم من "نوع السند" إلى "قرارات المحاكم" عند اختيار أحكام المحاكم */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-2">
                                        نوع السند المنفذ
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setDocTypeSheetOpen(true)}
                                        className="w-full bg-[#111827] border-2 border-gray-700 rounded-lg p-3 text-white focus:border-amber-500 outline-none hover:border-gray-600 transition-all flex flex-row-reverse items-center justify-between gap-2 text-right"
                                    >
                                        <ChevronDown size={18} className="text-gray-400 shrink-0" />
                                        <span className="flex-1 truncate font-medium">
                                            {currentDocTypeLabel || '-- اختر نوع السند المنفذ --'}
                                        </span>
                                    </button>
                                </div>

                                {/* ✅ تصحيح 1: رقم الحكم وتاريخ الحكم - يظهر فقط للأحكام القضائية */}
                                {docType === 'قرارات وأحكام المحاكم' && (
                                    <div className="bg-amber-950/10 border border-amber-900/30 rounded-xl p-3 space-y-3 animate-fade-in">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-amber-400 mb-2">رقم الحكم</label>
                                                <input 
                                                    type="text"
                                                    placeholder="مثال: 1234/2024"
                                                    value={docNumber}
                                                    onChange={(e) => setDocNumber(e.target.value)}
                                                    className="w-full bg-[#0B1120] border border-gray-700 text-white p-3 rounded-lg focus:border-amber-500 outline-none placeholder-gray-600"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-amber-400 mb-2">تاريخ الحكم</label>
                                                <input 
                                                    type="date"
                                                    value={judgmentDate}
                                                    onChange={(e) => setJudgmentDate(e.target.value)}
                                                    placeholder="DD/MM/YYYY"
                                                    style={{ direction: 'ltr', textAlign: 'right' }}
                                                    className="w-full bg-[#0B1120] border border-gray-700 text-white p-3 rounded-lg focus:border-amber-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 2. CLASSIFICATION DROPDOWN (التصنيف) - PHASE 31: HIDE for Sharia Deeds */}
                                {docType !== 'الحجج الشرعية' && getClassificationOptions().length > 0 && (
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-2">التصنيف</label>
                                        <select 
                                            value={classification}
                                            onChange={(e) => handleClassificationChange(e.target.value)}
                                            disabled={!docType}
                                            className={`w-full bg-[#111827] border-2 border-gray-700 rounded-lg p-3 outline-none transition-all ${
                                                !docType 
                                                    ? 'text-gray-600 cursor-not-allowed opacity-50' 
                                                    : 'text-white focus:border-indigo-500 hover:border-gray-600 cursor-pointer'
                                            }`}
                                        >
                                            <option value="" disabled>
                                                {!docType ? '-- اختر نوع السند أولاً --' : '-- اختر التصنيف --'}
                                            </option>
                                            {getClassificationOptions().map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* 3. CLAIM TYPE DROPDOWN (نوع المطالبة والتنفيذ) - PHASE 28: Unified */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-2 flex items-center gap-2 flex-wrap">
                                        نوع المطالبة والتنفيذ
                                        {/* ✅ CRITICAL LOGIC: Auto-filled & Locked for Commercial Papers */}
                                        {docType === 'الأوراق التجارية' && (
                                            <span className="text-xs text-amber-400 font-normal">(تلقائي - الصكوك دائماً مطالبات مالية)</span>
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
                                                    if (!claimPickerLocked && !claimPickerEmpty) setClaimTypeSheetOpen(true);
                                                }}
                                                className={`w-full bg-[#111827] border-2 border-gray-700 rounded-lg p-3 outline-none transition-all flex flex-row-reverse items-center justify-between gap-2 text-right ${
                                                    claimPickerLocked || claimPickerEmpty
                                                        ? 'text-gray-400 cursor-not-allowed opacity-70'
                                                        : 'text-white focus:border-emerald-500 hover:border-gray-600 cursor-pointer'
                                                }`}
                                            >
                                                <ChevronDown size={18} className="text-gray-400 shrink-0" />
                                                <span className="flex-1 truncate font-medium">{claimButtonLabel}</span>
                                            </button>
                                        );
                                    })()}
                                </div>

                                {/* ✅ حقل رقم السند تم نقله للأعلى في قسم "رقم الحكم" للأحكام القضائية */}
                                {/* يظهر فقط لغير الأحكام القضائية والحجج الشرعية */}
                                {/* ✅ CRITICAL LOGIC: Dynamic Labels for Commercial Papers */}
                                {docType !== 'الحجج الشرعية' && docType !== 'قرارات وأحكام المحاكم' && docType && (
                                    <div>
                                        {docType === 'الأوراق التجارية' && (
                                            <label className="block text-xs font-bold text-amber-400 mb-2">
                                                رقم الصك / الكمبيالة
                                            </label>
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
                                            className="w-full bg-[#0B1120] border border-gray-700 text-white p-3 rounded-lg focus:border-amber-500 outline-none placeholder-gray-600"
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
                                    <div className="bg-indigo-950/20 border border-indigo-900/50 rounded-xl p-3 space-y-3 animate-fade-in">
                                        <div className="border-b border-indigo-800/30 pb-2 mb-3">
                                            <h4 className="text-indigo-400 font-bold text-sm flex items-center gap-2">
                                                <FileText size={16} />
                                                بيانات الحجة الشرعية
                                            </h4>
                                        </div>
                                        
                                        {/* Row 1: Deed Number, Register Number, Issue Date */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-xs text-gray-400 block mb-1">العدد / رقم الحجة</label>
                                                <input 
                                                    type="text"
                                                    placeholder="مثال: 1234"
                                                    value={shariaDeedNumber}
                                                    onChange={(e) => setShariaDeedNumber(e.target.value)}
                                                    className="w-full bg-[#0B1120] border border-gray-700 text-white p-3 rounded-lg focus:border-indigo-500 outline-none placeholder-gray-600 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-400 block mb-1">رقم السجل</label>
                                                <input 
                                                    type="text"
                                                    placeholder="مثال: 56"
                                                    value={shariaRegisterNumber}
                                                    onChange={(e) => setShariaRegisterNumber(e.target.value)}
                                                    className="w-full bg-[#0B1120] border border-gray-700 text-white p-3 rounded-lg focus:border-indigo-500 outline-none placeholder-gray-600 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-400 block mb-1">تاريخ الإصدار</label>
                                                <input 
                                                    type="date"
                                                    value={shariaIssueDate}
                                                    onChange={(e) => setShariaIssueDate(e.target.value)}
                                                    style={{ direction: 'ltr', textAlign: 'right' }}
                                                    className="w-full bg-[#0B1120] border border-gray-700 text-white p-3 rounded-lg focus:border-indigo-500 outline-none text-sm"
                                                />
                                            </div>
                                        </div>
                                        
                                        {/* Row 2: Issuing Court - PHASE 50: HIDDEN for Dowry */}
                                        {/* ✅ UPDATED: Hide for all marriage deed types */}
                                        {!['مهر مؤجل', 'حجة زواج - مهر معجل', 'حجة زواج - مهر مؤجل'].includes(claimType) && (
                                            <div>
                                                <label className="text-xs text-gray-400 block mb-1">المحكمة الشرعية المصدرة</label>
                                                <input 
                                                    type="text"
                                                    placeholder="مثال: محكمة الأحوال الشخصية في الكرخ"
                                                    value={shariaIssuingCourt}
                                                    onChange={(e) => setShariaIssuingCourt(e.target.value)}
                                                    className="w-full bg-[#0B1120] border border-gray-700 text-white p-3 rounded-lg focus:border-indigo-500 outline-none placeholder-gray-600 text-sm"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {/* === PHASE 28: CONDITIONAL DYNAMIC INPUTS === */}
                                
                                {/* STATE A: MONETARY CLAIMS - Amount Input - PHASE 42: All Sharia Deeds */}
                                {/* ✅ UPDATED: Support new marriage deed types */}
                                {claimType && ['استحصال دين مالي', 'استخلاص دين مالي', 'مهر مؤجل', 'حجة زواج - مهر معجل', 'حجة زواج - مهر مؤجل', 'حجة وصية', 'حجة تخارج', 'حجة مخالعة', 'حجة إقرار بدين', 'نفقة عدة', 'تعويض عن طلاق تعسفي', 'استيفاء دين من بيع عقار'].includes(claimType) && (
                                    <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-xl p-3 animate-fade-in space-y-3">
                                        <label className="block text-sm font-bold text-emerald-400 mb-2">المبلغ المطلوب (دينار)</label>
                                        <div className="flex items-center gap-2 w-full bg-[#0B1120] border border-gray-700 rounded-lg p-3 focus-within:border-emerald-500">
                                            <DollarSign className="text-gray-500 flex-shrink-0" size={18} />
                                            <input 
                                                type="text"
                                                value={formatCurrency(totalAmount)}
                                                onChange={(e) => handleAmountChange(e, setTotalAmount)}
                                                className="flex-1 bg-transparent text-white outline-none font-mono text-lg"
                                                placeholder="0"
                                            />
                                        </div>
                                        
                                        {/* MASTER PHASE: 5% Collection Fee Badge for Sharia Deeds */}
                                        {/* ✅ UPDATED: Include new marriage deed types */}
                                        {['مهر مؤجل', 'حجة زواج - مهر معجل', 'حجة زواج - مهر مؤجل', 'حجة وصية', 'حجة تخارج', 'حجة مخالعة'].includes(claimType) && (
                                            <div className="flex items-center gap-2 bg-amber-950/30 border border-amber-800/50 rounded-lg p-2">
                                                <Zap className="text-amber-500 flex-shrink-0" size={16} />
                                                <span className="text-amber-400 text-xs font-bold">خاضع لرسم التحصيل: 5%</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {claimType === 'نفقة' && (
                                    <SmartAlimonyCalculator
                                        alimonyBeneficiary={alimonyBeneficiary}
                                        alimonyLawsuitDate={alimonyLawsuitDate}
                                        alimonyExecutionDate={alimonyExecutionDate}
                                        alimonyWifeMonthly={alimonyWifeMonthly}
                                        alimonyChildrenMonthly={alimonyChildrenMonthly}
                                        alimonyChildrenCount={alimonyChildrenCount}
                                        alimonyHasPastWife={alimonyHasPastWife}
                                        alimonyPastLawSystem={alimonyPastLawSystem}
                                        alimonyPastStartDate={alimonyPastStartDate}
                                        calculatedAlimonyNew={calculatedAlimonyNew}
                                        onBeneficiaryChange={setAlimonyBeneficiary}
                                        onLawsuitDateChange={setAlimonyLawsuitDate}
                                        onExecutionDateChange={setAlimonyExecutionDate}
                                        onWifeMonthlyChange={setAlimonyWifeMonthly}
                                        onChildrenMonthlyChange={setAlimonyChildrenMonthly}
                                        onChildrenCountChange={setAlimonyChildrenCount}
                                        onHasPastWifeChange={setAlimonyHasPastWife}
                                        onPastLawSystemChange={setAlimonyPastLawSystem}
                                        onPastStartDateChange={setAlimonyPastStartDate}
                                    />
                                )}
                                
                                {claimType === 'حجة نفقة اتفاقية' && (
                                    <SmartAlimonyCalculator
                                        alimonyBeneficiary={alimonyBeneficiary}
                                        alimonyLawsuitDate={alimonyLawsuitDate}
                                        alimonyExecutionDate={alimonyExecutionDate}
                                        alimonyWifeMonthly={alimonyWifeMonthly}
                                        alimonyChildrenMonthly={alimonyChildrenMonthly}
                                        alimonyChildrenCount={alimonyChildrenCount}
                                        alimonyHasPastWife={alimonyHasPastWife}
                                        alimonyPastLawSystem={alimonyPastLawSystem}
                                        alimonyPastStartDate={alimonyPastStartDate}
                                        calculatedAlimonyNew={calculatedAlimonyNew}
                                        onBeneficiaryChange={setAlimonyBeneficiary}
                                        onLawsuitDateChange={setAlimonyLawsuitDate}
                                        onExecutionDateChange={setAlimonyExecutionDate}
                                        onWifeMonthlyChange={setAlimonyWifeMonthly}
                                        onChildrenMonthlyChange={setAlimonyChildrenMonthly}
                                        onChildrenCountChange={setAlimonyChildrenCount}
                                        onHasPastWifeChange={setAlimonyHasPastWife}
                                        onPastLawSystemChange={setAlimonyPastLawSystem}
                                        onPastStartDateChange={setAlimonyPastStartDate}
                                    />
                                )}
                                
                                {/* ✅ IRAQI LAW: Deferred Dowry Reason — مخفي لمسار أحكام المحاكم + مهر مؤجل (الطلب حصراً من مسار الحجج الشرعية) */}
                                {['مهر مؤجل', 'حجة زواج - مهر مؤجل'].includes(claimType) && !(docType === 'قرارات وأحكام المحاكم' && claimType === 'مهر مؤجل') && (
                                    <div className="bg-rose-950/20 border border-rose-900/50 rounded-xl p-3 animate-fade-in space-y-3">
                                        <label className="block text-sm font-bold text-rose-400 mb-2">
                                            سبب استحقاق المهر المؤجل
                                            <span className="text-gray-500 text-xs font-normal mr-2">
                                                (أقرب الأجلين: الطلاق أو الوفاة)
                                            </span>
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setDowryReason('طلاق')}
                                                className={`px-4 py-3 rounded-lg border font-bold text-sm transition-all ${
                                                    dowryReason === 'طلاق'
                                                        ? 'bg-rose-500/30 border-rose-500 text-rose-300'
                                                        : 'bg-[#0B1120] border-gray-700 text-gray-400 hover:border-rose-500/30'
                                                }`}
                                            >
                                                طلاق
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDowryReason('وفاة')}
                                                className={`px-4 py-3 rounded-lg border font-bold text-sm transition-all ${
                                                    dowryReason === 'وفاة'
                                                        ? 'bg-rose-500/30 border-rose-500 text-rose-300'
                                                        : 'bg-[#0B1120] border-gray-700 text-gray-400 hover:border-rose-500/30'
                                                }`}
                                            >
                                                وفاة
                                            </button>
                                        </div>
                                        <div className="text-xs text-rose-300 bg-rose-900/20 border border-rose-800/30 rounded p-2">
                                            {dowryReason === 'طلاق' 
                                                ? '⚠️ يجب إرفاق قرار حكم الطلاق القطعي (المكتسب الدرجة القطعية)'
                                                : '⚠️ يجب إرفاق شهادة وفاة الزوج + قسام شرعي لتحديد الورثة'
                                            }
                                        </div>
                                    </div>
                                )}

                                {/* MASTER PHASE: SHARIA DEED DETAILS (Will & Takharuj only) */}
                                {['حجة وصية', 'حجة تخارج'].includes(claimType) && (
                                    <div className="bg-indigo-950/20 border border-indigo-900/50 rounded-xl p-3 animate-fade-in">
                                        <label className="block text-sm font-bold text-indigo-400 mb-2">
                                            تفاصيل الحجة
                                            <span className="text-gray-500 text-xs font-normal mr-2">
                                                (مثال: لمن الوصية، أو من تخارج لمن)
                                            </span>
                                        </label>
                                        <textarea
                                            value={shariaDeedDetails}
                                            onChange={(e) => setShariaDeedDetails(e.target.value)}
                                            rows={3}
                                            placeholder="اكتب تفاصيل الحجة هنا..."
                                            className="w-full bg-[#0B1120] border border-gray-700 text-white p-3 rounded-lg focus:border-indigo-500 outline-none placeholder-gray-600 resize-none"
                                        />
                                    </div>
                                )}
                                
                                {isEvictionClaim(claimType) && (
                                    <EvictionSection
                                        evictionPropertyNumber={evictionPropertyNumber}
                                        evictionDistrict={evictionDistrict}
                                        evictionPropertyType={evictionPropertyType}
                                        evictionFullAddress={evictionFullAddress}
                                        evictionPremisesUse={evictionPremisesUse}
                                        onPropertyNumberChange={setEvictionPropertyNumber}
                                        onDistrictChange={setEvictionDistrict}
                                        onPropertyTypeChange={setEvictionPropertyType}
                                        onFullAddressChange={setEvictionFullAddress}
                                        onPremisesUseChange={setEvictionPremisesUse}
                                    />
                                )}

                                {claimType === 'أثاث زوجية' && (
                                    <div className="bg-purple-950/20 border border-purple-900/50 rounded-xl p-3 space-y-3 animate-fade-in">
                                        <div>
                                            <label className="block text-sm font-bold text-purple-400 mb-2">قيمة الأثاث المقدرة في الحكم (دينار)</label>
                                            <div className="flex items-center gap-2 w-full bg-[#0B1120] border border-gray-700 rounded-lg p-3 focus-within:border-purple-500">
                                                <DollarSign className="text-gray-500 flex-shrink-0" size={18} />
                                                <input 
                                                    type="text"
                                                    value={formatCurrency(furnitureValue)}
                                                    onChange={(e) => handleAmountChange(e, setFurnitureValue)}
                                                    className="flex-1 bg-transparent text-white outline-none font-mono text-lg"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-purple-400 mb-2">الأثاث المحكوم بها (اكتب التفاصيل)</label>
                                            <textarea
                                                value={furnitureDetails}
                                                onChange={(e) => setFurnitureDetails(e.target.value)}
                                                className="w-full bg-[#0B1120] border border-gray-700 text-white p-3 rounded-lg focus:border-purple-500 outline-none placeholder-gray-600 min-h-[80px]"
                                                placeholder="مثال: سرير غرفة نوم، ثلاجة، أريكة..."
                                            />
                                        </div>
                                    </div>
                                )}
                                
                                {/* STATE C: COMMERCIAL PAPERS - Due Date */}
                                {docType === 'الأوراق التجارية' && (
                                    <div className="bg-indigo-950/20 border border-indigo-900/50 rounded-xl p-3 animate-fade-in">
                                        <label className="block text-sm font-bold text-indigo-400 mb-2 flex items-center gap-2">
                                            <Calendar size={16} />
                                            تاريخ الاستحقاق (إلزامي)
                                        </label>
                                        <input 
                                            type="date"
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                            style={{ direction: 'ltr', textAlign: 'right' }}
                                            className="w-full bg-[#0B1120] border border-gray-700 text-white p-3 rounded-lg focus:border-indigo-500 outline-none"
                                        />
                                        {dueDate && new Date(dueDate) > new Date() && (
                                            <p className="text-amber-500 text-xs mt-2 flex items-center gap-1">
                                                <AlertTriangle size={14} />
                                                التاريخ في المستقبل - لن يتم قبول التقديم حتى تاريخ الاستحقاق
                                            </p>
                                        )}
                                    </div>
                                )}
                                
                                {/* 🔍 EXECUTION TARGET FILTER - Commercial Papers & Debt Acknowledgments */}
                                {(docType === 'الأوراق التجارية' || docType === 'السندات المتضمنة إقراراً بدين') && (
                                    <div className="bg-amber-950/20 border border-amber-900/50 rounded-xl p-3 animate-fade-in">
                                        <label className="block text-sm font-bold text-amber-400 mb-2">
                                            المنفذ ضده (الطرف المستهدف بالتنفيذ)
                                        </label>
                                        <select 
                                            value={executionTarget}
                                            onChange={(e) => setExecutionTarget(e.target.value as any)}
                                            className="w-full bg-[#0B1120] border border-gray-700 text-white p-3 rounded-lg focus:border-amber-500 outline-none"
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
                                            <div className="mt-2 bg-yellow-950/30 border border-yellow-900/50 rounded-lg p-2">
                                                <p className="text-yellow-400 text-xs flex items-center gap-1">
                                                    <AlertTriangle size={14} />
                                                    مسموح، لكن المنفذ العدل مُلزم بتبليغ المدين الأصلي أولاً للوقوف على اعتراضاته
                                                </p>
                                            </div>
                                        )}
                                        
                                        {docType === 'السندات المتضمنة إقراراً بدين' && executionTarget === 'كفيل متضامن' && (
                                            <div className="mt-2 bg-emerald-950/30 border border-emerald-900/50 rounded-lg p-2">
                                                <p className="text-emerald-400 text-xs flex items-center gap-1">
                                                    <Zap size={14} />
                                                    سيتم إمهال المدين الأصلي 7 أيام من تاريخ التبليغ قبل الحجز على الكفيل
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {/* 🛑 DOCUMENT BLOCKED BANNER */}
                                {isDocumentBlocked && (
                                    <div className="bg-rose-950/30 border-2 border-rose-500 rounded-xl p-4 animate-fade-in">
                                        <h4 className="text-rose-400 font-bold text-lg mb-2 flex items-center gap-2">
                                            <AlertTriangle size={20} />
                                            🛑 توقف - السند فقد قوته التنفيذية
                                        </h4>
                                        <p className="text-rose-300 text-sm leading-relaxed mb-3">
                                            استناداً للفقرة رابعاً من المادة 14، فقدَ هذا السند قوته التنفيذية المباشرة. لا تراجع مديرية التنفيذ.
                                        </p>
                                        <div className="bg-rose-900/30 border border-rose-800/50 rounded-lg p-3">
                                            <p className="text-white text-sm font-bold mb-1">الحل القانوني:</p>
                                            <p className="text-gray-300 text-xs">
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
                                        <div className="bg-purple-950/20 border border-purple-900/50 rounded-xl p-3 animate-fade-in">
                                            <label className="block text-sm font-bold text-purple-400 mb-3">سبب الاستحقاق:</label>
                                            <div className="flex gap-3">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input 
                                                        type="radio"
                                                        name="dowryReason"
                                                        value="طلاق"
                                                        checked={dowryReason === 'طلاق'}
                                                        onChange={(e) => setDowryReason(e.target.value as 'طلاق' | 'وفاة')}
                                                        className="w-4 h-4 accent-purple-500"
                                                    />
                                                    <span className="text-white">الطلاق</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input 
                                                        type="radio"
                                                        name="dowryReason"
                                                        value="وفاة"
                                                        checked={dowryReason === 'وفاة'}
                                                        onChange={(e) => setDowryReason(e.target.value as 'طلاق' | 'وفاة')}
                                                        className="w-4 h-4 accent-purple-500"
                                                    />
                                                    <span className="text-white">الوفاة</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {/* VARIANT C: WILL & TAKHARUJ DEEDS - PHASE 42 */}
                                {docType === 'الحجج الشرعية' && (claimType === 'حجة وصية' || claimType === 'حجة تخارج') && (
                                    <div className="bg-blue-950/20 border border-blue-900/50 rounded-xl p-3 animate-fade-in">
                                        <label className="block text-sm font-bold text-blue-400 mb-2">
                                            تفاصيل الحجة (مثال: اسم الموصى له، أو تفاصيل حصص التخارج)
                                        </label>
                                        <textarea 
                                            value={guardianshipDetails}
                                            onChange={(e) => setGuardianshipDetails(e.target.value)}
                                            className="w-full bg-[#0B1120] border border-gray-700 text-white p-3 rounded-lg focus:border-blue-500 outline-none resize-none"
                                            rows={4}
                                            placeholder={claimType === 'حجة وصية' 
                                                ? "مثال: الموصى له: محمد علي، الحصة الموصى بها: ربع التركة..."
                                                : "مثال: تفاصيل حصص الورثة المتخارجين والمبالغ المتفق عليها..."
                                            }
                                        />
                                    </div>
                                )}
                                
                                {/* === PHASE 43: SHARIA DEEDS BADGES (Legal Fees & Expedited Execution) === */}
                                {docType === 'الحجج الشرعية' && claimType && (
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        {/* Standard 5% Collection Fee Badge */}
                                        <div className="bg-gray-800/60 border border-gray-700 px-4 py-2 rounded-lg flex items-center gap-2">
                                            <DollarSign size={16} className="text-gray-400" />
                                            <span className="text-gray-300 text-sm font-semibold">
                                                خاضع لرسم التحصيل: 5%
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {docType === 'تنفيذ الأحكام الأجنبية' && (
                                <ForeignJudgmentSection
                                    foreignData={foreignData}
                                    onForeignDataChange={setForeignData}
                                />
                            )}
                        </div>

                        {/* ✅ DELETED: دليل التنفيذ القانوني - All tracking, calculations, and legal warnings belong exclusively to the Active Dashboard, NOT the creation form */}

                        {/* ✅ DELETED: متتبع المواعيد القانونية - Statute of Limitations & Notification Tracker belong to Dashboard */}

                        {/* === PHASE 30: ADDITIONAL SHARIA-SPECIFIC INPUTS === */}
                        {claimType && ['مشاهدة', 'تسليم ولد', 'أثاث زوجية'].includes(claimType) && (
                            <div className="w-full px-3 py-4">{/* Header */}
                                <div className="pb-3 mb-3 border-b border-amber-800/30">
                                    <h3 className="text-amber-400 font-bold text-lg">تفاصيل إضافية للمطالبة الشرعية</h3>
                                </div>

                                {/* === CONDITIONAL: VISITATION SLEEPOVER === */}
                                {claimType === 'مشاهدة' && (
                                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input 
                                                type="checkbox"
                                                checked={includesSleepover}
                                                onChange={(e) => setIncludesSleepover(e.target.checked)}
                                                className="w-5 h-5 accent-blue-500 flex-shrink-0"
                                            />
                                            <span className="text-blue-400 font-bold text-sm">يتضمن مبيت (وفق الفقه الجعفري)</span>
                                        </label>
                                    </div>
                                )}

                                {claimType === 'مشاهدة' && (
                                    <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg space-y-3">
                                        <p className="text-blue-400 font-bold text-sm">أسماء الأولاد (مشاهدة واستصحاب)</p>
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
                                                    placeholder={`اسم الولد ${idx + 1}`}
                                                    className="flex-1 bg-[#0B1120] border border-gray-700 text-white p-3 rounded-lg focus:border-blue-500 outline-none placeholder-gray-600 text-sm"
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
                                            className="flex items-center gap-2 text-xs text-blue-300 hover:text-blue-200 font-bold"
                                        >
                                            <Plus size={14} />
                                            إضافة اسم
                                        </button>
                                    </div>
                                )}

                                {claimType === 'تسليم ولد' && (
                                    <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg space-y-3">
                                        <p className="text-blue-400 font-bold text-sm">أسماء المحضونين (تسليم حضانة)</p>
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
                                                    className="flex-1 bg-[#0B1120] border border-gray-700 text-white p-3 rounded-lg focus:border-blue-500 outline-none placeholder-gray-600 text-sm"
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
                                            className="flex items-center gap-2 text-xs text-blue-300 hover:text-blue-200 font-bold"
                                        >
                                            <Plus size={14} />
                                            إضافة محضون
                                        </button>
                                    </div>
                                )}

                                {/* === PHASE 30: Removed IDDAH ALIMONY section - now handled via unified amount input === */}
                                {/* === PHASE 30: Removed MONEY CLAIM section - now handled via unified amount input === */}
                                {/* === CONDITIONAL: ALIMONY ENGINE - REMOVED IN PHASE 48 === */}
                                
                                {/* === Furniture details moved to dynamic inputs === */}
                            </div>
                        )}
                        
                        {/* ✅ DELETED: الملخص المالي الذكي - Auto-calculated financial summary belongs to Dashboard */}

                        {/* === FINANCIAL SETTINGS & FEES (الإعدادات المالية والأتعاب) === */}
                        {/* ✅ CRITICAL UPDATE (2026-03-11): HIDE FOR ALL NON-FINANCIAL CLAIMS */}
                        {/* Rule: Hide "المبلغ المطلوب" field for non-financial executions */}
                        {claimType && ![
                            'تسليم طفل', 'استصحاب', 'مبيت', 'حجة وصاية'
                        ].includes(claimType) && (
                        <div className="w-full bg-gradient-to-br from-[#111827] to-[#0f172a] border-2 border-indigo-900/50 p-4 rounded-xl">
                            {/* Header */}
                            <h3 className="text-indigo-400 font-black text-lg mb-3 flex items-center gap-2">
                                <DollarSign size={20} />
                                الإعدادات المالية والأتعاب
                            </h3>
                            
                            {/* NEW: Client Fees Input */}
                            <div className="mb-3">
                                <label className="text-xs text-gray-400 block mb-2">أتعاب المحاماة المتفق عليها مع الموكل (دينار)</label>
                                <input 
                                    type="text"
                                    value={formatCurrency(clientFeesAmount)}
                                    onChange={(e) => handleAmountChange(e, setClientFeesAmount)}
                                    className="w-full bg-[#0B1120] border border-gray-700 p-3 rounded-lg text-white font-mono"
                                    placeholder="تُدفع من الموكل للمحامي..."
                                />
                            </div>
                            
                            {/* Existing: Court-Awarded Fees Checkbox */}
                            <div className="bg-[#0B1120] border border-gray-800 p-3 rounded-lg">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={includeLawyerFees}
                                        onChange={(e) => setIncludeLawyerFees(e.target.checked)}
                                        className="w-5 h-5 accent-amber-500 rounded border-gray-700"
                                    />
                                    <span className="text-amber-500 font-bold">⚖️ المطالبة بأتعاب المحاماة المحكوم بها</span>
                                </label>
                                {includeLawyerFees && (
                                    <div className="mt-3 pl-8">
                                        <label className="text-xs text-gray-400 mb-1 block">مقدار أتعاب المحاماة (دينار)</label>
                                        <input 
                                            type="text"
                                            value={formatCurrency(lawyerFeesAmount)}
                                            onChange={(e) => handleAmountChange(e, setLawyerFeesAmount)}
                                            className="w-full md:w-1/2 bg-[#111827] border border-gray-700 p-3 rounded-lg text-white font-mono"
                                            placeholder="مثال: 150000"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        )}
                        
                        <div className="h-6"></div> {/* Spacer */}
                    </div>
                </div>

                {/* 🎯 ExecutionSaveButton Component */}
                <ExecutionSaveButton onSubmit={handleSubmit} />

                <ExecutionOptionSheet
                    open={docTypeSheetOpen}
                    onClose={() => setDocTypeSheetOpen(false)}
                    title="نوع السند المنفذ"
                    options={EXECUTION_DOC_TYPE_OPTIONS}
                    selectedValue={docType}
                    onSelect={(v) => handleDocTypeChange(v)}
                />
                <ExecutionOptionSheet
                    open={claimTypeSheetOpen}
                    onClose={() => setClaimTypeSheetOpen(false)}
                    title="نوع المطالبة والتنفيذ"
                    options={claimTypeOptionsList}
                    selectedValue={claimType}
                    onSelect={(v) => setClaimType(v)}
                />
                
                {/* ✅ PRACTICAL CHEQUE VALIDATOR - DATA CAPTURE MODAL */}
                {showChequeValidatorModal && (
                    <div className="fixed inset-0 bg-black/80 z-[999999] flex items-center justify-center p-4" onClick={(e) => {
                        // Prevent closing on backdrop click if data is entered
                        if (!chequeBankName && !chequeIssueDate && !chequeNumber) {
                            setShowChequeValidatorModal(false);
                        }
                    }}>
                        <div className="bg-[#111827] border-2 border-amber-500/50 rounded-2xl p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-xl font-bold text-amber-500 mb-2 flex items-center gap-2">
                                <AlertTriangle size={24} />
                                بيانات الورقة التجارية (صك/كمبيالة)
                            </h3>
                            <p className="text-gray-300 text-sm mb-4">
                                📋 هذه البيانات ستُستخدم في طلب التنفيذ ومخاطبة المصرف
                            </p>
                            
                            <div className="space-y-4 mb-6">
                                {/* Bank Name */}
                                <div>
                                    <label className="block text-sm font-bold text-amber-400 mb-2">
                                        اسم المصرف المسحوب عليه *
                                    </label>
                                    <input 
                                        type="text"
                                        value={chequeBankName}
                                        onChange={(e) => setChequeBankName(e.target.value)}
                                        placeholder="مثال: مصرف الرافدين، المصرف الأهلي العراقي..."
                                        className="w-full bg-[#0B1120] border border-gray-700 text-white p-3 rounded-lg focus:border-amber-500 outline-none"
                                    />
                                </div>
                                
                                {/* Cheque Number */}
                                <div>
                                    <label className="block text-sm font-bold text-amber-400 mb-2">
                                        رقم الصك / الكمبيالة *
                                    </label>
                                    <input 
                                        type="text"
                                        value={chequeNumber}
                                        onChange={(e) => setChequeNumber(e.target.value)}
                                        placeholder="مثال: 12345678"
                                        className="w-full bg-[#0B1120] border border-gray-700 text-white p-3 rounded-lg focus:border-amber-500 outline-none"
                                    />
                                </div>
                                
                                {/* Issue Date */}
                                <div>
                                    <label className="block text-sm font-bold text-amber-400 mb-2 flex items-center gap-2">
                                        <Calendar size={16} />
                                        تاريخ إنشاء الصك
                                        <span className="text-gray-500 text-xs font-normal">(اختياري لكن مهم قانونياً)</span>
                                    </label>
                                    <input 
                                        type="date"
                                        value={chequeIssueDate}
                                        onChange={(e) => setChequeIssueDate(e.target.value)}
                                        className="w-full bg-[#0B1120] border border-gray-700 text-white p-3 rounded-lg focus:border-amber-500 outline-none"
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
                                    className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-bold py-3 rounded-lg transition-all"
                                >
                                    {chequeIssueDate ? 'تأكيد البيانات' : 'متابعة كسند عادي'}
                                </button>
                                <button type="button"
                                    onClick={() => {
                                        setShowChequeValidatorModal(false);
                                        setDocType('');
                                        setClaimType('');
                                    }}
                                    className="px-6 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition-all"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* 🛑 ABSENTEE CHECKLIST MODAL */}
                {showAbsenteeModal && (
                    <div className="fixed inset-0 bg-black/80 z-[999999] flex items-center justify-center p-4" onClick={() => setShowAbsenteeModal(false)}>
                        <div className="bg-[#111827] border-2 border-rose-500/50 rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-xl font-bold text-rose-500 mb-4 flex items-center gap-2">
                                <AlertTriangle size={24} />
                                فحص الغياب الإلزامي
                            </h3>
                            <p className="text-gray-300 text-sm mb-4">
                                يرجى الإجابة على الأسئلة التالية:
                            </p>
                            <div className="space-y-3 mb-6">
                                {[
                                    { key: 'isOutsideIraq', label: 'هل المدين متواجد خارج العراق؟' },
                                    { key: 'isAddressUnknown', label: 'هل محل إقامة المدين مجهول؟' },
                                    { key: 'isDiedDuringNotice', label: 'هل توفي المدين خلال فترة الإخبار؟' }
                                ].map(item => (
                                    <label key={item.key} className="flex items-center gap-3 bg-[#0B1120] border border-gray-700 p-3 rounded-lg">
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
