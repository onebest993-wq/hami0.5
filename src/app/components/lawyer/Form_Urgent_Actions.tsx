import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { motion } from 'motion/react';
import { 
    X, ArrowLeft, Eye, CheckCircle2, 
    Calendar, FileText,
    User, Building2, Phone, Save, UserPlus, Trash2
} from 'lucide-react';
import { HamiDateInput } from '@/app/components/ui/HamiDateInput';
import { pathways, actionTypeOptions, PathwayType, getProcedureDetailsGuidance, getUnifiedActionTypeOptions, isIqrarRequest, IQRAR_PARTY_LABELS, resolveStoredPathwayType, UNIFIED_URGENT_FORM_HEADER, JUDICIAL_ACKNOWLEDGMENT_PRIMARY } from './Form_Urgent_Actions/constants';

interface Props {
    onClose: () => void;
    onSave: (data: any) => void;
    initialActionType?: 'state_order' | 'urgent_discovery' | 'acknowledgment';
}

/**
 * 🚀 Form للإجراءات المستعجلة والأوامر الولائية
 * 
 * نموذج مخصص تماماً منفصل عن الدعاوى المدنية
 * يتضمن 3 مسارات:
 * 1. الأمر الولائي (Orders on Petitions)
 * 2. الكشف المستعجل (Urgent Discovery)
 * 3. الإقرار (Legal Acknowledgment)
 */

export const Form_Urgent_Actions: React.FC<Props> = ({ 
    onClose, 
    onSave, 
    initialActionType 
}) => {
    const isMountedRef = useRef(true);
    const rafIdsRef = useRef<number[]>([]);
    const closeRequestedRef = useRef(false);
    const isDev = process.env.NODE_ENV === 'development';

    const [selectedPathway] = useState<PathwayType>('state_order');

    // 🔥 NEW: Selected specific action type (sub-type within pathway)
    const [selectedSubActionType, setSelectedSubActionType] = useState<string>('');
    const [customSpecificActionType, setCustomSpecificActionType] = useState<string>('');

    // 🔥 NEW: Pluralization State (for Arabic grammar)
    const [isParty1Plural, setIsParty1Plural] = useState(false);
    const [isParty2Plural, setIsParty2Plural] = useState(false);

    // 🔥 NEW: Party Arrays (for multiple parties)
    const [party1List, setParty1List] = useState([
        { name: '', type: 'person', phone: '', address: '', isRepresented: false }
    ]);
    const [party2List, setParty2List] = useState([
        { name: '', type: 'person', address: '', isRepresented: false, isClient: false }
    ]);
    const party1EndRef = useRef<HTMLDivElement | null>(null);
    const party2EndRef = useRef<HTMLDivElement | null>(null);
    const ordinalNames = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس'];
    const ordinalOf = (index: number) => ordinalNames[index] ?? String(index + 1);

    // Form Data
    const [formData, setFormData] = useState({
        // معلومات أساسية
        actionType: 'state_order',
        requestNumber: '',
        requestDate: getLocalTodayYmd(),
        courtName: '',
        judgeName: '',
        
        // تفاصيل الطلب
        specificActionType: '', // 🔥 نوع الإجراء المحدد
        /** Phase 25 — تفاصيل موضوعية إلزامية لهذا النوع */
        procedureDetails: '',
        requestSubject: '',
        urgentReason: '',
        legalBasis: '',
        
        // مواعيد حرجة
        deadlineGrievance3Days: false, // التظلم 3 أيام
        deadlineTamyeez7Days: false, // التمييز 7 أيام
        
        // ملاحظات
        notes: '',

        /** Phase 22 — دخول وكيل المطلوب ضده */
        defenderEntryPhase: 1 as 1 | 2 | 3,
        stateOrderIssuedDate: '',
        defenderPhase3GrievanceDecisionDate: '',
    });
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            rafIdsRef.current.forEach((id) => cancelAnimationFrame(id));
            rafIdsRef.current = [];
        };
    }, []);

    // Auto-set pathway when initial type changes
    useEffect(() => {
        if (!initialActionType) return;
        if (initialActionType === 'acknowledgment') {
            setSelectedSubActionType(JUDICIAL_ACKNOWLEDGMENT_PRIMARY);
            setCustomSpecificActionType('');
            setFormData((prev) => ({
                ...prev,
                actionType: 'state_order',
                specificActionType: JUDICIAL_ACKNOWLEDGMENT_PRIMARY,
            }));
            return;
        }
        setFormData((prev) => ({
            ...prev,
            actionType: 'state_order',
        }));
    }, [initialActionType]);

    // 🔥 CRITICAL FIX: RESET ALL STATE WHEN SWITCHING PATHWAYS (PREVENT MEMORY LEAKAGE)
    const autoFillForm = () => {
        const dummyData = {
            state_order: {
                requestNumber: '2026/ولائي/456',
                courtName: 'محكمة بداءة الديوانية',
                judgeName: 'القاضي عادل محمود',
                specificActionType: 'الحجز الاحتياطي',
                procedureDetails: 'الأموال محل الحجز: حسابات لدى المصرف العراقي للإدارة — ذكر تفاصيل مختصرة للموضوع.',
                requestSubject: 'طلب الحجز الاحتياطي على أموال المدين لحين البت في الدعوى الأصلية',
                urgentReason: 'خشية تهريب الأموال خارج البلاد',
                legalBasis: 'المادة 18 من قانون التنفيذ العراقي',
                notes: 'الطلب عاجل جداً'
            },
            urgent_discovery: {
                requestNumber: '2026/كشف/789',
                courtName: 'محكمة بداءة الديوانية',
                judgeName: 'القاضي سامي عبد الكريم',
                specificActionType: 'الكشف العقاري',
                procedureDetails: 'العقار: قطعة 12 من قاطع 5 — نزاع حدود مع الجار الشرقي.',
                requestSubject: 'طلب كشف عقاري لتحديد حدود العقار المتنازع عليه',
                urgentReason: 'وجود تجاوزات مستمرة على العقار',
                legalBasis: 'المادة 68 من قانون المرافعات المدنية',
                notes: 'يرجى تحديد موعد الكشف خلال 48 ساعة'
            },
            acknowledgment: {
                requestNumber: '2026/إقرار/321',
                courtName: 'محكمة بداءة الديوانية',
                judgeName: 'القاضي حسين علي',
                specificActionType: JUDICIAL_ACKNOWLEDGMENT_PRIMARY,
                procedureDetails: 'المبلغ والعملة وآلية السداد المتفق عليها بين الطرفين.',
                requestSubject: 'إقرار بمديونية مبلغ 50,000,000 دينار عراقي',
                urgentReason: 'تسوية ودية بين الطرفين',
                legalBasis: 'المواد 87-90 من القانون المدني العراقي',
                notes: 'الطرفان حاضران ويوافقان على الإقرار'
            }
        };

        const currentData = (() => {
            const t = String(formData.specificActionType || '').trim();
            if (isIqrarRequest(t)) return dummyData.acknowledgment;
            if (actionTypeOptions.urgent_discovery.includes(t)) return dummyData.urgent_discovery;
            return dummyData.state_order;
        })();
        setFormData(prev => ({
            ...prev,
            ...currentData,
        }));
        setSelectedSubActionType(currentData.specificActionType);
        setCustomSpecificActionType('');

        // Fill Party 1
        setParty1List([{
            name: 'المحامي احمد مهدي الحسناوي',
            type: 'person',
            phone: '07800000000',
            address: 'الديوانية / المركز',
            isRepresented: true
        }]);

        // Fill Party 2
        setParty2List([{
            name: 'شركة الأفق للتجارة المحدودة',
            type: 'company',
            address: 'بغداد / الكرادة',
            isRepresented: false,
            isClient: false
        }]);
    };

    // 🔥 PARTY MANAGEMENT FUNCTIONS
    const addParty1 = () => {
        setParty1List((prev) => [...prev, { name: '', type: 'person', phone: '', address: '', isRepresented: false }]);
        setIsParty1Plural(true);
        const rafId = requestAnimationFrame(() => {
            if (!isMountedRef.current) return;
            party1EndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        rafIdsRef.current.push(rafId);
    };

    const removeParty1 = (index: number) => {
        setParty1List((prev) => {
            if (prev.length <= 1) return prev;
            const next = prev.filter((_, i) => i !== index);
            if (next.length === 1) setIsParty1Plural(false);
            return next;
        });
    };

    const updateParty1 = (index: number, field: string, value: any) => {
        setParty1List((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const addParty2 = () => {
        setParty2List((prev) => [...prev, { name: '', type: 'person', address: '', isRepresented: false, isClient: false }]);
        setIsParty2Plural(true);
        const rafId = requestAnimationFrame(() => {
            if (!isMountedRef.current) return;
            party2EndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        rafIdsRef.current.push(rafId);
    };

    const removeParty2 = (index: number) => {
        setParty2List((prev) => {
            if (prev.length <= 1) return prev;
            const next = prev.filter((_, i) => i !== index);
            if (next.length === 1) setIsParty2Plural(false);
            return next;
        });
    };

    const updateParty2 = (index: number, field: string, value: any) => {
        setParty2List((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const setPartyRepresented = (side: 'party1' | 'party2', index: number, nextValue: boolean) => {
        if (side === 'party1') {
            setParty1List((prev) => prev.map((p, i) => (i === index ? { ...p, isRepresented: nextValue } : p)));
            if (nextValue) setParty2List((prev) => prev.map((p) => ({ ...p, isRepresented: false, isClient: false })));
            return;
        }
        setParty2List((prev) => prev.map((p, i) => (i === index ? { ...p, isRepresented: nextValue, isClient: nextValue } : p)));
        if (nextValue) setParty1List((prev) => prev.map((p) => ({ ...p, isRepresented: false })));
    };


    const resolvedSpecificActionTypeLive = useMemo(() => {
        if (selectedSubActionType === 'other') return customSpecificActionType.trim();
        return String(selectedSubActionType || formData.specificActionType || '').trim();
    }, [selectedSubActionType, customSpecificActionType, formData.specificActionType]);

    const isIqrar = useMemo(
        () => isIqrarRequest(resolvedSpecificActionTypeLive),
        [resolvedSpecificActionTypeLive],
    );
    const isIqrarContext = isIqrar;

    const partyLabels = useMemo(() => {
        const actionType = resolvedSpecificActionTypeLive;

        if (isIqrarRequest(actionType)) {
            return { ...IQRAR_PARTY_LABELS };
        }

        const partyLabelMap = () => {
            if (actionType.includes('منع السفر')) {
                return { party1: 'طالب المنع', party2: 'المطلوب منعه من السفر' };
            }
            if (
                actionType.includes('إيقاف الإجراءات التنفيذية') ||
                actionType.includes('المزايدة') ||
                actionType.includes('إيقاف صرف مبالغ')
            ) {
                return { party1: 'طالب الإيقاف', party2: 'المطلوب الإيقاف ضده' };
            }
            if (actionType.includes('وضع إشارة عدم تصرف')) {
                return { party1: 'طالب الإشارة', party2: 'المطلوب وضع الإشارة ضده' };
            }
            if (actionType.includes('الحجز الاحتياطي')) {
                return { party1: 'طالب الحجز', party2: 'المطلوب الحجز على أمواله' };
            }
            return null;
        };

        const mapped = partyLabelMap();
        if (mapped) return mapped;

        if (actionType === 'منع السفر الولائي') {
            return {
                party1: 'طالب المنع',
                party2: 'المطلوب منعه من السفر',
            };
        }

        if (actionType === 'الحجز الاحتياطي') {
            return {
                party1: 'طالب الحجز',
                party2: 'المطلوب الحجز على أمواله',
            };
        }

        if (actionType === 'الكشف العقاري' || actionType === 'تثبيت حالة') {
            return {
                party1: 'طالب الكشف',
                party2: 'المطلوب الكشف ضده',
            };
        }

        if (actionType === 'رفع التجاوز') {
            return {
                party1: 'طالب رفع التجاوز',
                party2: 'المتجاوز',
            };
        }

        if (actionType === 'طرد الغاصب المستعجل') {
            return {
                party1: 'طالب الطرد',
                party2: 'الغاصب',
            };
        }

        return { party1: 'طالب القرار (المستدعي)', party2: 'المطلوب ضده' };
    }, [resolvedSpecificActionTypeLive]);

    const shouldHideParty2 = () => {
        if (selectedPathway === 'state_order') {
            const hiddenTypes = ['القسم الشرعي', 'إذن زواج', 'حجة وصاية'];
            return hiddenTypes.includes(formData.specificActionType);
        }
        return false;
    };

    const guidancePathwayForCopy = useMemo(
        () => resolveStoredPathwayType(resolvedSpecificActionTypeLive),
        [resolvedSpecificActionTypeLive],
    );

    const procedureDetailsGuidance = useMemo(
        () => getProcedureDetailsGuidance(guidancePathwayForCopy, selectedSubActionType, customSpecificActionType),
        [guidancePathwayForCopy, selectedSubActionType, customSpecificActionType],
    );

    const party2Hidden = useMemo(() => shouldHideParty2(), [selectedPathway, formData.specificActionType]);

    const isRespondentClient = useMemo(() => {
        if (isIqrarContext) return false;
        if (selectedPathway !== 'state_order' || party2Hidden) return false;
        return party2List.some((p) => !!p.isRepresented);
    }, [isIqrarContext, party2Hidden, party2List, selectedPathway]);

    const exampleSnippetForSubject =
        pathways[guidancePathwayForCopy]?.examples?.[0] ?? pathways.state_order.examples[0];

    const partyCardTitle = (side: 'party1' | 'party2', index: number) => {
        const base = side === 'party1' ? partyLabels.party1 : partyLabels.party2;
        return `${base} ${ordinalOf(index)}`;
    };

    useEffect(() => {
        if (!party2Hidden) return;
        setParty2List((prev) => prev.map((p) => ({ ...p, isRepresented: false, isClient: false })));
    }, [party2Hidden]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const resolvedSpecificActionType =
            selectedSubActionType === 'other'
                ? customSpecificActionType.trim()
                : String(formData.specificActionType || '').trim();
        
        const errors: Record<string, string> = {};
        const party1First = String(party1List[0]?.name ?? '').trim();
        const party2First = String(party2List[0]?.name ?? '').trim();

        const isIqrarSubmit = isIqrarRequest(resolvedSpecificActionType);

        if (!formData.courtName.trim()) errors.courtName = 'حقل المحكمة إلزامي';

        if (isIqrarSubmit) {
            const rd = String(formData.requestDate || '').trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(rd)) {
                errors.requestDate = 'موعد الحضور للمصادقة إلزامي';
            }
            if (!String(formData.requestSubject || '').trim()) {
                errors.requestSubject = 'موضوع الإقرار/الحجة إلزامي';
            }
        } else if (isRespondentClient) {
            const ep = formData.defenderEntryPhase;
            if (ep === 2) {
                const od = String(formData.stateOrderIssuedDate || '').trim();
                if (!/^\d{4}-\d{2}-\d{2}$/.test(od)) {
                    errors.stateOrderIssuedDate = 'تاريخ صدور الأمر الولائي إلزامي';
                }
            }
            if (ep === 3) {
                const gd = String(formData.defenderPhase3GrievanceDecisionDate || '').trim();
                if (!/^\d{4}-\d{2}-\d{2}$/.test(gd)) {
                    errors.defenderPhase3GrievanceDecisionDate = 'تاريخ قرار التظلم إلزامي';
                }
            }
        }

        if (!resolvedSpecificActionType) errors.specificActionType = 'حقل نوع الطلب / الإجراء إلزامي';
        if (selectedSubActionType === 'other' && !customSpecificActionType.trim()) {
            errors.customSpecificActionType = 'يرجى كتابة نوع الإجراء يدوياً';
        }
        if (!isIqrarSubmit && !String(formData.procedureDetails || '').trim()) {
            errors.procedureDetails = 'تفاصيل الإجراء إلزامية';
        }
        if (!party1First) {
            errors.party1Name = isIqrarSubmit
                ? 'لا يمكن الحفظ بدون اسم المُقَر له (المستفيد) الأول'
                : 'لا يمكن حفظ الطلب بدون اسم طالب القرار (المستدعي) الأول';
        }
        if (!party2Hidden && !party2First) {
            errors.party2Name = isIqrarSubmit
                ? 'لا يمكن الحفظ بدون اسم المُقِر الأول'
                : 'لا يمكن حفظ الطلب بدون اسم المطلوب ضده الأول';
        }

        party1List.forEach((p, i) => {
            if (!String(p.address ?? '').trim()) {
                errors[`party1_${i}_address`] = 'العنوان إلزامي للتبليغ والإخطار القانوني';
            }
        });
        if (!party2Hidden) {
            party2List.forEach((p, i) => {
                if (!String(p.address ?? '').trim()) {
                    errors[`party2_${i}_address`] = 'العنوان إلزامي للتبليغ والإخطار القانوني';
                }
            });
        }

        setValidationErrors(errors);
        if (Object.keys(errors).length > 0) return;

        const allParty2Norm = party2List.map((p) => ({ ...p, isClient: !!p.isRepresented }));
        const representedParty: 'client' | 'opponent' | null = (() => {
            const p1Rep = party1List.some((p) => !!p.isRepresented);
            const p2Rep = party2List.some((p) => !!p.isRepresented);
            if (p1Rep && !p2Rep) return 'client';
            if (p2Rep && !p1Rep) return 'opponent';
            return null;
        })();
        const clientRole = representedParty === 'opponent' ? 'respondent' : representedParty === 'client' ? 'applicant' : null;

        const storedPathway = resolveStoredPathwayType(resolvedSpecificActionType);

        // 🔥 CRITICAL: Include party data (convert arrays to structured data)
        const payload: Record<string, unknown> = {
            ...formData,
            actionType: storedPathway,
            pathwayTitle: UNIFIED_URGENT_FORM_HEADER.title,
            actionPath: UNIFIED_URGENT_FORM_HEADER.title,
            createdAt: new Date().toISOString(),
            specificActionType: resolvedSpecificActionType,
            procedureDetails: isIqrarSubmit ? '' : String(formData.procedureDetails || '').trim(),
            firstHearingDate: null,
            deadlineGrievance3Days: isIqrarSubmit ? false : formData.deadlineGrievance3Days,
            deadlineTamyeez7Days: isIqrarSubmit ? false : formData.deadlineTamyeez7Days,
            hasIntervention: false,
            initialEntryMode: 'normal',
            initialJudgeDecisionDate: '',
            defenderEntryPhase: !isIqrarSubmit && isRespondentClient ? formData.defenderEntryPhase : null,
            stateOrderIssuedDate:
                !isIqrarSubmit && isRespondentClient && formData.defenderEntryPhase >= 2
                    ? formData.stateOrderIssuedDate
                    : '',
            defenderPhase3GrievanceDecisionDate:
                !isIqrarSubmit && isRespondentClient && formData.defenderEntryPhase === 3
                    ? formData.defenderPhase3GrievanceDecisionDate
                    : '',
            representedParty: isIqrarSubmit ? null : representedParty,
            clientRole: isIqrarSubmit ? null : clientRole,

            // Party 1 Data (First party only for display simplicity)
            party1Name: party1List[0]?.name || '',
            party1Type: party1List[0]?.type || 'person',
            party1Phone: party1List[0]?.phone || '',
            party1Address: party1List[0]?.address || '',

            // Party 2 Data (First party only for display simplicity)
            party2Name: party2List[0]?.name || '',
            party2Type: party2List[0]?.type || 'person',
            party2Address: party2List[0]?.address || '',

            // Full party lists (for future use)
            allParty1: party1List,
            allParty2: allParty2Norm,
        };

        if (!isIqrarSubmit && isRespondentClient && formData.defenderEntryPhase === 2) {
            payload.initialEntryMode = 'defender_phase2';
            payload.judgeDecision = 'rejected';
            payload.judgeDecisionDate = String(formData.stateOrderIssuedDate || '').trim();
            payload.legalState = 'Awaiting_Grievance';
        } else if (!isIqrarSubmit && isRespondentClient && formData.defenderEntryPhase === 3) {
            const req = String(formData.requestDate || '').trim();
            const gDate = String(formData.defenderPhase3GrievanceDecisionDate || '').trim();
            payload.initialEntryMode = 'defender_phase3';
            payload.judgeDecision = 'rejected';
            payload.judgeDecisionDate = req;
            payload.grievanceOutcome = 'filed';
            payload.grievanceFilingDate = req;
            payload.grievanceFirstHearingDate = req;
            payload.phase2FirstHearingDate = req;
            payload.grievanceDecision = 'confirmed';
            payload.grievanceDecisionDate = gDate;
            payload.preDecisionClosed = true;
            payload.grievanceTimingConfirmed = true;
            payload.grievanceDetailsConfirmed = true;
            payload.legalState = 'Awaiting_Cassation';
        }

        onSave(payload);
    };

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const safeClose = () => {
        if (closeRequestedRef.current) return;
        closeRequestedRef.current = true;
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] bg-[#0B1021] font-['Tajawal'] overflow-hidden">
            <form onSubmit={handleSubmit} className="h-full flex flex-col">
                <div className="sticky top-0 z-50 border-b border-white/10 bg-[#0B1021]/95 backdrop-blur">
                    <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 text-white font-extrabold text-base">
                                <span className="text-xl">{UNIFIED_URGENT_FORM_HEADER.icon}</span>
                                <span className="truncate">{UNIFIED_URGENT_FORM_HEADER.title}</span>
                            </div>
                            <div className="text-white/50 text-xs mt-1 truncate">{UNIFIED_URGENT_FORM_HEADER.subtitle}</div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            {isDev && (
                                <button
                                    type="button"
                                    onClick={autoFillForm}
                                    className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
                                    title="ملء جميع الحقول تلقائياً ببيانات تجريبية"
                                >
                                    <span>🪄</span>
                                    <span>ملء تلقائي</span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={safeClose}
                                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all flex items-center gap-2"
                                aria-label="إلغاء / رجوع"
                            >
                                <X size={18} />
                                <span className="text-xs font-bold">إلغاء / رجوع</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
                        {Object.keys(validationErrors).length > 0 && (
                            <div className="border border-red-500/25 bg-red-500/10 rounded-xl px-4 py-3 text-red-100 text-sm font-bold">
                                ⚠️ يرجى تصحيح الحقول الإلزامية قبل الإرسال
                            </div>
                        )}

                        {/* Section 1: معلومات أساسية */}
                        <div className="bg-[#0B1021] border border-white/10 rounded-xl p-6">
                            <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                                <FileText size={20} className="text-[#E6C673]" />
                                معلومات الطلب الأساسية
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="md:col-span-2 lg:col-span-3">
                                    <label className="block text-white/70 text-sm mb-2">
                                        اسم المحكمة <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.courtName}
                                        onChange={(e) => updateField('courtName', e.target.value)}
                                        placeholder="اختر المحكمة المختصة..."
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:border-[#E6C673]/50 focus:outline-none"
                                    />
                                    {validationErrors.courtName && (
                                        <div className="text-red-300 text-xs mt-2 font-bold">{validationErrors.courtName}</div>
                                    )}
                                </div>
                                {/* 🔥 DROPDOWN: نوع الطلب / الإجراء */}
                                <div className="md:col-span-2 lg:col-span-3">
                                    <label className="block text-white/70 text-sm mb-2">
                                        نوع الطلب / الإجراء <span className="text-red-400">*</span>
                                    </label>
                                    <select
                                        value={selectedSubActionType}
                                        onChange={(e) => {
                                            const next = e.target.value;
                                            setSelectedSubActionType(next);
                                            updateField('procedureDetails', '');
                                            if (next === 'other') {
                                                setCustomSpecificActionType('');
                                                updateField('specificActionType', '');
                                                return;
                                            }
                                            updateField('specificActionType', next);
                                        }}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-[#E6C673]/50 focus:outline-none appearance-none cursor-pointer"
                                        style={{
                                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23E6C673'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                            backgroundPosition: 'left 0.75rem center',
                                            backgroundRepeat: 'no-repeat',
                                            backgroundSize: '1.5em 1.5em',
                                            paddingLeft: '2.5rem'
                                        }}
                                    >
                                        <option value="" className="bg-[#0B1021]">اختر نوع الإجراء...</option>
                                        {getUnifiedActionTypeOptions()
                                            .filter((option) => !String(option).includes('حجز تنفيذي'))
                                            .map((option) => (
                                                <option key={option} value={option} className="bg-[#0B1021]">
                                                    {option}
                                                </option>
                                            ))}
                                        <option value="other" className="bg-[#0B1021]">أخرى - يرجى التحديد</option>
                                    </select>
                                    {validationErrors.specificActionType && (
                                        <div className="text-red-300 text-xs mt-2 font-bold">{validationErrors.specificActionType}</div>
                                    )}
                                    {selectedSubActionType === 'other' && (
                                        <div className="mt-3">
                                            <label className="block text-white/70 text-sm mb-2">
                                                تحديد نوع الإجراء يدوياً <span className="text-red-400">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={customSpecificActionType}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setCustomSpecificActionType(val);
                                                    updateField('specificActionType', val);
                                                }}
                                                placeholder="اكتب نوع الطلب كما في العريضة"
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:border-[#E6C673]/50 focus:outline-none"
                                            />
                                            {validationErrors.customSpecificActionType && (
                                                <div className="text-red-300 text-xs mt-2 font-bold">{validationErrors.customSpecificActionType}</div>
                                            )}
                                        </div>
                                    )}

                                    {!isIqrarContext ? (
                                    <div className="mt-4">
                                        <label className="block text-white/70 text-sm mb-2">
                                            تفاصيل الإجراء (إلزامي) <span className="text-red-400">*</span>
                                        </label>
                                        <textarea
                                            value={formData.procedureDetails}
                                            onChange={(e) => updateField('procedureDetails', e.target.value)}
                                            placeholder={procedureDetailsGuidance.placeholder}
                                            dir="rtl"
                                            rows={4}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:border-[#E6C673]/50 focus:outline-none resize-y min-h-[96px]"
                                        />
                                        <span className="text-xs text-gray-500 block mt-2 leading-relaxed">{procedureDetailsGuidance.helper}</span>
                                        {validationErrors.procedureDetails && (
                                            <div className="text-red-300 text-xs mt-2 font-bold">{validationErrors.procedureDetails}</div>
                                        )}
                                    </div>
                                    ) : (
                                        <div className="mt-4">
                                            <label className="block text-white/70 text-sm mb-2">
                                                موضوع الإقرار وقيمة الحق <span className="text-red-400">*</span>
                                            </label>
                                            <textarea
                                                value={formData.requestSubject}
                                                onChange={(e) => updateField('requestSubject', e.target.value)}
                                                placeholder="مثال: دين بمبلغ 50 مليون دينار"
                                                dir="rtl"
                                                rows={4}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:border-emerald-500/50 focus:outline-none resize-y min-h-[96px]"
                                            />
                                            {validationErrors.requestSubject && (
                                                <div className="text-red-300 text-xs mt-2 font-bold">
                                                    {validationErrors.requestSubject}
                                                </div>
                                            )}
                                            <p className="mt-2 text-white/45 text-xs leading-relaxed">
                                                الإقرار حجة طوعية — لا يُطبَّق عليه مسار التظلم (3 أيام) أو التمييز (7 أيام).
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* 🔥 REMOVED: المرحلة الحالية field (Redundant in Fast-Track) */}
                                {!isIqrarContext ? (
                                <div>
                                    <label className="block text-white/70 text-sm mb-2">
                                        رقم الطلب
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.requestNumber}
                                        onChange={(e) => updateField('requestNumber', e.target.value)}
                                        placeholder="مثال: 2026/ولائي/123"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:border-[#E6C673]/50 focus:outline-none"
                                    />
                                </div>
                                ) : null}
                                <div>
                                    <label className="block text-white/70 text-sm mb-2">
                                        {isIqrarContext ? (
                                            <>
                                                موعد الحضور للمصادقة <span className="text-red-400">*</span>
                                            </>
                                        ) : (
                                            <>تاريخ تقديم الطلب / المراجعة</>
                                        )}
                                    </label>
                                    <HamiDateInput
                                        value={formData.requestDate}
                                        onValueChange={(v) => updateField('requestDate', v)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-[#E6C673]/50 focus:outline-none"
                                    />
                                    {validationErrors.requestDate && (
                                        <div className="text-red-300 text-xs mt-2 font-bold">{validationErrors.requestDate}</div>
                                    )}
                                </div>
                                {!isIqrarContext ? (
                                <div>
                                    <label className="block text-white/70 text-sm mb-2">اسم القاضي</label>
                                    <input
                                        type="text"
                                        value={formData.judgeName}
                                        onChange={(e) => updateField('judgeName', e.target.value)}
                                        placeholder="اختياري"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:border-[#E6C673]/50 focus:outline-none"
                                    />
                                </div>
                                ) : null}
                            </div>
                        </div>

                        {/* Section 2: طالب الإجراء */}
                        <div className="bg-[#0B1021] border border-white/10 rounded-xl p-6">
                            <h2 className="text-white font-bold text-lg mb-4 flex items-center justify-between gap-3">
                                <span className="flex items-center gap-2">
                                    <User size={20} className="text-[#E6C673]" />
                                    {partyLabels.party1}
                                </span>
                            </h2>

                            {/* 🔥 DYNAMIC PARTY 1 FIELDS */}
                            <div className="space-y-6">
                                {party1List.map((party, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="relative overflow-hidden rounded-2xl p-5 mb-4 border border-blue-500/20 bg-gradient-to-br from-blue-500/15 via-white/5 to-cyan-400/10 backdrop-blur-xl ring-1 ring-white/10 shadow-[0_18px_45px_rgba(0,0,0,0.35)]"
                                    >
                                        <div className="flex items-center justify-between mb-4 gap-3">
                                            <div className="flex items-center gap-2 min-w-0">
                                                {index > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeParty1(index)}
                                                        className="w-8 h-8 rounded-full border border-red-500/40 bg-red-500/15 text-red-200 hover:bg-red-500/25 transition-colors flex items-center justify-center shrink-0"
                                                        title="حذف الطرف 🗑️"
                                                        aria-label="حذف الطرف"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                                <span className="text-white/90 text-sm font-extrabold truncate">{partyCardTitle('party1', index)}</span>
                                            </div>
                                            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer select-none shrink-0">
                                                <input
                                                    type="checkbox"
                                                    checked={!!party.isRepresented}
                                                    onChange={(e) => setPartyRepresented('party1', index, e.target.checked)}
                                                    className="accent-amber-500 w-4 h-4"
                                                />
                                                <span className="text-white/80">🎖️ موكلي</span>
                                            </label>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                <label className="block text-white/70 text-sm mb-2">
                                                    نوع الطالب
                                                </label>
                                                <div className="flex gap-4">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            checked={party.type === 'person'}
                                                            onChange={() => updateParty1(index, 'type', 'person')}
                                                            className="accent-[#E6C673]"
                                                        />
                                                        <span className="text-white">شخص طبيعي</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            checked={party.type === 'company'}
                                                            onChange={() => updateParty1(index, 'type', 'company')}
                                                            className="accent-[#E6C673]"
                                                        />
                                                        <span className="text-white">شركة/مؤسسة</span>
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-white/70 text-sm mb-2">
                                                    الاسم الكامل <span className="text-red-400">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={party.name}
                                                    onChange={(e) => updateParty1(index, 'name', e.target.value)}
                                                    placeholder={party.type === 'company' ? 'اسم الشركة / والمدير المفوض (إضافة لوظيفته)' : 'الاسم الثلاثي الكامل'}
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:border-[#E6C673]/50 focus:outline-none"
                                                />
                                                {index === 0 && validationErrors.party1Name && (
                                                    <div className="text-red-300 text-xs mt-2 font-bold">{validationErrors.party1Name}</div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-white/70 text-sm mb-2">
                                                    رقم الهاتف
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={party.phone}
                                                    onChange={(e) => updateParty1(index, 'phone', e.target.value)}
                                                    placeholder="07XX XXX XXXX"
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:border-[#E6C673]/50 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-white/70 text-sm mb-2">
                                                    العنوان <span className="text-red-400">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={party.address}
                                                    onChange={(e) => updateParty1(index, 'address', e.target.value)}
                                                    placeholder="المدينة، المنطقة"
                                                    required
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:border-[#E6C673]/50 focus:outline-none"
                                                />
                                                {validationErrors[`party1_${index}_address`] && (
                                                    <div className="text-red-300 text-xs mt-2 font-bold">{validationErrors[`party1_${index}_address`]}</div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                                <div ref={party1EndRef} />
                            </div>

                            {/* 🔥 ADD PARTY BUTTON */}
                            <button
                                type="button"
                                onClick={addParty1}
                                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all text-sm font-bold bg-white/5 text-white/70 hover:bg-white/10 hover:text-[#E6C673]"
                            >
                                <UserPlus size={16} />
                                + إضافة طرف آخر
                            </button>
                        </div>

                        {/* Section 3: المطلوب ضده (DYNAMIC TITLE + CONDITIONAL VISIBILITY) */}
                        {!party2Hidden && (
                            <div className="bg-[#0B1021] border border-white/10 rounded-xl p-6">
                                <h2 className="text-white font-bold text-lg mb-4 flex items-center justify-between gap-3">
                                    <span className="flex items-center gap-2">
                                        <Building2 size={20} className="text-[#E6C673]" />
                                        {partyLabels.party2}
                                    </span>
                                </h2>

                                {/* 🔥 DYNAMIC PARTY 2 FIELDS */}
                                <div className="space-y-6">
                                    {party2List.map((party, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="relative overflow-hidden rounded-2xl p-5 mb-4 border border-red-500/20 bg-gradient-to-br from-red-500/15 via-white/5 to-rose-400/10 backdrop-blur-xl ring-1 ring-white/10 shadow-[0_18px_45px_rgba(0,0,0,0.35)]"
                                        >
                                        <div className="flex items-center justify-between mb-4 gap-3">
                                            <div className="flex items-center gap-2 min-w-0">
                                                {index > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeParty2(index)}
                                                        className="w-8 h-8 rounded-full border border-red-500/40 bg-red-500/15 text-red-200 hover:bg-red-500/25 transition-colors flex items-center justify-center shrink-0"
                                                        title="حذف الطرف 🗑️"
                                                        aria-label="حذف الطرف"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                                <span className="text-white/90 text-sm font-extrabold truncate">{partyCardTitle('party2', index)}</span>
                                            </div>
                                            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer select-none shrink-0">
                                                <input
                                                    type="checkbox"
                                                    checked={!!party.isRepresented}
                                                    onChange={(e) => setPartyRepresented('party2', index, e.target.checked)}
                                                    className="accent-amber-500 w-4 h-4"
                                                />
                                                <span className="text-white/80">🎖️ موكلي</span>
                                            </label>
                                        </div>
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="col-span-2">
                                                    <label className="block text-white/70 text-sm mb-2">
                                                        نوع المطلوب ضده
                                                    </label>
                                                    <div className="flex gap-4">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                checked={party.type === 'person'}
                                                                onChange={() => updateParty2(index, 'type', 'person')}
                                                                className="accent-[#E6C673]"
                                                            />
                                                            <span className="text-white">شخص طبيعي</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                checked={party.type === 'company'}
                                                                onChange={() => updateParty2(index, 'type', 'company')}
                                                                className="accent-[#E6C673]"
                                                            />
                                                            <span className="text-white">شركة/مؤسسة</span>
                                                        </label>
                                                    </div>
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="block text-white/70 text-sm mb-2">
                                                    الاسم الكامل <span className="text-red-400">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={party.name}
                                                        onChange={(e) => updateParty2(index, 'name', e.target.value)}
                                                        placeholder={party.type === 'company' ? 'اسم الشركة / والمدير المفوض (إضافة لوظيفته)' : 'الاسم الثلاثي الكامل'}
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:border-[#E6C673]/50 focus:outline-none"
                                                    />
                                                {index === 0 && validationErrors.party2Name && (
                                                    <div className="text-red-300 text-xs mt-2 font-bold">{validationErrors.party2Name}</div>
                                                )}
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="block text-white/70 text-sm mb-2">
                                                        العنوان <span className="text-red-400">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={party.address}
                                                        onChange={(e) => updateParty2(index, 'address', e.target.value)}
                                                        placeholder="عنوان المطلوب ضده (المدينة، المنطقة، المحلة...)"
                                                        required
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:border-[#E6C673]/50 focus:outline-none"
                                                    />
                                                    {validationErrors[`party2_${index}_address`] && (
                                                        <div className="text-red-300 text-xs mt-2 font-bold">{validationErrors[`party2_${index}_address`]}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                    <div ref={party2EndRef} />
                                </div>

                                {/* ADD PARTY BUTTON */}
                                <button
                                    type="button"
                                    onClick={addParty2}
                                    className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all text-sm font-bold bg-white/5 text-white/70 hover:bg-white/10 hover:text-[#E6C673]"
                                >
                                    <UserPlus size={16} />
                                    + إضافة طرف آخر
                                </button>

                                {isRespondentClient && !isIqrarContext ? (
                                    <div className="mt-6 border border-[#E6C673]/25 bg-[#E6C673]/5 rounded-xl p-5 space-y-4">
                                        <div className="text-white font-extrabold text-sm">
                                            نقطة الدخول للدعوى (المرحلة الحالية) <span className="text-red-400">*</span>
                                        </div>
                                        <p className="text-white/55 text-xs leading-relaxed">
                                            بما أن موكليك من جهة المطلوب ضده، حدد المرحلة التي انضم بها الوكيل إلى الإضبارة.
                                        </p>
                                        {validationErrors.defenderEntryPhase ? (
                                            <div className="text-red-300 text-xs font-bold">{validationErrors.defenderEntryPhase}</div>
                                        ) : null}
                                        <div className="grid grid-cols-1 gap-3">
                                            {(
                                                [
                                                    { v: 1 as const, label: 'المرحلة البدائية (قيد النظر)' },
                                                    { v: 2 as const, label: 'مرحلة التظلم (صدر أمر غيابي)' },
                                                    { v: 3 as const, label: 'مرحلة التمييز (في محكمة الطعن)' },
                                                ] as const
                                            ).map((opt) => (
                                                <label
                                                    key={opt.v}
                                                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                                                        formData.defenderEntryPhase === opt.v
                                                            ? 'border-[#E6C673]/50 bg-white/10'
                                                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="defenderEntryPhase"
                                                        checked={formData.defenderEntryPhase === opt.v}
                                                        onChange={() => updateField('defenderEntryPhase', opt.v)}
                                                        className="accent-[#E6C673]"
                                                    />
                                                    <span className="text-white text-sm font-bold">{opt.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                        {formData.defenderEntryPhase === 2 ? (
                                            <div>
                                                <label className="block text-white/70 text-sm mb-2">
                                                    تاريخ صدور الأمر الولائي <span className="text-red-400">*</span>
                                                </label>
                                                <HamiDateInput
                                                    value={formData.stateOrderIssuedDate}
                                                    onValueChange={(v) => updateField('stateOrderIssuedDate', v)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-[#E6C673]/50 focus:outline-none"
                                                />
                                                {validationErrors.stateOrderIssuedDate ? (
                                                    <div className="text-red-300 text-xs mt-2 font-bold">{validationErrors.stateOrderIssuedDate}</div>
                                                ) : null}
                                            </div>
                                        ) : null}

                                        {formData.defenderEntryPhase === 3 ? (
                                            <div>
                                                <label className="block text-white/70 text-sm mb-2">
                                                    تاريخ قرار التظلم <span className="text-red-400">*</span>
                                                </label>
                                                <HamiDateInput
                                                    value={formData.defenderPhase3GrievanceDecisionDate}
                                                    onValueChange={(v) => updateField('defenderPhase3GrievanceDecisionDate', v)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-[#E6C673]/50 focus:outline-none"
                                                />
                                                {validationErrors.defenderPhase3GrievanceDecisionDate ? (
                                                    <div className="text-red-300 text-xs mt-2 font-bold">
                                                        {validationErrors.defenderPhase3GrievanceDecisionDate}
                                                    </div>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                        )}
                        {!isIqrarContext ? (
                        <div className="bg-[#0B1021] border border-white/10 rounded-xl p-6">
                            <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                                <FileText size={20} className="text-[#E6C673]" />
                                خلاصة الطلب
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-white/70 text-sm mb-2">خلاصة الطلب (اختياري)</label>
                                    <textarea
                                        value={formData.requestSubject}
                                        onChange={(e) => updateField('requestSubject', e.target.value)}
                                        placeholder={`مثال: ${exampleSnippetForSubject}`}
                                        rows={2}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:border-[#E6C673]/50 focus:outline-none resize-none"
                                    />
                                    {validationErrors.requestSubject && (
                                        <div className="text-red-300 text-xs mt-2 font-bold">{validationErrors.requestSubject}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                        ) : null}

                        <div className="flex items-center justify-end gap-4 pb-2">
                            <button
                                type="button"
                                onClick={safeClose}
                                className="px-6 py-3 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all"
                            >
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                className={`
                                    px-8 py-3 rounded-lg font-bold text-white
                                    bg-gradient-to-r ${UNIFIED_URGENT_FORM_HEADER.gradient}
                                    hover:shadow-xl hover:scale-105
                                    transition-all duration-300
                                    flex items-center gap-2
                                `}
                            >
                                <Save size={20} />
                                تقديم الطلب
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};
