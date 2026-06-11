export interface CaseAnalysisResult {
    title: string;
    legalContext: string;
    requiredFields: { key: string; label: string; type?: string; required?: boolean }[];
    summary?: string[];
    actions: { label: string; type: 'calendar' | 'doc' | 'contact' }[];
    docType?: string;
    suggestedFilename?: string;
    text?: string;
    draftTemplate?: (data: Record<string, unknown>) => string;
}

/** Rule-based case description analysis (V1 — no external AI). */
export function analyzeCaseDescription(userPrompt: string): CaseAnalysisResult {
    const description = userPrompt.trim();
    if (!description) {
        return {
            title: 'عريضة دعوى عامة',
            legalContext: 'أدخل وصفاً للقضية لبدء الصياغة.',
            requiredFields: [
                { key: 'defendant', label: 'المدعى عليه', required: true },
                { key: 'subject', label: 'موضوع الدعوى', required: true },
            ],
            actions: [],
        };
    }

    if (description.includes('تخلية') || description.includes('ايجار') || description.includes('مستأجر')) {
        return {
            title: 'دعوى تخلية مأجور (منع معارضة)',
            legalContext:
                'استناداً لأحكام القانون المدني العراقي وقانون إيجار العقار، يتطلب رفع الدعوى توجيه إنذار رسمي عبر كاتب العدل قبل 15 يوماً (أو حسب العقد).',
            requiredFields: [
                { key: 'tenantName', label: 'اسم المستأجر', required: true },
                { key: 'contractDate', label: 'تاريخ عقد الإيجار', type: 'date', required: true },
                { key: 'warningDate', label: 'تاريخ الإنذار (كاتب العدل)', type: 'date', required: true },
                { key: 'propertyAddress', label: 'عنوان العقار', required: true },
            ],
            docType: 'عريضة مدنية',
            actions: [
                { label: 'تدقيق صورة القيد العقاري', type: 'doc' },
                { label: 'حساب الرسوم (2% من البدل السنوي)', type: 'calendar' },
            ],
        };
    }

    if (description.includes('طلاق') || description.includes('تفريق') || description.includes('زوج')) {
        return {
            title: 'دعوى تفريق قضائي / طلاق',
            legalContext:
                'وفقاً لقانون الأحوال الشخصية رقم 188 لسنة 1959، يجب تحديد سبب التفريق (ضرر، خيانة، هجر) لتكييف المادة القانونية (40، 41، 43).',
            requiredFields: [
                { key: 'spouseName', label: 'اسم الزوج/الزوجة', required: true },
                { key: 'marriageDate', label: 'تاريخ عقد الزواج', type: 'date', required: true },
                { key: 'childrenCount', label: 'عدد الأولاد', type: 'number' },
                { key: 'reason', label: 'سبب التفريق (باختصار)', required: true },
            ],
            docType: 'عريضة شرعية',
            actions: [
                { label: 'إحالة للبحث الاجتماعي', type: 'contact' },
                { label: 'جرد المهر المؤجل', type: 'doc' },
            ],
        };
    }

    return {
        title: 'عريضة دعوى عامة',
        legalContext: 'صِغ العريضة وفق المعطيات المتاحة. راجع المواد القانونية المنطبقة قبل الإيداع.',
        requiredFields: [
            { key: 'defendant', label: 'المدعى عليه', required: true },
            { key: 'subject', label: 'موضوع الدعوى', required: true },
        ],
        actions: [{ label: 'مراجعة المادة القانونية', type: 'doc' }],
    };
}
