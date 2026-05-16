import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type TimelineItem = { title?: string; description?: string; date?: string; source?: string; type?: string };
type DecisionItem = {
    title?: string;
    appealStatus?: string;
    appealActor?: string;
    appealMethod?: string;
    appealResult?: string;
};
type CaseSnapshot = {
    executionId: string;
    dossierStatus: string;
    claimType: string;
    executionType?: string;
    documentType?: string;
    debtorJob?: string;
    hasGuarantor?: boolean;
    remainingDebt?: number;
    generatedAt: string;
    timeline?: TimelineItem[];
    tasks?: Array<{ title?: string; dueDate?: string }>;
    notes?: Array<{ title?: string; body?: string }>;
    decisions?: DecisionItem[];
};
type Citation = {
    title: string;
    url: string;
    source: 'iraqi_official' | 'web' | 'rag';
    publishedAt?: string;
    excerpt?: string;
};
type RetrievedLawRow = {
    law_name?: string;
    article_number?: string;
    content?: string;
};
type RetrievedDecisionRow = {
    decision_number?: string;
    decision_date?: string;
    court_name?: string;
    legal_principle?: string;
    full_text?: string;
    related_article?: string;
};
type KnowledgeSourceType =
    | 'قانون التنفيذ'
    | 'قانون المرافعات المدنية'
    | 'القانون المدني'
    | 'تعليمات وزارية'
    | 'قرار تمييزي'
    | 'مصدر قانوني آخر';
type RetrievedKnowledgeItem = {
    sourceType: KnowledgeSourceType;
    sourceName: string;
    reference: string;
    excerpt: string;
    rank: number;
};
type AuditorSuggestion = {
    type: 'حرج' | 'مهم' | 'تحسيني' | 'استباقي' | 'تحري_مالي' | 'إجراء_فوري';
    title: string;
    description: string;
    source: string[];
    draftText?: string;
};
type SpellIssue = { wrong: string; correct: string; note: string };
type OpenRouterRetryResult = {
    text: string | null;
    overloaded: boolean;
    lastStatus: number | null;
    lastErrorBody?: string;
};
type AuditorCallResult = {
    suggestions: AuditorSuggestion[];
    overloaded: boolean;
};

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function jsonResponse(payload: unknown, status = 200): Response {
    return new Response(JSON.stringify(payload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status,
    });
}

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const OFFICIAL_SOURCES = [
    { title: 'مجلس القضاء الأعلى العراقي', url: 'https://www.hjc.iq' },
    { title: 'وزارة العدل العراقية', url: 'https://moj.gov.iq' },
    { title: 'مجلس الدولة العراقي', url: 'https://www.shura.gov.iq' },
];

function stripJson(raw: string): string {
    return raw
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
}

function getSupabaseAdminClient() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
    if (!supabaseUrl || !serviceRole) return null;
    return createClient(supabaseUrl, serviceRole, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

function getGeminiApiKey(): string | null {
    return Deno.env.get('GEMINI_API_KEY')?.trim() || Deno.env.get('GOOGLE_API_KEY')?.trim() || null;
}

function vectorLiteral(values: number[]): string {
    return `[${values.join(',')}]`;
}

async function fetchEmbedding(query: string): Promise<number[] | null> {
    const apiKey = getGeminiApiKey();
    if (!apiKey || !query.trim()) return null;
    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'models/gemini-embedding-001',
            content: { parts: [{ text: query }] },
            taskType: 'RETRIEVAL_QUERY',
            outputDimensionality: 768,
        }),
    });
    if (!response.ok) return null;
    const data: any = await response.json().catch(() => null);
    const values = data?.embedding?.values;
    if (!Array.isArray(values) || values.length === 0) return null;
    return values.filter((v: unknown) => typeof v === 'number' && Number.isFinite(v));
}

async function fetchOfficialSignals(): Promise<Citation[]> {
    const out: Citation[] = [];
    for (const src of OFFICIAL_SOURCES) {
        try {
            const res = await fetch(src.url, { method: 'GET' });
            if (!res.ok) continue;
            out.push({
                title: src.title,
                url: src.url,
                source: 'iraqi_official',
                publishedAt: res.headers.get('last-modified') || new Date().toISOString(),
                excerpt: `تم التحقق من المصدر الرسمي بحالة HTTP ${res.status}.`,
            });
        } catch {
            // ignore
        }
    }
    return out;
}

function buildCaseSnapshotPack(snapshot: CaseSnapshot, currentDate: string) {
    const recentProcedures = (snapshot.timeline || []).slice(0, 10).map((e) => ({
        title: e.title || '',
        description: e.description || '',
        date: e.date || '',
        source: e.source || '',
        type: e.type || '',
    }));
    const recentNotes = (snapshot.notes || [])
        .slice(0, 10)
        .map((n) => [n.title || '', n.body || ''].filter(Boolean).join(' — '));
    const appeals = (snapshot.decisions || []).map((d) => ({
        title: d.title || '',
        appealStatus: d.appealStatus || '',
        appealActor: d.appealActor || '',
        appealMethod: d.appealMethod || '',
        appealResult: d.appealResult || '',
    }));
    return {
        current_date: currentDate,
        dossier_id: snapshot.executionId,
        dossier_status: snapshot.dossierStatus,
        claim_type: snapshot.claimType,
        execution_type: snapshot.executionType || snapshot.claimType || '',
        document_type: snapshot.documentType || '',
        debtor_job: snapshot.debtorJob || '',
        has_guarantor: Boolean(snapshot.hasGuarantor),
        remaining_debt: Number(snapshot.remainingDebt || 0),
        recent_procedures: recentProcedures,
        recent_notes: recentNotes,
        appeals,
    };
}

function extractMandatoryKeywordsFromPack(pack: ReturnType<typeof buildCaseSnapshotPack>): string[] {
    const last3 = pack.recent_procedures.slice(0, 3);
    const corpus = last3
        .map((p) => [p.title, p.description, p.source, p.type].join(' '))
        .join(' ')
        .toLowerCase();
    const must = ['تبليغ', 'إخبار تنفيذي', 'اخبار تنفيذي', 'حجز', 'مختار', 'طعن', 'تمييز', 'تظلم'];
    const picked = must.filter((k) => corpus.includes(k.toLowerCase()));
    const executionTypeKeyword = String(pack.execution_type || '').trim();
    if (executionTypeKeyword) picked.unshift(executionTypeKeyword);
    if (picked.length > 0) return picked.slice(0, 8);
    const fallback = corpus
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 3)
        .slice(0, 6);
    return executionTypeKeyword ? [executionTypeKeyword, ...fallback].slice(0, 8) : fallback;
}

async function retrieveLawsStrict(pack: ReturnType<typeof buildCaseSnapshotPack>): Promise<{
    keywords: string[];
    rows: RetrievedLawRow[];
}> {
    const keywords = extractMandatoryKeywordsFromPack(pack);
    const queryText = keywords.join(' ').trim();
    if (!queryText) return { keywords: [], rows: [] };
    const supabase = getSupabaseAdminClient();
    if (!supabase) return { keywords, rows: [] };
    const embedding = await fetchEmbedding(queryText);
    if (!embedding) return { keywords, rows: [] };
    const { data, error } = await supabase.rpc('hybrid_search_laws', {
        query_embedding: vectorLiteral(embedding),
        query_text: queryText,
        match_threshold: 0.3,
        match_count: 8,
    });
    if (error || !Array.isArray(data)) return { keywords, rows: [] };
    return { keywords, rows: data as RetrievedLawRow[] };
}

async function retrieveDecisionsStrict(pack: ReturnType<typeof buildCaseSnapshotPack>): Promise<{
    keywords: string[];
    rows: RetrievedDecisionRow[];
}> {
    const keywords = extractMandatoryKeywordsFromPack(pack);
    const queryText = keywords.join(' ').trim();
    if (!queryText) return { keywords: [], rows: [] };
    const supabase = getSupabaseAdminClient();
    if (!supabase) return { keywords, rows: [] };
    const embedding = await fetchEmbedding(queryText);
    if (!embedding) return { keywords, rows: [] };
    const { data, error } = await supabase.rpc('hybrid_search_decisions', {
        query_embedding: vectorLiteral(embedding),
        query_text: queryText,
        match_threshold: 0.3,
        match_count: 8,
    });
    if (error || !Array.isArray(data)) return { keywords, rows: [] };
    return { keywords, rows: data as RetrievedDecisionRow[] };
}

function buildRetrievedLawsText(rows: RetrievedLawRow[]): string {
    if (!rows.length) return '';
    return rows
        .map((r, i) => {
            const law = String(r.law_name || 'قانون غير محدد');
            const article = String(r.article_number || 'غير محدد');
            const content = String(r.content || '').trim();
            const sourceType = detectLawSourceType(law);
            return `[${i + 1}] [META]\nنوع_المصدر: ${sourceType}\nاسم_المصدر: ${law}\nالمرجع: المادة ${article}\nالنص: ${content}`;
        })
        .join('\n\n---\n\n');
}

function detectLawSourceType(lawNameRaw: string): KnowledgeSourceType {
    const name = lawNameRaw.toLowerCase();
    if (name.includes('تنفيذ')) return 'قانون التنفيذ';
    if (name.includes('مرافعات')) return 'قانون المرافعات المدنية';
    if (name.includes('مدني')) return 'القانون المدني';
    if (name.includes('تعليمات') || name.includes('وزارة')) return 'تعليمات وزارية';
    return 'مصدر قانوني آخر';
}

function buildKnowledgeItemsFromLaws(rows: RetrievedLawRow[]): RetrievedKnowledgeItem[] {
    return rows.map((r, idx) => {
        const lawName = String(r.law_name || 'قانون غير محدد');
        const article = String(r.article_number || 'غير محدد');
        const excerpt = String(r.content || '').trim();
        return {
            sourceType: detectLawSourceType(lawName),
            sourceName: lawName,
            reference: `المادة ${article}`,
            excerpt: excerpt.slice(0, 280),
            rank: idx + 1,
        };
    });
}

function buildKnowledgeItemsFromDecisions(rows: RetrievedDecisionRow[]): RetrievedKnowledgeItem[] {
    return rows.map((r, idx) => {
        const no = String(r.decision_number || 'بدون رقم');
        const dt = String(r.decision_date || 'بدون تاريخ');
        const court = String(r.court_name || 'محكمة غير محددة');
        const principle = String(r.legal_principle || r.full_text || '').trim();
        return {
            sourceType: 'قرار تمييزي',
            sourceName: court,
            reference: `قرار ${no} بتاريخ ${dt}`,
            excerpt: principle.slice(0, 280),
            rank: idx + 1,
        };
    });
}

function buildRetrievedDecisionsText(rows: RetrievedDecisionRow[]): string {
    if (!rows.length) return '';
    return rows
        .map((r, i) => {
            const no = String(r.decision_number || 'بدون رقم');
            const dt = String(r.decision_date || 'بدون تاريخ');
            const court = String(r.court_name || 'محكمة غير محددة');
            const principle = String(r.legal_principle || '').trim();
            const article = String(r.related_article || '').trim();
            return `[${i + 1}] [META]\nنوع_المصدر: قرار تمييزي\nاسم_المصدر: ${court}\nالمرجع: قرار ${no} بتاريخ ${dt}\nالمبدأ: ${principle}\nالمادة المرتبطة: ${article}`;
        })
        .join('\n\n---\n\n');
}

function buildSteelPrompt(currentDate: string, retrievedLaws: string): string {
    return `أنت 'حامي'، أقوى وكيل ذكاء اصطناعي قانوني في العراق. مهمتك فحص الإضبارة التنفيذية بدقة جراحية لاكتشاف الثغرات والأخطاء والفرص.
الزمن الحالي: ${currentDate}
النصوص القانونية العراقية الملزمة لك (السند القانوني):
${retrievedLaws}

قواعد العمل الصارمة (تجاهلها يعني الفشل):
1. ممنوع التأليف: لا تكتب أي ملاحظة، أو تحدد مدة زمنية، أو تقترح إجراءً إلا إذا كان مدعوماً بالنصوص القانونية المرفقة أعلاه فقط.
2. التدقيق العميق للمدد: احسب الفارق بين تواريخ الإجراءات والزمن الحالي. إذا تم التبليغ، تحقق هل انتهت مهلة الـ 7 أيام أم لا. إذا لم تنته، حذر المحامي (مهمة حرجة).
3. دقة التبليغ: راقب من استلم التبليغ (شخصياً أم المختار).
4. إذا لم تجد نصاً قانونياً في المرفقات يعالج المشكلة، لا تقترح شيئاً من خيالك، اترك الاقتراح فارغاً أو اكتب 'يحتاج مراجعة يدوية'.

الوحدات الخارقة الإلزامية:
1) وحدة 'كلب الصيد المالي' (Asset Bloodhound) - نوع الاقتراح: 'تحري_مالي'
- اقرأ ما يتوفر من معلومات عن المدين (المهنة، السكن، العمر) من السياق.
- استنتج جهات محددة جداً للتحري المالي ولا تكتب 'استعلام عام'.

2) وحدة 'محكمة السيرفر الافتراضية' (Multi-Agent Mock Trial) - نوع الاقتراح: 'استباقي'
- عند وجود طعن أو إجراء معقد، حاكي داخلياً هجوم الخصم ودفاع الدائن.
- أخرج الخلاصة فقط كاستراتيجية مضادة محكمة مع سند قانوني أو تمييزي.

3) وحدة 'التوليد العكسي الفوري' (Zero-Click Drafting) - نوع الاقتراح: 'إجراء_فوري'
- إذا كان الحل يتطلب طلباً رسمياً لدائرة التنفيذ، أنشئ نص طلب عراقي كامل موجّه إلى (السيد المنفذ العدل المحترم).
- ضع النص القانوني داخل الحقل draftText.

المخرجات (JSON فقط):
أرجع مصفوفة \`suggestions\` تحتوي على:
- type: 'حرج' | 'مهم' | 'تحسيني' | 'استباقي' | 'تحري_مالي' | 'إجراء_فوري'
- title
- description
- source (مصفوفة نصوص إلزامية توضح السند القانوني/التمييزي بدقة)
- draftText (اختياري وإلزامي عند نوع 'إجراء_فوري')
في حقل 'source'، يجب أن تكتب بوضوح أين وجدت الحل، مثل:
['استناداً إلى المادة 25 من قانون التنفيذ', 'مقترنة بالقرار التمييزي رقم 123 لسنة 2024']
قاعدة الشفافية الإلزامية: لا تكتب مصدرًا عامًا. يجب تضمين رقم المادة، واسم القانون، ورقم القرار التمييزي (إن وجد) بصيغة قابلة للربط لاحقاً.

معلومات الإضبارة الحالية:
- نوع التنفيذ: {executionType}
- السند المنفذ: {documentType}
- مهنة المدين: {debtorJob}
- وجود كفيل ضامن: {hasGuarantor}
- مبلغ الدين المتبقي: {remainingDebt}

التعليمات التكيفية (Adaptive Rules):
بما أن نوع هذه الإضبارة هو '{executionType}'، يجب عليك تفعيل 'بروتوكول التدقيق الخاص بهذا النوع' فقط.
- إذا كانت 'تخلية': ركز على مدد التخلية (تختلف عن الحجز)، وإجراءات الجرد، ومحضر التسليم.
- إذا كانت 'دين': ركز على الحجز التنفيذي، حجز الأموال لدى الغير، والبيع بالمزاد.
تجاهل أي نصوص قانونية أو إجراءات لا تتطابق مع طبيعة هذه الإضبارة والسند المنفذ.

🛑 المحظورات وحواجز الحماية المنطقية (Negative Prompts & Guardrails):
يجب عليك قراءة بيانات الإضبارة (مهنة المدين، وجود كفيل، مبلغ الدين) والالتزام الحرفي بهذه القيود المانعة قبل اقتراح أي إجراء. تجاهل هذه القيود يعتبر فشلاً ذريعاً:
1. قيد الموظف الحكومي: إذا كان 'debtorJob' يشير إلى أنه (موظف حكومي، عسكري، منتسب)، يُمنع منعاً باتاً اقتراح (الحبس التنفيذي، منع السفر، مفاتحة محكمة التحقيق، أو الإخبار بجرائم التزوير) لمجرد المماطلة. مسارك الإجباري هو 'حجز الراتب' ومتابعته مع دائرته المستفيدة.
2. قيد الكفيل الضامن: إذا كان حقل 'hasGuarantor' صحيحاً (true)، يُمنع تضييع الوقت بالتحري المعقد واستعلامات العقارات للمدين الأصلي المتهرب. يجب توجيه الإجراءات وتوليد الطلبات فوراً نحو 'الكفيل الضامن' (إنذار الكفيل، حجز راتب/أموال الكفيل).
3. التدرج التنفيذي الإلزامي: يُمنع اقتراح حجز 'العقارات' أو الأموال غير المنقولة إذا كان مبلغ الدين ('remainingDebt') صغيراً أو يمكن سداده بطرق أسهل. يجب الالتزام بسلم الحجز بالترتيب: (1. النقد، 2. الراتب، 3. المنقولات/السيارات، 4. العقارات).
إذا اصطدمت بأي من هذه الحواجز، استبدل الإجراء القاسي بإجراء متدرج واشرح للمحامي أنك فعلت ذلك التزاماً بـ 'بروتوكول التدرج التنفيذي ومنع التعسف'.

📚 قاعدة تحليل المصادر المتعددة (Hierarchical Verification):
لقد تم تزويدك بنصوص من مصادر قانونية مختلفة (قانون تنفيذ، مرافعات، قرارات تمييزية). عند تحليل الإضبارة، التزم بالتدرج التالي:
1. 'القرار التمييزي' ينسخ أو يُقيد 'النص العام'. إذا وجدت قراراً تمييزياً يخص الحالة، فهو القاعدة الواجبة التطبيق.
2. إذا كان الإجراء يخص التبليغات أو المدد العامة، ارجع لـ 'قانون المرافعات المدنية'.
3. إذا كان يخص الحجز والبيع، ارجع لـ 'قانون التنفيذ'.

🛑 حذارِ من الخلط (Cross-Contamination):
- لا تطبق نصاً من القانون المدني إذا كان هناك نص صريح في قانون التنفيذ يعالج المسألة (الخاص يقيد العام).
- تأكد من قراءة 'نوع المصدر' المرفق مع كل نص قبل استخدامه.

قاعدة اجتهاد قضائي ذهبية:
أنت قاضي تمييز خبير. تم تزويدك بنصوص القوانين (القاعدة العامة) وبأحدث القرارات التمييزية (الاجتهاد).
المبدأ التمييزي يقيد أو ينسخ ظاهر النص القانوني.
إذا وجدت تعارضاً أو تخصيصاً في القرارات التمييزية المرفقة مقارنة بالقانون، يجب أن تبني استنتاجك وتوجيهك للمحامي على القرار التمييزي الأحدث، مع ذكر رقمه وتاريخه كسلاح قانوني رابح.`;
}

function injectAdaptivePrompt(
    basePrompt: string,
    executionType: string,
    documentType: string,
    debtorJob: string,
    hasGuarantor: boolean,
    remainingDebt: number
): string {
    return basePrompt
        .replaceAll('{executionType}', executionType || 'غير محدد')
        .replaceAll('{documentType}', documentType || 'غير محدد')
        .replaceAll('{debtorJob}', debtorJob || 'غير محدد')
        .replaceAll('{hasGuarantor}', hasGuarantor ? 'نعم' : 'لا')
        .replaceAll('{remainingDebt}', Number(remainingDebt || 0).toLocaleString('ar-IQ'));
}

function parseIso(value?: string): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function daysDiff(fromIso: string, toIso: string): number | null {
    const from = parseIso(fromIso);
    const to = parseIso(toIso);
    if (!from || !to) return null;
    return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function buildTemporalContext(pack: ReturnType<typeof buildCaseSnapshotPack>) {
    const notify = pack.recent_procedures.find((p) => /تبليغ|إخبار|اخبار/i.test(`${p.title} ${p.source}`));
    const seize = pack.recent_procedures.find((p) => /حجز/i.test(`${p.title} ${p.source}`));
    const latest = pack.recent_procedures[0];
    return {
        notification_date: notify?.date || null,
        seizure_date: seize?.date || null,
        days_from_notification_to_seizure:
            notify?.date && seize?.date ? daysDiff(notify.date, seize.date) : null,
        days_since_latest_action: latest?.date ? daysDiff(latest.date, pack.current_date) : null,
    };
}

function localLegalSpellHints(text: string): SpellIssue[] {
    const pairs: Array<{ wrong: RegExp; replacement: string; note: string }> = [
        {
            wrong: /المادج/gi,
            replacement: 'المادة',
            note: 'يوجد خطأ إملائي في مصطلح قانوني أساسي.',
        },
        {
            wrong: /خطا لغوية/gi,
            replacement: 'أخطاء لغوية',
            note: 'صياغة لغوية غير دقيقة.',
        },
    ];
    const out: SpellIssue[] = [];
    for (const p of pairs) {
        const hit = text.match(p.wrong);
        if (hit) out.push({ wrong: hit[0], correct: p.replacement, note: p.note });
    }
    return out;
}

async function callOpenRouterWithRetry(args: {
    apiKey: string;
    models: string[];
    title: string;
    temperature: number;
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
}): Promise<OpenRouterRetryResult> {
    const { apiKey, models, title, temperature, messages } = args;
    let overloaded = false;
    let lastStatus: number | null = null;
    let lastErrorBody = '';
    for (let i = 0; i < models.length; i += 1) {
        const model = models[i];
        try {
            const response = await fetch(OPENROUTER_URL, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://hami-app.com',
                    'X-Title': title,
                },
                body: JSON.stringify({
                    model,
                    temperature,
                    messages,
                }),
            });
            lastStatus = response.status;
            if (response.ok) {
                const data: any = await response.json().catch(() => null);
                const text = String(data?.choices?.[0]?.message?.content || '').trim();
                if (text) return { text, overloaded, lastStatus, lastErrorBody };
                continue;
            }
            lastErrorBody = await response.text().catch(() => '');
            if (response.status === 546 || response.status === 429) {
                overloaded = true;
                if (i < models.length - 1) await wait(350);
                continue;
            }
            if (response.status === 500) {
                if (i < models.length - 1) await wait(350);
                continue;
            }
            // Try next model for any non-2xx issue as graceful fallback.
            if (i < models.length - 1) await wait(200);
        } catch {
            if (i < models.length - 1) await wait(200);
        }
    }
    return { text: null, overloaded, lastStatus, lastErrorBody };
}

async function runLegalSpellchecker(inputText: string): Promise<SpellIssue[]> {
    const key = Deno.env.get('OPENROUTER_API_KEY')?.trim();
    if (!key || !inputText.trim()) return localLegalSpellHints(inputText);
    const retryResult = await callOpenRouterWithRetry({
        apiKey: key,
        models: [
            'google/gemma-2-9b-it:free',
            'google/gemma-7b-it:free',
            'meta-llama/llama-3.1-8b-instruct:free',
        ],
        title: 'Hami Legal Spellchecker',
        temperature: 0.1,
        messages: [
            {
                role: 'system',
                content:
                    'أنت مدقق صياغة قانونية عراقية. أخرج JSON فقط بالشكل {"issues":[{"wrong":"","correct":"","note":""}]} ولا تضف أي نص آخر.',
            },
            { role: 'user', content: inputText },
        ],
    });
    const text = String(retryResult.text || '').trim();
    if (!text) return localLegalSpellHints(inputText);
    try {
        const parsed = JSON.parse(stripJson(text));
        const issues = Array.isArray(parsed?.issues) ? parsed.issues : [];
        const normalized = issues
            .map((i: any) => ({
                wrong: String(i?.wrong || '').trim(),
                correct: String(i?.correct || '').trim(),
                note: String(i?.note || '').trim(),
            }))
            .filter((i: SpellIssue) => i.wrong && i.correct);
        return normalized.length > 0 ? normalized : localLegalSpellHints(inputText);
    } catch {
        return localLegalSpellHints(inputText);
    }
}

function normalizeAuditorSuggestions(raw: unknown): AuditorSuggestion[] {
    if (!raw || typeof raw !== 'object') return [];
    const suggestions = (raw as any).suggestions;
    if (!Array.isArray(suggestions)) return [];
    return suggestions
        .map((s: any) => ({
            type: String(s?.type || '').trim(),
            title: String(s?.title || '').trim(),
            description: String(s?.description || '').trim(),
            source: Array.isArray(s?.source)
                ? s.source.map((x: unknown) => String(x || '').trim()).filter(Boolean)
                : String(s?.source || '')
                      .split(/[\n،]/g)
                      .map((x) => x.trim())
                      .filter(Boolean),
            draftText: String(s?.draftText || '').trim() || undefined,
        }))
        .filter(
            (s: AuditorSuggestion) =>
                (s.type === 'حرج' ||
                    s.type === 'مهم' ||
                    s.type === 'تحسيني' ||
                    s.type === 'استباقي' ||
                    s.type === 'تحري_مالي' ||
                    s.type === 'إجراء_فوري') &&
                s.title.length > 0 &&
                s.description.length > 0
        ) as AuditorSuggestion[];
}

function validateStrictSources(
    suggestions: AuditorSuggestion[],
    retrievedLawsText: string
): AuditorSuggestion[] {
    if (!retrievedLawsText) return [];
    return suggestions.map((s) => {
        const validSources = (s.source || []).filter((x) => x && x !== 'يحتاج مراجعة يدوية');
        const hasSource = validSources.length > 0;
        const sourceFound = validSources.some((src) => retrievedLawsText.includes(src));
        if (!hasSource || !sourceFound) {
            return {
                ...s,
                source: ['يحتاج مراجعة يدوية'],
                description: `${s.description}\n(ملاحظة تدقيق: لم يتم التحقق من السند حرفياً داخل الحقيبة).`,
            };
        }
        return s;
    });
}

async function callOpenRouterAuditor(
    systemPrompt: string,
    payload: Record<string, unknown>
): Promise<AuditorCallResult> {
    const key = Deno.env.get('OPENROUTER_API_KEY')?.trim();
    if (!key) return { suggestions: [], overloaded: false };
    const retryResult = await callOpenRouterWithRetry({
        apiKey: key,
        models: [
            'qwen/qwen3.6-plus-preview:free',
            'meta-llama/llama-3.1-8b-instruct:free',
            'google/gemma-7b-it:free',
        ],
        title: 'Hami Execution Legal Auditor',
        temperature: 0.1,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(payload) },
        ],
    });
    const text = String(retryResult.text || '').trim();
    if (!text) return { suggestions: [], overloaded: retryResult.overloaded };
    try {
        return {
            suggestions: normalizeAuditorSuggestions(JSON.parse(stripJson(text))),
            overloaded: retryResult.overloaded,
        };
    } catch {
        return { suggestions: [], overloaded: retryResult.overloaded };
    }
}

function runDeadlinesEngine(pack: ReturnType<typeof buildCaseSnapshotPack>): AuditorSuggestion[] {
    const temporal = buildTemporalContext(pack);
    const out: AuditorSuggestion[] = [];
    const hasNotify = Boolean(temporal.notification_date);
    const hasSeize = Boolean(temporal.seizure_date);
    if (hasNotify && hasSeize && temporal.days_from_notification_to_seizure !== null) {
        if (temporal.days_from_notification_to_seizure < 7) {
            out.push({
                type: 'حرج',
                title: 'إجراء حجز قبل انتهاء مهلة التبليغ',
                description:
                    `تم رصد فاصل ${temporal.days_from_notification_to_seizure} يوم/أيام بين التبليغ والحجز. ` +
                    'يجب انتظار 7 أيام قانونية قبل الحجز.',
                source: ['استناداً إلى المادة 25 من قانون التنفيذ'],
            });
        }
    } else if (!hasNotify && hasSeize) {
        out.push({
            type: 'حرج',
            title: 'حجز بدون تبليغ واضح',
            description: 'رُصد إجراء حجز بينما لا يوجد دليل تبليغ واضح في آخر إجراءات الإضبارة.',
            source: ['استناداً إلى المادة 16 من قانون التنفيذ'],
        });
    }
    if ((temporal.days_since_latest_action ?? 0) > 90) {
        out.push({
            type: 'مهم',
            title: 'ركود الإضبارة',
            description: `مر ${temporal.days_since_latest_action} يوماً دون إجراء فعّال حديث. يوصى بتحريك الإضبارة فوراً.`,
            source: ['يحتاج مراجعة يدوية'],
        });
    }
    return out;
}

function buildFinancialBloodhoundSuggestion(pack: ReturnType<typeof buildCaseSnapshotPack>): AuditorSuggestion | null {
    const bag = [
        pack.claim_type || '',
        pack.execution_type || '',
        ...(pack.recent_notes || []),
        ...pack.recent_procedures.map((p) => `${p.title} ${p.source} ${p.type}`),
    ]
        .join(' ')
        .toLowerCase();

    const probes: string[] = [];
    if (/تاجر|سوق|الشورجة|استيراد|شركة/.test(bag)) {
        probes.push('مخاطبة المصارف التجارية في بغداد/الكرخ + مسجل الشركات لكشف الحسابات والذمم التجارية.');
    }
    if (/موظف|راتب|تقاعد|وزارة|دائرة/.test(bag)) {
        probes.push('مخاطبة الدائرة الوظيفية أو هيئة التقاعد للحجز على الراتب/المستحقات وفق النسب القانونية.');
    }
    if (/مقاول|متعهد|مناقصة/.test(bag)) {
        probes.push('مخاطبة الجهات المتعاقدة الحكومية مع المدين وحجز مستحقاته لدى الغير.');
    }
    if (/عقار|دار|شقة|قطعة/.test(bag)) {
        probes.push('مفاتحة التسجيل العقاري ومديرية البلدية للتحقق من الملكيات القابلة للحجز التنفيذي.');
    }
    if (/مركبة|سيارة|عجلة/.test(bag)) {
        probes.push('مفاتحة مديرية المرور لتثبيت المركبات باسم المدين وفرض إشارة الحجز.');
    }
    if (probes.length === 0) {
        return null;
    }
    return {
        type: 'تحري_مالي',
        title: 'تحرٍ مالي مخصص لحالة المدين',
        description: `جهات التحري المقترحة بدقة:\n- ${probes.slice(0, 3).join('\n- ')}`,
        source: ['استناداً إلى قواعد الحجز التنفيذي وحجز ما للمدين لدى الغير'],
    };
}

function buildMockTrialSuggestion(
    pack: ReturnType<typeof buildCaseSnapshotPack>,
    retrievedDecisionsText: string
): AuditorSuggestion | null {
    const hasAppeal = (pack.appeals || []).some((a) => String(a.appealStatus || '').trim().length > 0);
    if (!hasAppeal) return null;
    const latestAppeal = (pack.appeals || []).find((a) => String(a.appealStatus || '').trim().length > 0);
    const pivot = retrievedDecisionsText
        ? 'تعزيز الملف بأحدث مبدأ تمييزي وارد في الحقيبة وربطه مباشرة بتاريخ الطعن.'
        : 'تعزيز الملف بسند قانوني صريح مع طلب حسم الطعن خلال مدة محددة.';
    return {
        type: 'استباقي',
        title: 'استراتيجية مضادة قبل اتساع أثر الطعن',
        description:
            `محاكاة داخلية: الخصم سيدفع باتجاه وقف التنفيذ بسبب (${latestAppeal?.appealStatus || 'طعن قائم'}). ` +
            `الهجوم المضاد: ${pivot} مع مذكرة رد مركزة تُغلق ثغرة الشكل والمدة.`,
        source: retrievedDecisionsText
            ? ['استناداً إلى قرار تمييزي حديث من الحقيبة']
            : ['يحتاج مراجعة يدوية'],
    };
}

function buildImmediateActionDraft(pack: ReturnType<typeof buildCaseSnapshotPack>): AuditorSuggestion | null {
    const hasDebtLikeExecution = /دين|مالي|سند|كمبيالة|حكم/i.test(
        `${pack.execution_type || ''} ${pack.claim_type || ''} ${pack.document_type || ''}`
    );
    if (!hasDebtLikeExecution) return null;
    const draftText = `السيد المنفذ العدل المحترم
م/ طلب حجز أموال المدين لدى الغير

تحية واحتراماً...

أطلب اتخاذ الإجراءات التنفيذية العاجلة بحجز أموال المدين لدى الغير ضمن الإضبارة التنفيذية رقم (${pack.dossier_id})، استناداً إلى السند التنفيذي ونصوص قانون التنفيذ النافذة، وذلك ضماناً لاستيفاء حق الدائن ومنع تهريب الأموال أو التصرف بها بما يضر بحقوق موكلي.

الرجاء إصدار الأوامر اللازمة بمخاطبة الجهات ذات العلاقة لتثبيت ما للمدين من أموال وحقوق لدى الغير ووضع إشارة الحجز عليها أصولياً.

مع التقدير.
مقدم الطلب/ وكيل الدائن`;
    return {
        type: 'إجراء_فوري',
        title: 'إجراء فوري: طلب حجز أموال المدين لدى الغير',
        description:
            'تم توليد نص طلب رسمي جاهز للتقديم إلى دائرة التنفيذ لتفعيل الحجز دون تأخير إجرائي.',
        source: ['استناداً إلى قواعد الحجز التنفيذي وحجز ما للمدين لدى الغير'],
        draftText,
    };
}

function applyCognitiveGuardrails(
    pack: ReturnType<typeof buildCaseSnapshotPack>,
    suggestions: AuditorSuggestion[]
): AuditorSuggestion[] {
    const job = String(pack.debtor_job || '').toLowerCase();
    const isGovEmployee = /موظف|عسكري|منتسب/.test(job);
    const hasGuarantor = Boolean(pack.has_guarantor);
    const remainingDebt = Number(pack.remaining_debt || 0);
    const harshPattern = /حبس|منع السفر|مفاتحة محكمة التحقيق|تزوير/i;
    const realEstatePattern = /عقار|عقارات|غير منقول/i;
    const smallDebtThreshold = 5_000_000;

    return suggestions.map((s) => {
        const text = `${s.title} ${s.description} ${s.draftText || ''}`;
        if (isGovEmployee && harshPattern.test(text)) {
            const draftText = `السيد المنفذ العدل المحترم
م/ طلب حجز راتب المدين الموظف

تحية واحتراماً...

بالنظر لكون المدين موظفاً وفق بيانات الإضبارة، نلتمس إصدار الأمر بمفاتحة دائرته الرسمية لوضع الحجز على راتبه ومستحقاته وفق النسب القانونية، ومتابعة استقطاع الأقساط لحين سداد كامل الدين.

مع التقدير.
مقدم الطلب/ وكيل الدائن`;
            return {
                type: 'إجراء_فوري',
                title: 'تعديل تلقائي: اعتماد حجز الراتب بدل الإجراء القاسي',
                description:
                    'تم استبدال الإجراء المقترح التشددي بمسار قانوني متدرج (حجز الراتب) التزاماً ببروتوكول التدرج التنفيذي ومنع التعسف.',
                source: ['استناداً إلى بروتوكول التدرج التنفيذي ومنع التعسف'],
                draftText,
            };
        }
        if (hasGuarantor && /تحري_مالي|المدين|عقار|استعلام/.test(text)) {
            const draftText = `السيد المنفذ العدل المحترم
م/ طلب توجيه التنفيذ نحو الكفيل الضامن

تحية واحتراماً...

نظراً لوجود كفيل ضامن مثبت في الإضبارة، نلتمس توجيه الإجراءات التنفيذية فوراً بحق الكفيل، بما في ذلك إنذاره وحجز راتبه أو أمواله القابلة للحجز، ضماناً لسرعة الاستيفاء.

مع التقدير.
مقدم الطلب/ وكيل الدائن`;
            return {
                type: 'إجراء_فوري',
                title: 'تعديل تلقائي: توجيه الإجراء إلى الكفيل الضامن',
                description:
                    'تم تحويل المسار من تحرٍ موسع على المدين الأصلي إلى إجراءات مباشرة بحق الكفيل الضامن التزاماً ببروتوكول منع التعسف.',
                source: ['استناداً إلى قيد الكفيل الضامن وبروتوكول التدرج التنفيذي'],
                draftText,
            };
        }
        if (remainingDebt > 0 && remainingDebt <= smallDebtThreshold && realEstatePattern.test(text)) {
            return {
                ...s,
                type: s.type === 'حرج' ? 'مهم' : s.type,
                title: 'تعديل تلقائي: منع القفز إلى حجز العقار',
                description:
                    'تم استبدال اقتراح حجز العقارات بمسار متدرج (النقد ثم الراتب ثم المنقولات) لأن مبلغ الدين المتبقي لا يبرر البدء بغير المنقول.',
                source: ['استناداً إلى بروتوكول التدرج التنفيذي ومنع التعسف'],
                draftText: undefined,
            };
        }
        return s;
    });
}

function applySourceHierarchyGuardrails(
    suggestions: AuditorSuggestion[],
    knowledgeItems: RetrievedKnowledgeItem[]
): AuditorSuggestion[] {
    const topDecision = knowledgeItems.find((k) => k.sourceType === 'قرار تمييزي');
    const topProceduresLaw = knowledgeItems.find((k) => k.sourceType === 'قانون المرافعات المدنية');
    const topExecutionLaw = knowledgeItems.find((k) => k.sourceType === 'قانون التنفيذ');

    return suggestions.map((s) => {
        const text = `${s.title} ${s.description}`;
        let source = [...(s.source || [])];

        if (/تبليغ|إخبار|اخبار|مهلة|مدة/i.test(text) && topProceduresLaw) {
            const ref = `استناداً إلى ${topProceduresLaw.reference} من ${topProceduresLaw.sourceName}`;
            if (!source.some((x) => x.includes(topProceduresLaw.sourceName))) source.push(ref);
        }

        if (/حجز|بيع|مزاد/i.test(text) && topExecutionLaw) {
            source = source.filter((x) => !/القانون المدني/.test(x));
            const ref = `استناداً إلى ${topExecutionLaw.reference} من ${topExecutionLaw.sourceName}`;
            if (!source.some((x) => x.includes(topExecutionLaw.sourceName))) source.push(ref);
        }

        if (/طعن|تمييز|تظلم/i.test(text) && topDecision) {
            const ref = `مقترنة بـ ${topDecision.reference} (${topDecision.sourceName})`;
            if (!source.some((x) => x.includes(topDecision.reference))) source.push(ref);
        }

        return {
            ...s,
            source: source.length ? source : ['يحتاج مراجعة يدوية'],
        };
    });
}

function mapForUi(
    suggestions: AuditorSuggestion[],
    citations: Citation[]
): Array<Record<string, unknown>> {
    const priorityForType = (type: AuditorSuggestion['type']): 'critical' | 'high' | 'medium' => {
        if (type === 'حرج' || type === 'إجراء_فوري') return 'critical';
        if (type === 'مهم' || type === 'استباقي' || type === 'تحري_مالي') return 'high';
        return 'medium';
    };
    return suggestions.map((s) => ({
        type: s.type,
        title: s.title,
        description: s.description,
        source: s.source,
        rationale: s.description,
        priority: priorityForType(s.type),
        draftText: s.draftText,
        citations: citations.slice(0, 2),
    }));
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        if (req.method === 'GET') {
            const official = await fetchOfficialSignals();
            const ready = {
                hasSupabase: Boolean(
                    Deno.env.get('SUPABASE_URL') && Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
                ),
                hasOpenRouter: Boolean(Deno.env.get('OPENROUTER_API_KEY')),
                hasGeminiEmbedding: Boolean(getGeminiApiKey()),
                officialSourcesReachable: official.length,
                fallbackModels: {
                    auditor: [
                        'qwen/qwen3.6-plus-preview:free',
                        'meta-llama/llama-3.1-8b-instruct:free',
                        'google/gemma-7b-it:free',
                    ],
                    spellchecker: [
                        'google/gemma-2-9b-it:free',
                        'google/gemma-7b-it:free',
                        'meta-llama/llama-3.1-8b-instruct:free',
                    ],
                },
            };
            return jsonResponse({ ok: true, ready, sources: official }, 200);
        }

        if (req.method !== 'POST') {
            return jsonResponse({ error: 'Method not allowed' }, 405);
        }

        const body = await req.json();
        const snapshot = body?.snapshot as CaseSnapshot | undefined;
        if (!snapshot?.executionId) {
            return jsonResponse({ error: 'snapshot.executionId is required' }, 400);
        }

        const currentDate = new Date().toISOString();
        const casePack = buildCaseSnapshotPack(snapshot, currentDate);
        const [strictRagLaws, strictRagDecisions] = await Promise.all([
            retrieveLawsStrict(casePack),
            retrieveDecisionsStrict(casePack),
        ]);
        const retrievedLawsText = buildRetrievedLawsText(strictRagLaws.rows);
        const retrievedDecisionsText = buildRetrievedDecisionsText(strictRagDecisions.rows);
        const lawKnowledgeItems = buildKnowledgeItemsFromLaws(strictRagLaws.rows);
        const decisionKnowledgeItems = buildKnowledgeItemsFromDecisions(strictRagDecisions.rows);
        const knowledgeItems = [...lawKnowledgeItems, ...decisionKnowledgeItems];
        const mergedStrictContext = [
            retrievedLawsText ? `نصوص القوانين:\n${retrievedLawsText}` : '',
            retrievedDecisionsText ? `القرارات التمييزية:\n${retrievedDecisionsText}` : '',
        ]
            .filter(Boolean)
            .join('\n\n====================\n\n');
        const steelPromptBase = buildSteelPrompt(
            currentDate,
            mergedStrictContext || 'لا توجد نصوص مسترجعة'
        );
        const steelPrompt = injectAdaptivePrompt(
            steelPromptBase,
            String(casePack.execution_type || ''),
            String(casePack.document_type || ''),
            String(casePack.debtor_job || ''),
            Boolean(casePack.has_guarantor),
            Number(casePack.remaining_debt || 0)
        );
        const [officialCitations, spellingIssues] = await Promise.all([
            fetchOfficialSignals(),
            runLegalSpellchecker(casePack.recent_procedures[0]?.title || ''),
        ]);

        const deadlineSuggestions = runDeadlinesEngine(casePack);
        const llmAudit = mergedStrictContext
            ? await callOpenRouterAuditor(steelPrompt, {
                  current_date: currentDate,
                  retrieved_laws: retrievedLawsText,
                  retrieved_decisions: retrievedDecisionsText,
                  knowledge_items: knowledgeItems,
                  case_snapshot: casePack,
              })
            : { suggestions: [], overloaded: false };
        const validated = validateStrictSources(llmAudit.suggestions, mergedStrictContext);
        const spellSuggestions: AuditorSuggestion[] = spellingIssues.map((i) => ({
            type: 'تحسيني',
            title: `تنبيه صياغة: ${i.wrong}`,
            description: `الصياغة المقترحة: ${i.correct}. ${i.note}`,
            source: ['مراجعة لغوية قانونية'],
        }));
        const bloodhoundSuggestion = buildFinancialBloodhoundSuggestion(casePack);
        const mockTrialSuggestion = buildMockTrialSuggestion(casePack, retrievedDecisionsText);
        const immediateActionSuggestion = buildImmediateActionDraft(casePack);

        const mergedStrict = [
            ...spellSuggestions,
            ...deadlineSuggestions,
            ...(bloodhoundSuggestion ? [bloodhoundSuggestion] : []),
            ...(mockTrialSuggestion ? [mockTrialSuggestion] : []),
            ...(immediateActionSuggestion ? [immediateActionSuggestion] : []),
            ...validated,
        ];
        const guardedSuggestions = applyCognitiveGuardrails(casePack, mergedStrict);
        const hierarchyVerifiedSuggestions = applySourceHierarchyGuardrails(
            guardedSuggestions,
            knowledgeItems
        );
        const strictFinal =
            hierarchyVerifiedSuggestions.length > 0
                ? hierarchyVerifiedSuggestions
                : [
                      {
                          type: 'مهم',
                          title: 'يحتاج مراجعة يدوية',
                          description:
                              'تعذر استرجاع نصوص قانونية كافية أو لم يتم التحقق من مصدر قانوني واضح لهذه الحالة.',
                          source: ['يحتاج مراجعة يدوية'],
                      },
                  ];
        const overloadFallback: AuditorSuggestion[] = llmAudit.overloaded && llmAudit.suggestions.length === 0
            ? [
                  {
                      type: 'حرج',
                      title: 'السيرفر مشغول',
                      description:
                          'مزود الذكاء الاصطناعي يعاني من ضغط حالياً (خطأ 546). يرجى المحاولة بعد قليل.',
                      source: ['Fallback: OpenRouter 546/429'],
                  },
              ]
            : [];
        const strictFinalWithOverload = [...overloadFallback, ...strictFinal];

        const citations: Citation[] = [
            ...officialCitations,
            ...strictRagLaws.rows.slice(0, 3).map((r, idx) => ({
                title: `${r.law_name || 'قانون عراقي'} - المادة ${r.article_number || idx + 1}`,
                url: 'rag://iraqi_laws',
                source: 'rag' as const,
                publishedAt: currentDate,
                excerpt: String(r.content || '').slice(0, 220),
            })),
            ...strictRagDecisions.rows.slice(0, 3).map((d, idx) => ({
                title: `قرار تمييزي ${d.decision_number || idx + 1} - ${d.decision_date || ''}`,
                url: 'rag://cassation_decisions',
                source: 'rag' as const,
                publishedAt: currentDate,
                excerpt: String(d.legal_principle || d.full_text || '').slice(0, 220),
            })),
        ];

        const result = {
            summary:
                'تم تشغيل execution-copilot بوضع الوكيل القانوني الصارم: Snapshot حي + تدقيق لغوي + Strict RAG + محرك مدد.',
            confidence: retrievedLawsText ? 0.88 : 0.63,
            generatedAt: currentDate,
            alerts: [],
            risks: [],
            deadlines: (snapshot.tasks || []).slice(0, 5).map((t) => ({
                label: t.title || 'مهمة',
                dueDate: t.dueDate || '',
            })),
            nextActions: [],
            suggestions: mapForUi(strictFinalWithOverload, citations),
            citations,
            strictRag: {
                keywords: Array.from(
                    new Set([...(strictRagLaws.keywords || []), ...(strictRagDecisions.keywords || [])])
                ),
                retrieved_laws_count: strictRagLaws.rows.length,
                retrieved_decisions_count: strictRagDecisions.rows.length,
                retrieved_laws: retrievedLawsText,
                retrieved_decisions: retrievedDecisionsText,
                knowledge_items: knowledgeItems,
            },
            caseSnapshotPack: casePack,
        };

        return jsonResponse(result, 200);
    } catch (error: any) {
        return new Response(
            JSON.stringify({
                suggestions: [
                    {
                        type: 'حرج',
                        title: 'الخادم مشغول (تحديث تلقائي)',
                        description:
                            'نظام الذكاء الاصطناعي يواجه ضغطاً حالياً (الخطأ: ' +
                            String(error?.message || 'Unknown error') +
                            '). سيتم إعادة المحاولة تلقائياً.',
                    },
                ],
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
