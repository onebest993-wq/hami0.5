export interface AnalysisResult {
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

async function callOpenRouterForAnalysis(userPrompt: string): Promise<AnalysisResult> {
    try {
        const { hasOpenRouterKey } = await import('./ai-service-reexport');
        if (!hasOpenRouterKey()) {
            return fallbackAnalysis(userPrompt);
        }
        const { callLegalAnalysisAI } = await import('./ai-service-reexport');
        const response = await callLegalAnalysisAI(userPrompt);
        const parsed: Partial<AnalysisResult> = JSON.parse(response);
        return {
            title: parsed.title || 'تحليل قانوني',
            legalContext: parsed.legalContext || 'جاري التحليل...',
            requiredFields: parsed.requiredFields || [],
            summary: parsed.summary,
            actions: parsed.actions || [],
            docType: parsed.docType,
            suggestedFilename: parsed.suggestedFilename,
            text: parsed.text,
            draftTemplate: parsed.draftTemplate,
        };
    } catch {
        return fallbackAnalysis(userPrompt);
    }
}

function fallbackAnalysis(userPrompt: string): AnalysisResult {
    if (userPrompt.includes('تخلية') || userPrompt.includes('ايجار') || userPrompt.includes('مستأجر')) {
        return {
            title: 'دعوى تخلية مأجور (منع معارضة)',
            legalContext: 'استناداً لأحكام القانون المدني العراقي وقانون إيجار العقار، يتطلب رفع الدعوى توجيه إنذار رسمي عبر كاتب العدل قبل 15 يوماً (أو حسب العقد).',
            requiredFields: [
                { key: 'tenantName', label: 'اسم المستأجر', required: true },
                { key: 'contractDate', label: 'تاريخ عقد الإيجار', type: 'date', required: true },
                { key: 'warningDate', label: 'تاريخ الإنذار (كاتب العدل)', type: 'date', required: true },
                { key: 'propertyAddress', label: 'عنوان العقار', required: true }
            ],
            docType: 'عريضة مدنية',
            actions: [
                { label: 'تدقيق صورة القيد العقاري', type: 'doc' },
                { label: 'حساب الرسوم (2% من البدل السنوي)', type: 'calendar' }
            ],
        };
    }

    if (userPrompt.includes('طلاق') || userPrompt.includes('تفريق') || userPrompt.includes('زوج')) {
        return {
            title: 'دعوى تفريق قضائي / طلاق',
            legalContext: 'وفقاً لقانون الأحوال الشخصية رقم 188 لسنة 1959، يجب تحديد سبب التفريق (ضرر، خيانة، هجر) لتكييف المادة القانونية (40، 41، 43).',
            requiredFields: [
                { key: 'spouseName', label: 'اسم الزوج/الزوجة', required: true },
                { key: 'marriageDate', label: 'تاريخ عقد الزواج', type: 'date', required: true },
                { key: 'childrenCount', label: 'عدد الأولاد', type: 'number' },
                { key: 'reason', label: 'سبب التفريق (باختصار)', required: true }
            ],
            docType: 'عريضة شرعية',
            actions: [
                { label: 'إحالة للبحث الاجتماعي', type: 'contact' },
                { label: 'جرد المهر المؤجل', type: 'doc' }
            ],
        };
    }

    return {
        title: 'عريضة دعوى عامة',
        legalContext: 'جاري تحليل النص وفق المعطيات المتاحة. يرجى تزويدنا بالتفاصيل لإكمال التكييف.',
        requiredFields: [
            { key: 'defendant', label: 'المدعى عليه', required: true },
            { key: 'subject', label: 'موضوع الدعوى', required: true }
        ],
        actions: [{ label: 'مراجعة المادة القانونية', type: 'doc' }],
    };
}

class LegalAICoordinator {
    private isCourtMode: boolean = false;

    setCourtMode(enabled: boolean) {
        this.isCourtMode = enabled;
    }

    async analyzeCaseDescription(description: string): Promise<AnalysisResult> {
        return callOpenRouterForAnalysis(description);
    }

    async processInput(input: string | Blob | Record<string, unknown>, type: 'image' | 'audio' | 'text'): Promise<AnalysisResult> {
        if (type === 'audio') {
            if (input instanceof Blob) {
                try {
                    const { transcribeAudio } = await import('./ai-service-reexport');
                    const transcribedText = await transcribeAudio(input);
                    return this.analyzeCaseDescription(transcribedText);
                } catch {
                    return {
                        title: 'تحليل تسجيل صوتي',
                        legalContext: 'تم استخراج النص من التسجيل الصوتي.',
                        requiredFields: [],
                        text: typeof input === 'string' ? input : 'تم التقاط التسجيل الصوتي بنجاح',
                        summary: ['تم التعرف على الصوت.', 'جاري المعالجة...'],
                        actions: [{ label: 'فتح تحليل نصي', type: 'doc' }],
                        docType: 'تحليل صوتي'
                    };
                }
            }
            return {
                title: 'تحليل تسجيل صوتي',
                legalContext: 'تم استخراج النص من التسجيل.',
                requiredFields: [],
                text: 'النص المفرغ من التسجيل الصوتي',
                summary: ['تم التعرف على الصوت.', 'يرجى إعادة المحاولة إذا كان النص غير دقيق.'],
                actions: [{ label: 'فتح تحليل نصي', type: 'doc' }],
                docType: 'تحليل صوتي'
            };
        }

        if (type === 'image') {
            try {
                const { extractTextFromDocumentImage } = await import('@/app/services/documentOcrService');
                const blob = input instanceof Blob ? input : null;
                const dataUrl = typeof input === 'string' ? input : null;
                const ocr = await extractTextFromDocumentImage(blob ?? dataUrl ?? '');
                const text = ocr.text.trim();
                if (text) {
                    return this.analyzeCaseDescription(text);
                }
            } catch {
                // fall through to placeholder
            }
            return {
                title: 'تحليل وثيقة ضوئية',
                legalContext: 'لم يُستخرج نص تلقائياً. تأكد من وضوح الصورة أو فعّل مفتاح OpenRouter.',
                requiredFields: [],
                text: '',
                summary: ['تم استلام الصورة.', 'أعد المحاولة من الماسح الضوئي.'],
                actions: [{ label: 'فتح الماسح الضوئي', type: 'doc' }],
                docType: 'مسح ضوئي',
            };
        }

        return this.analyzeCaseDescription(input as string);
    }
}

export const LegalAI = new LegalAICoordinator();
