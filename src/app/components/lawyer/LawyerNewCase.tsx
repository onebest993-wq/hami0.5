import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    CheckCircle2, X, Plus,
    Coins, FlaskConical, Zap, Scale
} from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { getLegalRole } from './LawyerShared';
import { Form_Urgent_Actions } from './Form_Urgent_Actions';
const LazyCriminalNewCase = React.lazy(() =>
    import('./criminal-system/CriminalNewCase').then((m) => ({ default: m.CriminalNewCase })),
);
const LazyViewUrgentDashboard = React.lazy(() =>
    import('./View_Urgent_And_Orders_Dashboard').then((m) => ({
        default: m.View_Urgent_And_Orders_Dashboard,
    })),
);
import { DeferredActiveOrderFile } from './DeferredActiveOrderFile';
import { fileDataFromUrgentForm } from '@/app/domain/urgent';
import { MAIN_GATEWAY, JURISDICTIONS } from './LawyerNewCase/constants';
import type { MainCategory, CaseType, CivilSubView, Party, ThirdParty } from './LawyerNewCase/types';
import type { LawyerNewCaseProps } from '@/app/types/components';
import { useCriminalStore } from '@/app/components/lawyer/criminal-system/criminalStore';
import { GatewayCard } from './LawyerNewCase/components/GatewayCard';
import { JurisdictionGlassPanel } from './LawyerNewCase/components/JurisdictionGlassPanel';
import { ThirdPartyModal } from './LawyerNewCase/components/ThirdPartyModal';
import { CaseHeader } from './LawyerNewCase/components/CaseHeader';
import { CaseBasicsForm } from './LawyerNewCase/components/CaseBasicsForm';
import { PersonalStatusNewCaseForm } from './personal-status/PersonalStatusNewCaseForm';
import {
    validatePersonalStatusForm,
    getPersonalStatusRoleForSide,
    getPersonalStatusLabels,
    type PersonalApplicableLaw,
} from './personal-status/personalStatusValidation';
import {
    PERSONAL_STATUS_FORM_GRADIENT,
    PERSONAL_STATUS_FORM_GRADIENT_2,
    PERSONAL_STATUS_FORM_SHELL,
} from './personal-status/personalStatusVisualTheme';
import { SaveButton } from './LawyerNewCase/components/SaveButton';
import { PartiesSection } from './LawyerNewCase/components/PartiesSection';
import { ThirdPartiesSection } from './LawyerNewCase/components/ThirdPartiesSection';
import {
    hasLawyerClientMark,
} from './LawyerNewCase/clientRepresentation';
import {
    computeStageOptions,
    getBlockedWordsError,
    getStageCourtMismatchErrors,
    getRetrialTargetCourtMismatchErrors,
    getUnderlyingStageOptions,
    isAbsentJudgmentObjectionStage,
    isExtraordinaryProcedureStage,
    isEvictionOrSharing,
    getValuePlaceholder,
    getExceptionWarning,
    getCaseNumberError,
    isFixedFeeType,
    validateForm,
    getLabels,
} from './LawyerNewCase/validation';

export const LawyerNewCase: React.FC<LawyerNewCaseProps> = ({
    onClose,
    onSave,
    onOpenCriminalDashboard,
    presetSelectedType,
    criminalSeveranceFormMode = false,
    consolidationNavActive = false,
}) => {
    const debug = (window as unknown as Record<string, { log: (...args: unknown[]) => void }>).debug || { log: (...args: unknown[]) => console.log(...args) };
    // عند وجود `presetSelectedType` (مثلاً عند مسار تفريق الدعوى): تجاوز خطوة الاختيار
    // وافتح النموذج مباشرة على النوع المطلوب — لا يُغيِّر سلوك الفتح العادي.
    const [step, setStep] = useState<'gateway' | 'selection' | 'form'>(
        presetSelectedType ? 'form' : 'selection',
    );
    const [mainCategory, setMainCategory] = useState<MainCategory | null>('lawsuit');
    const [selectedType, setSelectedType] = useState<CaseType>(
        (presetSelectedType as CaseType) ?? null,
    );
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [civilSubView, setCivilSubView] = useState<CivilSubView>('main-form');

    const [activeFileType, setActiveFileType] = useState<'order' | 'discovery' | 'acknowledgment' | null>(null);
    const [activeFileData, setActiveFileData] = useState<Record<string, unknown> | null>(null);

    const [parties1, setParties1] = useState<Party[]>([{ id: 'p1_1', name: '', status: '', isClient: false, phone: '', address: '' }]);
    const [parties2, setParties2] = useState<Party[]>([{ id: 'p2_1', name: '', status: '', isClient: false, phone: '', address: '' }]);

    const [isThirdPartyModalOpen, setIsThirdPartyModalOpen] = useState(false);
    const [thirdParties, setThirdParties] = useState<ThirdParty[]>([]);

    const [isUndeterminedValue, setIsUndeterminedValue] = useState(false);
    const [isFixedFee, setIsFixedFee] = useState(false);
    const [applicableLaw, setApplicableLaw] = useState<PersonalApplicableLaw | ''>('');
    const [errorMap, setErrorMap] = useState<Record<string, string>>({});

    const [caseDetails, setCaseDetails] = useState({
        number: '',
        court: '',
        type: '',
        judge: '',
        stage: '',
        claimValue: '',
        totalAgreedFees: '',
        retrialTargetStage: '',
    });

    const topFormRef = useRef<HTMLDivElement>(null);
    const courtRef = useRef<HTMLInputElement>(null);
    const typeRef = useRef<HTMLInputElement>(null);
    const stageRef = useRef<HTMLSelectElement>(null);
    const numberRef = useRef<HTMLInputElement>(null);
    const retrialTargetRef = useRef<HTMLSelectElement>(null);


    const stageOptions = useMemo(
        () => computeStageOptions(caseDetails.court),
        [caseDetails.court],
    );
    const valuePlaceholder = useMemo(
        () => getValuePlaceholder(caseDetails.type || ''),
        [caseDetails.type],
    );
    const exceptionWarning = useMemo(
        () => getExceptionWarning(caseDetails.claimValue, caseDetails.type || ''),
        [caseDetails.claimValue, caseDetails.type],
    );
    const caseNumberError = useMemo(
        () => getCaseNumberError(caseDetails.number),
        [caseDetails.number],
    );
    const labels = useMemo(
        () =>
            selectedType === 'personal'
                ? getPersonalStatusLabels(caseDetails.stage)
                : getLabels(mainCategory),
        [mainCategory, selectedType, caseDetails.stage],
    );
    const isPersonalCase = selectedType === 'personal';

    useEffect(() => {
        setIsFixedFee(isFixedFeeType(caseDetails.type || ''));
    }, [caseDetails.type]);

    useEffect(() => {
        if (isPersonalCase) return;
        if (!isExtraordinaryProcedureStage(caseDetails.stage)) return;
        setIsUndeterminedValue(false);
        setIsFixedFee(false);
        setCaseDetails((prev) => {
            let next = prev.claimValue ? { ...prev, claimValue: '' } : prev;
            if (
                isAbsentJudgmentObjectionStage(prev.stage) &&
                prev.retrialTargetStage?.includes('استئناف')
            ) {
                next = { ...next, retrialTargetStage: '' };
            }
            return next;
        });
    }, [caseDetails.stage, isPersonalCase]);

    useEffect(() => {
        if (isPersonalCase) return;
        if (isExtraordinaryProcedureStage(caseDetails.stage)) return;
        setCaseDetails((prev) => (prev.retrialTargetStage ? { ...prev, retrialTargetStage: '' } : prev));
    }, [caseDetails.stage, isPersonalCase]);

    useEffect(() => {
        if (isPersonalCase) {
            const validationErrors: Record<string, string> = {};
            Object.assign(validationErrors, getBlockedWordsError(caseDetails.court, caseDetails.type, selectedType));
            if (caseDetails.stage.includes('استئناف') || caseDetails.stage.includes('بداءة')) {
                validationErrors.stage =
                    'مرحلة غير متاحة في الأحوال الشخصية — اختر أحوال شخصية أو تمييز أو طعن استثنائي.';
            }
            setErrorMap((prev) => {
                const newMap: Record<string, string> = {};
                Object.keys(prev).forEach((key) => {
                    if (!['court', 'type', 'stage', 'retrialTargetStage', 'applicableLaw', 'number'].includes(key)) {
                        newMap[key] = prev[key];
                    }
                });
                Object.assign(newMap, validationErrors);
                return newMap;
            });
            return;
        }

        const validationErrors: Record<string, string> = {};
        const { court, type, stage, claimValue: value, retrialTargetStage } = caseDetails;

        Object.assign(validationErrors, getStageCourtMismatchErrors(court, stage));
        if (isExtraordinaryProcedureStage(stage) && retrialTargetStage) {
            Object.assign(validationErrors, getRetrialTargetCourtMismatchErrors(court, retrialTargetStage));
        }
        Object.assign(validationErrors, getBlockedWordsError(court, type, selectedType));

        if (isExtraordinaryProcedureStage(stage)) {
            setErrorMap((prev) => {
                const newMap: Record<string, string> = {};
                Object.keys(prev).forEach((key) => {
                    if (!['court', 'type', 'stage', 'retrialTargetStage'].includes(key)) {
                        newMap[key] = prev[key];
                    }
                });
                Object.keys(validationErrors).forEach((key) => {
                    newMap[key] = validationErrors[key];
                });
                return newMap;
            });
            return;
        }

        const cleanValue = parseInt(value.replace(/[^0-9]/g, '')) || 0;
        const typeLower = type.toLowerCase();
        const evictionOrSharing = isEvictionOrSharing(typeLower);

        if (evictionOrSharing && stage && !stage.includes('استئناف')) {
            if (stage !== 'بداءة بدرجة أخيرة') {
                setCaseDetails(prev => ({ ...prev, stage: 'بداءة بدرجة أخيرة' }));
            }
        }
        else if ((isFixedFee || isUndeterminedValue) && !evictionOrSharing) {
            if (value !== '' || (stage !== 'بداءة بدرجة أخيرة' && !stage.includes('استئناف'))) {
                setCaseDetails(prev => ({ ...prev, claimValue: '', stage: prev.stage.includes('استئناف') ? prev.stage : 'بداءة بدرجة أخيرة' }));
            }
        }
        else if (cleanValue > 0 && !evictionOrSharing && !isFixedFee && !isUndeterminedValue && stage.includes('بداءة')) {
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

    }, [caseDetails.court, caseDetails.type, caseDetails.stage, caseDetails.claimValue, caseDetails.retrialTargetStage, selectedType, isFixedFee, isUndeterminedValue, isPersonalCase, applicableLaw]);

    useEffect(() => {
        const stage = caseDetails.stage;
        if (isPersonalCase) {
            if (!stage) return;
            setParties1((prev) => {
                const role = getPersonalStatusRoleForSide(stage, 1, prev.length);
                if (prev.length > 0 && prev[0].status === role) return prev;
                return prev.map((p) => ({ ...p, status: role }));
            });
            setParties2((prev) => {
                const role = getPersonalStatusRoleForSide(stage, 2, prev.length);
                if (prev.length > 0 && prev[0].status === role) return prev;
                return prev.map((p) => ({ ...p, status: role }));
            });
            return;
        }

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
    }, [caseDetails.stage, parties1.length, parties2.length, isPersonalCase]);


    const scrollToElement = (ref: React.RefObject<HTMLInputElement | HTMLSelectElement>) => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        ref.current?.focus();
    };

    const handleSave = () => {
        if (isPersonalCase) {
            const personalFieldKeys = ['court', 'type', 'stage', 'retrialTargetStage', 'applicableLaw'];
            const hasValidationErrors = personalFieldKeys.some((key) => errorMap[key]);
            if (hasValidationErrors) {
                SmartToast.error('يرجى تصحيح الحقول المؤشرة باللون الأصفر.');
                if (errorMap.court) scrollToElement(courtRef);
                else if (errorMap.type) scrollToElement(typeRef);
                else if (errorMap.stage) scrollToElement(stageRef);
                else if (errorMap.retrialTargetStage) scrollToElement(retrialTargetRef);
                return;
            }

            const personalErrors = validatePersonalStatusForm({
                court: caseDetails.court,
                type: caseDetails.type,
                stage: caseDetails.stage,
                applicableLaw,
                retrialTargetStage: caseDetails.retrialTargetStage,
            });
            const errors: Record<string, string> = { ...personalErrors };
            if (caseNumberError) errors.number = caseNumberError;
            if (!hasLawyerClientMark(parties1, parties2, thirdParties)) {
                errors.lawyer_client = 'يرجى تحديد الموكل — يجب اختيار طرف واحد على الأقل';
            }
            if (Object.keys(errors).length > 0) {
                setErrorMap((prev) => ({ ...prev, ...errors }));
                SmartToast.error('يرجى تصحيح الحقول المؤشرة باللون الأصفر.');
                return;
            }

            setIsAnalyzing(true);
            onSave({
                mainCategory: mainCategory || 'lawsuit',
                selectedType: 'personal',
                parties1,
                parties2,
                thirdParties,
                applicableLaw,
                details: { ...caseDetails, applicableLaw },
            });
            setIsAnalyzing(false);
            return;
        }

        const validationErrors = ['court', 'type', 'stage', 'retrialTargetStage'];
        const hasValidationErrors = validationErrors.some(key => errorMap[key]);

        if (hasValidationErrors) {
            SmartToast.error('يرجى تصحيح الحقول المؤشرة باللون الأصفر.');
            if (errorMap['court']) scrollToElement(courtRef);
            else if (errorMap['type']) scrollToElement(typeRef);
            else if (errorMap['stage']) scrollToElement(stageRef);
            else if (errorMap['retrialTargetStage']) scrollToElement(retrialTargetRef);
            return;
        }

        const { errors, firstErrorField } = validateForm(
            caseDetails,
            errorMap,
            caseNumberError,
            parties1,
            parties2,
        );
        const refByField: Record<string, React.RefObject<HTMLInputElement | HTMLSelectElement>> = {
            court: courtRef,
            type: typeRef,
            stage: stageRef,
            number: numberRef,
            retrialTargetStage: retrialTargetRef,
        };
        let firstErrorRef = firstErrorField ? refByField[firstErrorField] ?? null : null;

        if (!hasLawyerClientMark(parties1, parties2, thirdParties)) {
            errors['lawyer_client'] = 'يرجى تحديد الموكل — يجب اختيار طرف واحد على الأقل';
        }

        if (Object.keys(errors).length > 0) {
            setErrorMap(errors);
            if (firstErrorRef) scrollToElement(firstErrorRef);
            SmartToast.error('يرجى تصحيح الحقول المؤشرة باللون الأصفر.');
            return;
        }

        setIsAnalyzing(true);
        onSave({
            mainCategory: mainCategory || 'lawsuit',
            selectedType: selectedType || 'civil',
            parties1,
            parties2,
            thirdParties,
            isUndeterminedValue,
            isFixedFee,
            details: { ...caseDetails },
        });
        setIsAnalyzing(false);
    };

    const getDefaultStatus = (side: 1 | 2) => '';

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

    const clearLawyerClientError = () => {
        setErrorMap((prev) => {
            if (!prev.lawyer_client) return prev;
            const next = { ...prev };
            delete next.lawyer_client;
            return next;
        });
    };

    const clearClientFromParty = (p: Party): Party => ({
        ...p,
        isClient: false,
        isMyOffice: false,
        lawyerName: p.isMyOffice ? '' : (p.lawyerName ?? ''),
    });

    const markPartyAsClient = (p: Party): Party => ({
        ...p,
        isClient: true,
        isMyOffice: true,
        lawyerName: 'مكتبي (الوكيل الأصيل)',
    });

    const clearClientFromThirdParty = (tp: ThirdParty): ThirdParty => ({
        ...tp,
        isClient: false,
        isMyOffice: false,
        lawyerName: tp.isMyOffice ? '' : tp.lawyerName,
    });

    const markThirdPartyAsClient = (tp: ThirdParty): ThirdParty => ({
        ...tp,
        isClient: true,
        isMyOffice: true,
        lawyerName: 'مكتبي (الوكيل الأصيل)',
    });

    const clearClientsOnSide = (side: 1 | 2) => {
        const wipeParty = (p: Party): Party => ({
            ...p,
            isClient: false,
            isMyOffice: false,
            lawyerName: p.isMyOffice ? '' : (p.lawyerName ?? ''),
        });
        if (side === 1) setParties1((prev) => prev.map(wipeParty));
        else setParties2((prev) => prev.map(wipeParty));
        setThirdParties((prev) =>
            prev.map((tp) => {
                if (tp.isClient && tp.entryMode === 'affiliative' && tp.affiliatedSide === side) {
                    return { ...tp, isClient: false, isMyOffice: false, lawyerName: '' };
                }
                return tp;
            }),
        );
    };

    const otherSideHasClient = (side: 1 | 2) => {
        const other = side === 1 ? 2 : 1;
        const otherParties = other === 1 ? parties1 : parties2;
        return (
            otherParties.some((p) => p.isClient || p.isMyOffice) ||
            thirdParties.some((tp) => tp.isClient && (tp.affiliatedSide === other || tp.entryMode === 'interpleader'))
        );
    };

    const updateParty = (side: 1 | 2, id: string, field: keyof Party, value: string | boolean) => {
        if (field === 'isClient' && value === true) {
            clearLawyerClientError();
            setParties1((prev) =>
                prev.map((p) =>
                    side === 1 && p.id === id ? markPartyAsClient(p) : clearClientFromParty(p),
                ),
            );
            setParties2((prev) =>
                prev.map((p) =>
                    side === 2 && p.id === id ? markPartyAsClient(p) : clearClientFromParty(p),
                ),
            );
            setThirdParties((prev) => prev.map(clearClientFromThirdParty));
            return;
        }

        if (field === 'isClient' && value === false) {
            const updater = (prev: Party[]) =>
                prev.map((p) => (p.id === id ? clearClientFromParty(p) : p));
            side === 1 ? setParties1(updater) : setParties2(updater);
            return;
        }

        if (field === 'isMyOffice' && value === true) {
            if (otherSideHasClient(side)) {
                SmartToast.error('⚠️ تعارض مصالح: لا يمكن تمثيل الطرفين في نفس الدعوى!');
                return;
            }
            clearClientsOnSide(side === 1 ? 2 : 1);
        }

        const updater = (prev: Party[]) =>
            prev.map((p) => {
                if (p.id !== id) return p;
                if (field === 'isMyOffice' && value === true) {
                    return { ...p, isMyOffice: true, isClient: true, lawyerName: 'مكتبي (الوكيل الأصيل)' };
                }
                if (field === 'isMyOffice' && value === false) {
                    return { ...p, isMyOffice: false, lawyerName: '' };
                }
                return { ...p, [field]: value };
            });
        side === 1 ? setParties1(updater) : setParties2(updater);
    };

    const handleAddThirdParty = (party: ThirdParty) => setThirdParties([...thirdParties, party]);

    const removeThirdParty = (id: number) => setThirdParties(thirdParties.filter((tp) => tp.id !== id));

    const updateThirdParty = (id: number, field: keyof ThirdParty, value: string | boolean | number) => {
        const target = thirdParties.find((tp) => tp.id === id);
        if (!target) return;

        if (field === 'isClient' && value === true) {
            clearLawyerClientError();
            setParties1((prev) => prev.map(clearClientFromParty));
            setParties2((prev) => prev.map(clearClientFromParty));
            setThirdParties((prev) =>
                prev.map((tp) => (tp.id === id ? markThirdPartyAsClient(tp) : clearClientFromThirdParty(tp))),
            );
            return;
        }

        if (field === 'isClient' && value === false) {
            setThirdParties((prev) =>
                prev.map((tp) => (tp.id === id ? clearClientFromThirdParty(tp) : tp)),
            );
            return;
        }

        if (field === 'isMyOffice' && value === true) {
            const side = target.affiliatedSide;
            if (side && otherSideHasClient(side)) {
                SmartToast.error('⚠️ تعارض مصالح: لا يمكن تمثيل الطرفين في نفس الدعوى!');
                return;
            }
            if (side) clearClientsOnSide(side === 1 ? 2 : 1);
        }

        setThirdParties((prev) =>
            prev.map((tp) => {
                if (tp.id !== id) return tp;
                if (field === 'isMyOffice' && value === true) {
                    return { ...tp, isMyOffice: true, isClient: true, lawyerName: 'مكتبي (الوكيل الأصيل)' };
                }
                if (field === 'isMyOffice' && value === false) {
                    return { ...tp, isMyOffice: false, lawyerName: '' };
                }
                return { ...tp, [field]: value };
            }),
        );
    };

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

    return (
        <div
            ref={topFormRef}
            className={`${
                isPersonalCase && step === 'form'
                    ? PERSONAL_STATUS_FORM_SHELL
                    : 'fixed inset-0 z-[100] flex flex-col overflow-hidden bg-[#080c14] font-[\'Tajawal\']'
            } ${consolidationNavActive ? 'pt-12' : ''}`}
        >
            {!isPersonalCase ? (
                <>
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(230,198,115,0.07),transparent_52%)]" aria-hidden />
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_100%_100%,rgba(90,120,180,0.06),transparent_48%)]" aria-hidden />
                </>
            ) : (
                <>
                    <div className={PERSONAL_STATUS_FORM_GRADIENT} aria-hidden />
                    <div className={PERSONAL_STATUS_FORM_GRADIENT_2} aria-hidden />
                </>
            )}

            <ThirdPartyModal
                isOpen={isThirdPartyModalOpen}
                onClose={() => setIsThirdPartyModalOpen(false)}
                onSave={handleAddThirdParty}
                currentStage={caseDetails.stage}
            />

            {!(step === 'form' && selectedType === 'criminal') && (
                <CaseHeader
                    step={step}
                    onClose={onClose}
                />
            )}

            <div className="relative flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch] scrollbar-hide">
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
                        <motion.div
                            key="selection"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="px-5 pt-4 pb-14 max-w-md mx-auto w-full"
                        >
                            <h2 className="mb-7 text-right text-lg font-bold text-white/88">اختصاص الدعوى</h2>
                            <JurisdictionGlassPanel
                                items={JURISDICTIONS}
                                onSelect={(id) => {
                                    if (id === 'criminal' && !criminalSeveranceFormMode) {
                                        useCriminalStore.getState().prepareNormalCriminalCaseForm();
                                    }
                                    setSelectedType(id as CaseType);
                                    setStep('form');
                                }}
                            />
                        </motion.div>
                    )}

                    {step === 'form' && (
                        <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="overflow-visible pb-6">

                            {/* القضاء الجزائي: النموذج الفعلي في criminal-system/CriminalNewCase (نفس DOM z-[100]) */}
                            {selectedType === 'criminal' && (
                                <React.Suspense
                                    fallback={
                                        <div className="py-12 text-center text-[#E6C673] text-sm font-bold animate-pulse">
                                            جاري تحميل نموذج الإضبارة الجزائية...
                                        </div>
                                    }
                                >
                                    <LazyCriminalNewCase
                                        severanceFormMode={criminalSeveranceFormMode}
                                        onBack={() => {
                                            setStep('selection');
                                            setSelectedType(null);
                                        }}
                                        onClose={onClose}
                                        onCreated={(caseId) => {
                                            onClose();
                                            onOpenCriminalDashboard?.(caseId);
                                        }}
                                    />
                                </React.Suspense>
                            )}

                            {selectedType !== 'criminal' && (selectedType !== 'civil' || civilSubView === 'main-form') && (
                            <>
                            {isPersonalCase ? (
                                <PersonalStatusNewCaseForm
                                    caseDetails={caseDetails}
                                    applicableLaw={applicableLaw}
                                    setApplicableLaw={setApplicableLaw}
                                    setCaseDetails={setCaseDetails}
                                    parties1={parties1}
                                    parties2={parties2}
                                    thirdParties={thirdParties}
                                    onUpdateParty={updateParty}
                                    onRemoveParty={removeParty}
                                    onAddParty={addParty}
                                    onAddThirdParty={() => setIsThirdPartyModalOpen(true)}
                                    onRemoveThirdParty={removeThirdParty}
                                    onUpdateThirdParty={updateThirdParty}
                                    errorMap={errorMap}
                                    caseNumberError={caseNumberError}
                                    courtRef={courtRef as React.RefObject<HTMLInputElement | null>}
                                    typeRef={typeRef as React.RefObject<HTMLInputElement | null>}
                                    stageRef={stageRef as React.RefObject<HTMLSelectElement | null>}
                                    numberRef={numberRef as React.RefObject<HTMLInputElement | null>}
                                    retrialTargetRef={retrialTargetRef as React.RefObject<HTMLSelectElement | null>}
                                />
                            ) : (
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
                                retrialTargetRef={retrialTargetRef as React.RefObject<HTMLSelectElement | null>}
                            />

                            <PartiesSection
                                side={1}
                                parties={parties1}
                                onUpdate={updateParty}
                                onRemove={removeParty}
                                onAdd={addParty}
                                labels={labels}
                                errorMap={errorMap}
                                addButtonText={getAddPartyButtonText(1)}
                                clientError={errorMap['lawyer_client']}
                            />

                            <PartiesSection
                                side={2}
                                parties={parties2}
                                onUpdate={updateParty}
                                onRemove={removeParty}
                                onAdd={addParty}
                                labels={labels}
                                errorMap={errorMap}
                                addButtonText={getAddPartyButtonText(2)}
                                clientError={errorMap['lawyer_client']}
                            />

                            <ThirdPartiesSection
                                thirdParties={thirdParties}
                                onAdd={() => setIsThirdPartyModalOpen(true)}
                                onRemove={removeThirdParty}
                                onUpdate={updateThirdParty}
                                clientError={errorMap['lawyer_client']}
                            />
                            </>
                            )}
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

            {step === 'form' && selectedType !== 'criminal' && (selectedType !== 'civil' || civilSubView === 'main-form') && (
                <SaveButton
                    isAnalyzing={isAnalyzing}
                    hasCriminalError={Boolean(errorMap['criminal_error'])}
                    onSave={handleSave}
                    variant={isPersonalCase ? 'personal' : 'civil'}
                />
            )}
        </div>
    );
};
