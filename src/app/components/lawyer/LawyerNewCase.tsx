import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    CheckCircle2, X, Plus,
    Coins, FlaskConical, Zap, Scale
} from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { getLegalRole } from './LawyerShared';
import { Form_Urgent_Actions } from './Form_Urgent_Actions';

const LazyViewUrgentDashboard = React.lazy(() =>
    import('./View_Urgent_And_Orders_Dashboard').then((m) => ({
        default: m.View_Urgent_And_Orders_Dashboard,
    })),
);
import { DeferredActiveOrderFile } from './DeferredActiveOrderFile';
import { fileDataFromUrgentForm } from '@/app/domain/urgent';
import { MAIN_GATEWAY, JURISDICTIONS, FIXED_FEE_KEYWORDS } from './LawyerNewCase/constants';
import type { MainCategory, CaseType, CivilSubView, Party, ThirdParty } from './LawyerNewCase/types';
import type { LawyerNewCaseProps } from '@/app/types/components';
import { GatewayCard } from './LawyerNewCase/components/GatewayCard';
import { JurisdictionCard } from './LawyerNewCase/components/JurisdictionCard';
import { PartyCard } from './LawyerNewCase/components/PartyCard';
import { ThirdPartyModal } from './LawyerNewCase/components/ThirdPartyModal';
import { CaseHeader } from './LawyerNewCase/components/CaseHeader';
import { CaseBasicsForm } from './LawyerNewCase/components/CaseBasicsForm';
import { FinancialSection } from './LawyerNewCase/components/FinancialSection';
import { CivilTabs } from './LawyerNewCase/components/CivilTabs';
import { SaveButton } from './LawyerNewCase/components/SaveButton';
import { PartiesSection } from './LawyerNewCase/components/PartiesSection';

export const LawyerNewCase: React.FC<LawyerNewCaseProps> = ({ onClose, onSave }) => {
    const debug = (window as unknown as Record<string, { log: (...args: unknown[]) => void }>).debug || { log: (...args: unknown[]) => console.log(...args) };
    const [step, setStep] = useState<'gateway' | 'selection' | 'form'>('selection');
    const [mainCategory, setMainCategory] = useState<MainCategory | null>('lawsuit');
    const [selectedType, setSelectedType] = useState<CaseType>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isExpertMode, setIsExpertMode] = useState(false);

    const [civilSubView, setCivilSubView] = useState<CivilSubView>('main-form');

    const [activeFileType, setActiveFileType] = useState<'order' | 'discovery' | 'acknowledgment' | null>(null);
    const [activeFileData, setActiveFileData] = useState<Record<string, unknown> | null>(null);

    const [parties1, setParties1] = useState<Party[]>([{ id: 'p1_1', name: '', status: '', isClient: false, phone: '', address: '' }]);
    const [parties2, setParties2] = useState<Party[]>([{ id: 'p2_1', name: '', status: '', isClient: false, phone: '', address: '' }]);

    const [isThirdPartyModalOpen, setIsThirdPartyModalOpen] = useState(false);
    const [thirdParties, setThirdParties] = useState<ThirdParty[]>([]);

    const [stageOptions, setStageOptions] = useState<string[]>(['بداءة بدرجة أولى', 'بداءة بدرجة أخيرة', 'استئناف', 'اعتراض على الحكم الغيابي', 'اعتراض الغير', 'إعادة المحاكمة']);
    const [isUndeterminedValue, setIsUndeterminedValue] = useState(false);
    const [isFixedFee, setIsFixedFee] = useState(false);
    const [errorMap, setErrorMap] = useState<Record<string, string>>({});
    const [exceptionWarning, setExceptionWarning] = useState<string | null>(null);
    const [valuePlaceholder, setValuePlaceholder] = useState('مهم لتحديد الاختصاص');
    const [caseNumberError, setCaseNumberError] = useState<string | null>(null);

    const [caseDetails, setCaseDetails] = useState({
        number: '234 / ب / 2024',
        court: '',
        type: '',
        judge: '',
        stage: '',
        claimValue: '',
        totalAgreedFees: ''
    });

    const topFormRef = useRef<HTMLDivElement>(null);
    const courtRef = useRef<HTMLInputElement>(null);
    const typeRef = useRef<HTMLInputElement>(null);
    const stageRef = useRef<HTMLSelectElement>(null);
    const numberRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const validationErrors: Record<string, string> = {};
        const GENERIC_ERROR = 'ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة';

        const court = caseDetails.court.toLowerCase();
        const type = caseDetails.type.toLowerCase();
        const stage = caseDetails.stage;
        const value = caseDetails.claimValue;

        if (court.includes('بداءة')) {
            const allowedStages = ['بداءة بدرجة أخيرة', 'بداءة بدرجة أولى', 'اعتراض على الحكم الغيابي', 'اعتراض الغير', 'إعادة المحاكمة'];
            if (stageOptions.join() !== allowedStages.join()) {
                setStageOptions(allowedStages);
            }
            if (stage.includes('استئناف')) {
                validationErrors['stage'] = GENERIC_ERROR;
            }
        }
        else if (court.includes('استئناف')) {
            const allowedStages = ['استئناف', 'اعتراض على الحكم الغيابي', 'اعتراض الير', 'إعادة المحاكمة'];
            if (stageOptions.join() !== allowedStages.join()) {
                setStageOptions(allowedStages);
            }
            if (stage.includes('بداءة')) {
                validationErrors['court'] = GENERIC_ERROR;
            }
        }
        else if (!court || (!court.includes('بداءة') && !court.includes('استئناف'))) {
            const defaultStages = ['بداءة بدرجة أولى', 'بداءة بدرجة أخيرة', 'استئناف', 'اعتراض على الحكم الغيابي', 'اعتراض الغير', 'إعادة المحاكمة'];
            if (stageOptions.join() !== defaultStages.join()) {
                setStageOptions(defaultStages);
            }
        }

        const blockedWords = ['شرعي', 'شرعية', 'أحوال', 'جنايات', 'جنح', 'جزاء', 'تحقيق', 'إداري', 'إدارية', 'موظفين'];

        if (blockedWords.some(word => court.includes(word))) {
            validationErrors['court'] = GENERIC_ERROR;
        }
        if (blockedWords.some(word => type.includes(word))) {
            validationErrors['type'] = GENERIC_ERROR;
        }

        const cleanValue = parseInt(value.replace(/[^0-9]/g, '')) || 0;
        const isEvictionOrSharing = type.includes('تخلي') || type.includes('شيوع');

        if (isEvictionOrSharing && stage && !stage.includes('استئناف')) {
            if (stage !== 'بداءة بدرجة أخيرة') {
                setCaseDetails(prev => ({ ...prev, stage: 'بداءة بدرجة أخيرة' }));
            }
        }
        else if ((isFixedFee || isUndeterminedValue) && !isEvictionOrSharing) {
            if (value !== '' || (stage !== 'بداءة بدرجة أخيرة' && !stage.includes('استئناف'))) {
                setCaseDetails(prev => ({ ...prev, claimValue: '', stage: prev.stage.includes('استئناف') ? prev.stage : 'بداءة بدرجة أخيرة' }));
            }
        }
        else if (cleanValue > 0 && !isEvictionOrSharing && !isFixedFee && !isUndeterminedValue && stage.includes('بداءة')) {
            if (cleanValue > 1000000 && stage !== 'بداءة بدرجة أولى') {
                setCaseDetails(prev => ({ ...prev, stage: 'بداءة بدرجة أولى' }));
            } else if (cleanValue <= 1000000 && stage !== 'بداءة بدرجة أخيرة') {
                setCaseDetails(prev => ({ ...prev, stage: 'بداءة بدرجة أخيرة' }));
            }
        }

        setErrorMap(prev => {
            const newMap: Record<string, string> = {};
            Object.keys(prev).forEach(key => {
                if (!['court', 'type', 'stage'].includes(key)) {
                    newMap[key] = prev[key];
                }
            });
            Object.keys(validationErrors).forEach(key => {
                newMap[key] = validationErrors[key];
            });
            return newMap;
        });

    }, [caseDetails.court, caseDetails.type, caseDetails.stage, caseDetails.claimValue, parties1, parties2, isFixedFee, isUndeterminedValue]);

    useEffect(() => {
        const type = caseDetails.type || '';
        if (type.includes('تخلي')) setValuePlaceholder('أدخل بدل الإيجار السنوي (مادة 18)');
        else if (type.includes('معارضة')) setValuePlaceholder('أدخل بدل المفعة السنوي');
        else if (type.includes('شفعة')) setValuePlaceholder('القيمة المسجلة بالطابو');
        else setValuePlaceholder('مهم لتحديد الاختصاص');
    }, [caseDetails.type]);

    useEffect(() => {
        const type = caseDetails.type || '';
        if (FIXED_FEE_KEYWORDS.some(k => type.includes(k))) {
            setIsFixedFee(true);
        }
    }, [caseDetails.type]);

    useEffect(() => {
        const stage = caseDetails.stage;
        if (!stage) {
            setParties1(prev => {
                const role = prev.length > 1 ? 'المدعين' : 'المدعي';
                if (prev.length > 0 && prev[0].status === role) return prev;
                return prev.map(p => ({ ...p, status: role }));
            });

            setParties2(prev => {
                const role = prev.length > 1 ? 'المدعى عليهم' : 'المدعى عليه';
                if (prev.length > 0 && prev[0].status === role) return prev;
                return prev.map(p => ({ ...p, status: role }));
            });
            return;
        }

        setParties1(prev => {
            const role = getLegalRole(stage, 1, prev.length);
            if (prev.length > 0 && prev[0].status === role) return prev;
            return prev.map(p => ({ ...p, status: role }));
        });

        setParties2(prev => {
            const role = getLegalRole(stage, 2, prev.length);
            if (prev.length > 0 && prev[0].status === role) return prev;
            return prev.map(p => ({ ...p, status: role }));
        });
    }, [caseDetails.stage, parties1.length, parties2.length]);

    useEffect(() => {
        const cleanValue = parseInt(caseDetails.claimValue.replace(/[^0-9]/g, '')) || 0;
        const EXCEPTION_TYPES = ['تخلي', 'شيوع', 'دين', 'استرداد', 'تعرض', 'وقف', 'تعويض'];
        const typeMatches = EXCEPTION_TYPES.some(t => (caseDetails.type || '').includes(t));

        if (cleanValue > 0 && cleanValue <= 1000000 && typeMatches) {
            if (exceptionWarning !== 'تنبيه: الطعن في هذه الدعوى يكون أمام محكمة الاستئناف بصفتها التمييزية') {
                setExceptionWarning('تنبيه: الطعن في هذه الدعوى يكون أمام محكمة الاستئناف بصفتها التمييزية');
            }
        } else {
            if (exceptionWarning !== null) setExceptionWarning(null);
        }
    }, [caseDetails.claimValue, caseDetails.type, exceptionWarning]);

    useEffect(() => {
        const num = caseDetails.number;
        const stage = caseDetails.stage;
        if (!num) {
            if (caseNumberError) setCaseNumberError(null);
            return;
        }

        const permissiveRegex = /^[\d\u0660-\u0669\s]+\/[\u0600-\u06FF\s]+\/[\d\u0660-\u0669\s]+$/;

        if (!permissiveRegex.test(num)) {
            const hint = 'يرجى استخدام الصيغة: رقم / حرف / سنة (مثال: 234 / ب / 2024)';
            if (caseNumberError !== hint) setCaseNumberError(hint);
        } else {
            if (caseNumberError) setCaseNumberError(null);
        }
    }, [caseDetails.number, caseDetails.stage, caseNumberError]);

    const scrollToElement = (ref: React.RefObject<HTMLInputElement | HTMLSelectElement>) => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        ref.current?.focus();
    };

    const handleSave = () => {
        const errors: Record<string, string> = {};
        let firstErrorRef: React.RefObject<HTMLInputElement | HTMLSelectElement> | null = null;

        const validationErrors = ['court', 'type', 'stage'];
        const hasValidationErrors = validationErrors.some(key => errorMap[key]);

        if (hasValidationErrors) {
            SmartToast.error('يرجى تصحيح الحقول المؤشرة باللون الأصفر.');
            if (errorMap['court']) scrollToElement(courtRef);
            else if (errorMap['type']) scrollToElement(typeRef);
            else if (errorMap['stage']) scrollToElement(stageRef);
            return;
        }

        if (!caseDetails.court) {
            errors['court'] = 'ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة';
            if (!firstErrorRef) firstErrorRef = courtRef;
        }
        if (!caseDetails.type) {
            errors['type'] = 'ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة';
            if (!firstErrorRef) firstErrorRef = typeRef;
        }
        if (!caseDetails.stage) {
            errors['stage'] = 'ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة';
            if (!firstErrorRef) firstErrorRef = stageRef;
        }

        if (caseNumberError) {
            errors['number'] = caseNumberError;
            if (!firstErrorRef) firstErrorRef = numberRef;
        }

        parties1.forEach(p => {
            if (!p.name) errors[`party_${p.id}`] = 'ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة';
        });
        parties2.forEach(p => {
            if (!p.name) errors[`party_${p.id}`] = 'ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة';
        });

        if (Object.keys(errors).length > 0) {
            setErrorMap(errors);
            if (firstErrorRef) scrollToElement(firstErrorRef);
            SmartToast.error('يرجى تصحيح الحقول المؤشرة باللون الأصفر.');
            return;
        }

        setIsAnalyzing(true);
        setTimeout(() => {
            setIsAnalyzing(false);
            onSave({
                title: (mainCategory || 'lawsuit') as string,
                type: (selectedType || 'civil') as 'civil' | 'sharia',
                parties: [...parties1, ...parties2, ...thirdParties.map((t: ThirdParty) => ({ id: t.id, name: t.name, role: t.entryType || '', isClient: false, phone: '', address: '' }))] as import('@/app/types/common').Party[],
                court: caseDetails.court || undefined,
                caseNumber: caseDetails.number || undefined,
                filingDate: undefined,
                description: undefined,
                lawyerName: undefined,
                lawyerPhone: undefined,
                subType: caseDetails.type || undefined
            });
        }, 1200);
    };

    const getLabels = () => {
        switch (mainCategory) {
            case 'execution':
                return { p1Main: 'الطرف الأول', p2Main: 'الطرف الثاني', courtPlaceholder: 'مديرية التنفيذ...', typePlaceholder: 'السند التنفيذي...' };
            case 'transaction':
                return { p1Main: 'الطرف الأول', p2Main: 'الطرف الثاني', courtPlaceholder: 'دائرة كاتب العدل...', typePlaceholder: 'نوع المعاملة...' };
            default:
                return { p1Main: 'الطرف الأول', p2Main: 'الطرف الثاني', courtPlaceholder: 'اسم المحكمة المختصة...', typePlaceholder: 'أدخل نوع الدعوى...' };
        }
    };
    const labels = getLabels();

    const getDefaultStatus = (side: 1 | 2) => '';

    const toggleAgent = (side: 1 | 2, id: string) => {
        const updater = (prev: Party[]) => prev.map(p =>
            p.id === id ? { ...p, hasLawyer: !p.hasLawyer } : p
        );
        side === 1 ? setParties1(updater) : setParties2(updater);
    };

    useEffect(() => {
        setParties1(prev => prev.map(p => ({ ...p, status: getDefaultStatus(1) })));
        setParties2(prev => prev.map(p => ({ ...p, status: getDefaultStatus(2) })));
    }, [mainCategory]);

    const addParty = (side: 1 | 2) => {
        const newParty: Party = {
            id: `${side === 1 ? 'p1' : 'p2'}_${Date.now()}`,
            name: '', status: getDefaultStatus(side), isClient: false, phone: '', address: '',
            hasLawyer: false, lawyerName: '', lawyerPhone: '', isMyOffice: false
        };
        side === 1 ? setParties1([...parties1, newParty]) : setParties2([...parties2, newParty]);
    };

    const removeParty = (side: 1 | 2, id: string) => {
        if (side === 1 && parties1.length > 1) setParties1(parties1.filter(p => p.id !== id));
        if (side === 2 && parties2.length > 1) setParties2(parties2.filter(p => p.id !== id));
    };

    const updateParty = (side: 1 | 2, id: string, field: keyof Party, value: string | boolean) => {
        if (field === 'isMyOffice' && value === true) {
            const otherSideParties = side === 1 ? parties2 : parties1;
            const hasConflict = otherSideParties.some(p => p.isMyOffice === true);

            if (hasConflict) {
                SmartToast.error("⚠️ تعارض مصالح: لا يمكن تمثيل الطرفين في نفس الدعوى!");
                return;
            }
        }

        const updater = (prev: Party[]) => prev.map(p => {
            if (p.id === id) {
                if (field === 'isMyOffice' && value === true) {
                    return { ...p, [field]: value, lawyerName: 'مكتبي (الوكيل الأصيل)', isClient: true };
                }
                if (field === 'isMyOffice' && value === false) {
                    return { ...p, [field]: value, lawyerName: '', isClient: false };
                }
                return { ...p, [field]: value };
            }
            return p;
        });
        side === 1 ? setParties1(updater) : setParties2(updater);
    };

    const handleAddThirdParty = (party: ThirdParty) => setThirdParties([...thirdParties, party]);

    const getAddPartyButtonText = (side: 1 | 2) => {
        const parties = side === 1 ? parties1 : parties2;
        if (parties.length === 0) return 'إضافة طرف آخر';

        const firstPartyStatus = parties[0].status.trim();

        if (side === 1) {
            if (firstPartyStatus === 'مدعي') return 'إضافة مدعي آخر';
            if (firstPartyStatus === 'مستأنف') return 'إضافة مستأنف آخر';
        } else {
            if (firstPartyStatus === 'مدعى عليه') return 'إضافة مدعى عليه آخر';
            if (firstPartyStatus === 'مستأنف عليه') return 'إضافة مستأنف عليه آخر';
        }

        return 'إضافة طرف آخر';
    };

    const triggerDemoMode = () => {
        const demoData = {
            mainCategory: 'lawsuit',
            type: 'civil',
            parties1: [{ id: 'demo_p1', name: 'شركة النهرين للمقاولات العامة', status: 'مدعي', isClient: true, phone: '07701234567', address: 'بغداد، المنصور' }],
            parties2: [{ id: 'demo_p2', name: 'وزارة الإعمار والإسكان', status: 'مدعى عليه', isClient: false, phone: '07901234567', address: 'بغداد، العلاوي' }],
            details: {
                number: '234/ب/2024',
                court: 'محكمة بداءة الكرادة',
                type: 'مطالبة بمستحقات مالية',
                judge: 'أحمد خليل',
                stage: 'بداءة بدرجة أولى',
                claimValue: '150,000,000',
                totalAgreedFees: '5,000,000'
            }
        };
        setIsAnalyzing(true);
        setTimeout(() => {
            setIsAnalyzing(false);
            setParties1(demoData.parties1 as Party[]);
            setParties2(demoData.parties2 as Party[]);
            setCaseDetails(demoData.details);
            onSave({
                title: 'lawsuit',
                type: 'civil' as 'civil' | 'sharia',
                parties: [...demoData.parties1, ...demoData.parties2] as import('@/app/types/common').Party[],
                court: demoData.details.court || undefined,
                caseNumber: demoData.details.number || undefined
            });
        }, 800);
    };

    return (
        <div ref={topFormRef} className="fixed inset-0 z-[100] bg-[#0F172A] font-['Tajawal'] flex flex-col overflow-hidden">

            <ThirdPartyModal
                isOpen={isThirdPartyModalOpen}
                onClose={() => setIsThirdPartyModalOpen(false)}
                onSave={handleAddThirdParty}
                currentStage={caseDetails.stage}
            />

            <CaseHeader
                step={step}
                isExpertMode={isExpertMode}
                onToggleExpert={() => setIsExpertMode(!isExpertMode)}
                onTriggerDemo={triggerDemoMode}
                onClose={onClose}
            />

            <div className="flex-1 overflow-y-auto scrollbar-hide bg-[#0F172A]">
                <AnimatePresence mode='wait'>
                    {step === 'gateway' && (
                        <motion.div key="gateway" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 pt-10 flex flex-col items-center justify-center h-full">
                            <div className="w-full max-w-lg grid gap-4">
                                {MAIN_GATEWAY.map((item) => (
                                    <GatewayCard
                                        key={item.id}
                                        item={item}
                                        onClick={() => { setMainCategory(item.id as MainCategory); item.id === 'lawsuit' ? setStep('selection') : setStep('form'); }}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                    {step === 'selection' && (
                        <motion.div key="selection" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 grid grid-cols-2 gap-3 pt-10">
                            {JURISDICTIONS.map((jur) => (
                                <JurisdictionCard
                                    key={jur.id}
                                    item={jur}
                                    onClick={() => { setSelectedType(jur.id as CaseType); setStep('form'); }}
                                />
                            ))}
                        </motion.div>
                    )}

                    {step === 'form' && (
                        <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="overflow-visible">

                            {selectedType === 'civil' && (
                                <CivilTabs
                                    civilSubView={civilSubView}
                                    onSelectMainForm={() => setCivilSubView('main-form')}
                                />
                            )}

                            {(selectedType !== 'civil' || civilSubView === 'main-form') && (
                            <>
                            <CaseBasicsForm
                                caseDetails={caseDetails}
                                setCaseDetails={setCaseDetails}
                                errorMap={errorMap}
                                caseNumberError={caseNumberError}
                                labels={labels}
                                stageOptions={stageOptions}
                                isUndeterminedValue={isUndeterminedValue}
                                setIsUndeterminedValue={setIsUndeterminedValue}
                                isFixedFee={isFixedFee}
                                setIsFixedFee={setIsFixedFee}
                                valuePlaceholder={valuePlaceholder}
                                exceptionWarning={exceptionWarning}
                                courtRef={courtRef as React.RefObject<HTMLInputElement | null>}
                                typeRef={typeRef as React.RefObject<HTMLInputElement | null>}
                                stageRef={stageRef as React.RefObject<HTMLSelectElement | null>}
                                numberRef={numberRef as React.RefObject<HTMLInputElement | null>}
                            />

                            <PartiesSection
                                side={1}
                                parties={parties1}
                                onUpdate={updateParty}
                                onRemove={removeParty}
                                onAdd={addParty}
                                onToggleAgent={toggleAgent}
                                labels={labels}
                                currentStage={caseDetails.stage}
                                errorMap={errorMap}
                                addButtonText={getAddPartyButtonText(1)}
                            />

                            <PartiesSection
                                side={2}
                                parties={parties2}
                                onUpdate={updateParty}
                                onRemove={removeParty}
                                onAdd={addParty}
                                onToggleAgent={toggleAgent}
                                labels={labels}
                                currentStage={caseDetails.stage}
                                errorMap={errorMap}
                                addButtonText={getAddPartyButtonText(2)}
                            />

                            <FinancialSection
                                totalAgreedFees={caseDetails.totalAgreedFees}
                                onFeesChange={(val) => setCaseDetails(prev => ({ ...prev, totalAgreedFees: val }))}
                            />
                                </>
                            )}

                            {selectedType === 'civil' && civilSubView === 'urgent-dashboard' && (
                                <div className="min-h-screen bg-[#0B1021]">
                                    <React.Suspense
                                        fallback={
                                            <div className="min-h-screen flex items-center justify-center text-[#E6C673] text-sm font-bold animate-pulse">
                                                جاري تحميل لوحة الطلبات المستعجلة...
                                            </div>
                                        }
                                    >
                                        <LazyViewUrgentDashboard
                                            onBack={() => setCivilSubView('main-form')}
                                            onCreateNew={() => setCivilSubView('urgent-form')}
                                            onViewDetails={(id: string) => {
                                                debug.log('📋 Viewing urgent action:', id);
                                            }}
                                        />
                                    </React.Suspense>
                                </div>
                            )}

                            {selectedType === 'civil' && civilSubView === 'urgent-form' && (
                                <div className="min-h-screen bg-[#0B1021]">
                                    <Form_Urgent_Actions
                                        onClose={() => setCivilSubView('urgent-dashboard')}
                                        onSave={(data: Record<string, unknown>) => {
                                            debug.log('✅ Urgent action saved:', data);
                                            setActiveFileData(fileDataFromUrgentForm(data));
                                            setActiveFileType('order');
                                        }}
                                    />
                                </div>
                            )}

                        </motion.div>
                    )}
                </AnimatePresence>

                {activeFileType === 'order' && activeFileData && (
                    <DeferredActiveOrderFile
                        fileData={activeFileData}
                        onClose={() => {
                            setActiveFileType(null);
                            setActiveFileData(null);
                            setCivilSubView('urgent-dashboard');
                        }}
                    />
                )}
            </div>

            {step === 'form' && (selectedType !== 'civil' || civilSubView === 'main-form') && (
                <SaveButton
                    isAnalyzing={isAnalyzing}
                    hasCriminalError={Boolean(errorMap['criminal_error'])}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};
