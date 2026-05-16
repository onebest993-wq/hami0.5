/** Phase 39 — نوعان مرجعيان في القائمة الموحّدة */
export const URGENT_PETITION_PRIMARY = 'أمر ولائي / قضاء مستعجل';
export const JUDICIAL_ACKNOWLEDGMENT_PRIMARY = 'إقرار قضائي / حجة إقرار';

export const actionTypeOptions = {
    state_order: [
        'وضع إشارة عدم تصرف/إشارة دعوى',
        'إيقاف الإجراءات التنفيذية/المزايدة',
        'إيقاف صرف مبالغ/خطاب ضمان',
        'منع السفر',
        'الاستئخار المؤقت',
    ],
    urgent_discovery: [
        'الكشف العقاري',
        'تثبيت حالة',
        'رفع التجاوز',
        'طرد الغاصب المستعجل',
        'الحراسة القضائية',
    ],
    acknowledgment: ['إقرار الملكية', 'إقرار الدين', 'إقرار العقد'],
};

export type PathwayType = 'state_order' | 'urgent_discovery' | 'acknowledgment';

/** قائمة موحّدة لحقل «نوع الطلب / الإجراء» — يضم الأمر الولائي والكشف المستعجل والإقرار */
export function getUnifiedActionTypeOptions(): string[] {
    const core = [URGENT_PETITION_PRIMARY, JUDICIAL_ACKNOWLEDGMENT_PRIMARY];
    const merged = [
        ...actionTypeOptions.state_order,
        ...actionTypeOptions.urgent_discovery,
        ...actionTypeOptions.acknowledgment,
    ];
    const seen = new Set<string>(core);
    const out = [...core];
    for (const o of merged) {
        const s = String(o);
        if (!seen.has(s)) {
            seen.add(s);
            out.push(s);
        }
    }
    return out;
}

/** Phase 46 — تسميات الأطراف في الإقرار (المستفيد يبادر) */
export const IQRAR_PARTY_LABELS = {
    party1: 'المُقَر له (المستفيد طالب الإقرار)',
    party2: 'المُقِر (المعترف بالحق)',
} as const;

/** Phase 44 — أي نوع إقرار من القائمة (قضائي، ملكية، دين، عقد، …) */
export function isIqrarRequest(selectedType: string): boolean {
    const t = String(selectedType ?? '').trim();
    if (!t || t === URGENT_PETITION_PRIMARY) return false;
    return t.includes('إقرار');
}

/** @deprecated Use isIqrarRequest — kept for existing imports */
export function isJudicialAcknowledgmentRequest(specificActionType: string): boolean {
    return isIqrarRequest(specificActionType);
}

export function resolveStoredPathwayType(resolvedSpecificActionType: string): PathwayType {
    const t = String(resolvedSpecificActionType ?? '').trim();
    if (isIqrarRequest(t)) return 'acknowledgment';
    if (actionTypeOptions.urgent_discovery.includes(t)) return 'urgent_discovery';
    return 'state_order';
}

export const UNIFIED_URGENT_FORM_HEADER = {
    title: 'القضاء المستعجل والحجج',
    subtitle: 'أوامر ولائية، قضاء مستعجل، وإقرار قضائي',
    icon: '⚖️',
    gradient: 'from-amber-500 to-yellow-600' as const,
};

/** Phase 25 — إرشادات ديناميكية لحقل تفاصيل الإجراء */
export function getProcedureDetailsGuidance(
    pathway: PathwayType,
    selectedOption: string,
    otherCustomText: string,
): { placeholder: string; helper: string } {
    const resolved = selectedOption === 'other' ? otherCustomText.trim() : selectedOption === '' ? '' : selectedOption;
    const t = resolved.trim();
    const defPh = 'أدخل التفاصيل الجوهرية الخاصة بهذا الطلب...';
    const defH = 'اذكر بيانات تحدد موضوع الطلب بشكل مباشر ودون لبس.';

    if (isIqrarRequest(t)) {
        return {
            placeholder: 'صف موضوع الإقرار والالتزامات أو الحق المعترف به باختصار ودقة...',
            helper: 'الإقرار القضائي حجة طوعية؛ ركّز على ما يُعترَف به دون إسقاط مسارات التظلم/التمييز الخاصة بالأمر الولائي.',
        };
    }

    if (pathway === 'urgent_discovery') {
        return {
            placeholder: 'أدخل وصف الحالة المراد إثباتها أو الكشف عليها باختصار...',
            helper: 'ينطبق على إثبات الحالة والكشف المستعجل وما شاكلها ضمن القضاء المستعجل.',
        };
    }

    if (!t) {
        return { placeholder: defPh, helper: defH };
    }

    if (t.includes('منع السفر')) {
        return {
            placeholder: 'أدخل رقم الجواز أو الرقم الوطني واسم الأم...',
            helper: 'البيانات الشخصية الدقيقة تُسهم في صدور أمر منع دقيق ومحدد.',
        };
    }
    if (t.includes('وضع إشارة') || t.includes('إشارة دعوى')) {
        return {
            placeholder: 'أدخل تسلسل العقار والمقاطعة، أو رقم المركبة...',
            helper: 'حدّد محل التصرف (عقار/مركبة/غيره) كما في الواقع المعتمد لدى الكاتب العدل.',
        };
    }
    if (t.includes('إيقاف الإجراءات التنفيذية') || t.includes('المزايدة')) {
        return {
            placeholder: 'أدخل رقم الإضبارة التنفيذية واسم مديرية التنفيذ المختصة...',
            helper: 'أرقام الملف التنفيذي والمديرية تربط الطلب بالسياق التنفيذي المعني.',
        };
    }
    if (t.includes('إيقاف صرف') || t.includes('خطاب ضمان')) {
        return {
            placeholder: 'أدخل اسم المصرف، الفرع، ورقم الحساب/الخطاب...',
            helper: 'بيانات المصرف والحساب أو الخطاب تحدد موضوع الإيقاف المطلوب.',
        };
    }

    return { placeholder: defPh, helper: defH };
}

export interface PathwayConfig {
    id: PathwayType;
    title: string;
    subtitle: string;
    icon: string;
    color: string;
    gradient: string;
    examples: string[];
    description: string;
}

export const pathways: Record<PathwayType, PathwayConfig> = {
    state_order: {
        id: 'state_order',
        title: 'الأمر الولائي',
        subtitle: 'Orders on Petitions',
        icon: '⚖️',
        color: 'amber',
        gradient: 'from-amber-500 to-yellow-600',
        examples: [
            'وضع إشارة عدم تصرف/إشارة دعوى',
            'إيقاف الإجراءات التنفيذية/المزايدة',
            'إيقاف صرف مبالغ/خطاب ضمان',
            'منع السفر',
            'الاستئخار المؤقت',
        ],
        description: 'أوامر سرية مباغتة تصدر دون علم الخصم',
    },
    urgent_discovery: {
        id: 'urgent_discovery',
        title: 'القضاء المستعجل',
        subtitle: 'Urgent Jurisdiction',
        icon: '🔍',
        color: 'blue',
        gradient: 'from-blue-500 to-cyan-600',
        examples: ['الكشف العقاري', 'رفع التجاوز', 'الحراسة القضائية', 'طرد الغاصب'],
        description: 'إجراء وجاهي سريع لكشف الحقيقة',
    },
    /** بقية للتوافق مع بيانات قديمة — الواجهة الموحّدة لا تعرض مساراً منفرداً للإقرار */
    acknowledgment: {
        id: 'acknowledgment',
        title: 'إقرار قضائي',
        subtitle: 'Judicial acknowledgment (legacy key)',
        icon: '✅',
        color: 'green',
        gradient: 'from-green-500 to-emerald-600',
        examples: ['إقرار الدين', 'إقرار الملكية', 'إقرار العقد'],
        description: 'حجة طوعية — تُدار من النموذج الموحّد',
    },
};
