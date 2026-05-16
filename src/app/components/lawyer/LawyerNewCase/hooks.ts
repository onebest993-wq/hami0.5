import { useState, useEffect, useRef } from 'react';
import type { MainCategory, CaseType, CivilSubView, Party, ThirdParty } from './types';
import {
    computeStageOptions, getBlockedWordsError, computeStageForValue,
    getExceptionWarning, getCaseNumberError, getValuePlaceholder,
    isFixedFeeType, isEvictionOrSharing, getRoleForStage
} from './validation';

export interface LawyerNewCaseState {
    step: 'gateway' | 'selection' | 'form';
    mainCategory: MainCategory | null;
    selectedType: CaseType;
    isAnalyzing: boolean;
    isExpertMode: boolean;
    civilSubView: CivilSubView;
    activeFileType: 'order' | 'discovery' | 'acknowledgment' | null;
    activeFileData: Record<string, unknown> | null;
    parties1: Party[];
    parties2: Party[];
    isThirdPartyModalOpen: boolean;
    thirdParties: ThirdParty[];
    stageOptions: string[];
    isUndeterminedValue: boolean;
    isFixedFee: boolean;
    errorMap: Record<string, string>;
    exceptionWarning: string | null;
    valuePlaceholder: string;
    caseNumberError: string | null;
    caseDetails: {
        number: string; court: string; type: string; judge: string;
        stage: string; claimValue: string; totalAgreedFees: string;
    };
    topFormRef: React.RefObject<HTMLDivElement | null>;
    courtRef: React.RefObject<HTMLInputElement | null>;
    typeRef: React.RefObject<HTMLInputElement | null>;
    stageRef: React.RefObject<HTMLSelectElement | null>;
    numberRef: React.RefObject<HTMLInputElement | null>;
}

export const useLawyerNewCase = () => {
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
        const c = caseDetails.court.toLowerCase();
        const type = caseDetails.type.toLowerCase();
        const stage = caseDetails.stage;
        const value = caseDetails.claimValue;

        const newStageOptions = computeStageOptions(c);
        setStageOptions(prev => prev.join() === newStageOptions.join() ? prev : newStageOptions);

        const blockedErrors = getBlockedWordsError(c, type);

        if (stage.includes('استئناف') && c.includes('بداءة')) {
            blockedErrors['stage'] = 'ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة';
        }
        if (stage.includes('بداءة') && c.includes('استئناف')) {
            blockedErrors['court'] = 'ملاحظة: يرجى التأكد من تطابق المعلومات المدخلة';
        }

        const cleanValue = parseInt(value.replace(/[^0-9]/g, '')) || 0;
        const evSh = isEvictionOrSharing(type);

        if (evSh && stage && !stage.includes('استئناف')) {
            if (stage !== 'بداءة بدرجة أخيرة') {
                setCaseDetails(prev => ({ ...prev, stage: 'بداءة بدرجة أخيرة' }));
            }
        } else if ((isFixedFee || isUndeterminedValue) && !evSh) {
            if (value !== '' || (stage !== 'بداءة بدرجة أخيرة' && !stage.includes('استئناف'))) {
                setCaseDetails(prev => ({ ...prev, claimValue: '', stage: prev.stage.includes('استئناف') ? prev.stage : 'بداءة بدرجة أخيرة' }));
            }
        } else if (cleanValue > 0 && !evSh && !isFixedFee && !isUndeterminedValue && stage.includes('بداءة')) {
            const newStage = computeStageForValue(cleanValue, stage);
            if (newStage !== stage) {
                setCaseDetails(prev => ({ ...prev, stage: newStage }));
            }
        }

        setErrorMap(prev => {
            const newMap: Record<string, string> = {};
            Object.keys(prev).forEach(key => {
                if (!['court', 'type', 'stage'].includes(key)) newMap[key] = prev[key];
            });
            Object.keys(blockedErrors).forEach(key => { newMap[key] = blockedErrors[key]; });
            return newMap;
        });
    }, [caseDetails.court, caseDetails.type, caseDetails.stage, caseDetails.claimValue, isFixedFee, isUndeterminedValue]);

    useEffect(() => {
        setValuePlaceholder(getValuePlaceholder(caseDetails.type || ''));
    }, [caseDetails.type]);

    useEffect(() => {
        setIsFixedFee(isFixedFeeType(caseDetails.type || ''));
    }, [caseDetails.type]);

    useEffect(() => {
        const stage = caseDetails.stage;
        if (!stage) {
            setParties1(prev => {
                const role = prev.length > 1 ? 'المدعين' : 'المدعي';
                return prev.map(p => ({ ...p, status: role }));
            });
            setParties2(prev => {
                const role = prev.length > 1 ? 'المدعى عليهم' : 'المدعى عليه';
                return prev.map(p => ({ ...p, status: role }));
            });
            return;
        }
        setParties1(prev => prev.map(p => ({ ...p, status: getRoleForStage(stage, 1, prev.length) })));
        setParties2(prev => prev.map(p => ({ ...p, status: getRoleForStage(stage, 2, prev.length) })));
    }, [caseDetails.stage]);

    useEffect(() => {
        setExceptionWarning(getExceptionWarning(caseDetails.claimValue, caseDetails.type || ''));
    }, [caseDetails.claimValue, caseDetails.type]);

    useEffect(() => {
        setCaseNumberError(getCaseNumberError(caseDetails.number));
    }, [caseDetails.number]);

    return {
        step, setStep,
        mainCategory, setMainCategory,
        selectedType, setSelectedType,
        isAnalyzing, setIsAnalyzing,
        isExpertMode, setIsExpertMode,
        civilSubView, setCivilSubView,
        activeFileType, setActiveFileType,
        activeFileData, setActiveFileData,
        parties1, setParties1,
        parties2, setParties2,
        isThirdPartyModalOpen, setIsThirdPartyModalOpen,
        thirdParties, setThirdParties,
        stageOptions, setStageOptions,
        isUndeterminedValue, setIsUndeterminedValue,
        isFixedFee, setIsFixedFee,
        errorMap, setErrorMap,
        exceptionWarning,
        valuePlaceholder,
        caseNumberError,
        caseDetails, setCaseDetails,
        topFormRef, courtRef, typeRef, stageRef, numberRef
    } as const;
};
