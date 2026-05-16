/**
 * خدمة تحليل قصة الموكل عبر Edge Function `analyze-case` (Google Gemini على الخادم).
 */
import { FunctionsHttpError } from '@supabase/functions-js';
import { supabase } from '@/app/lib/supabase-client';

export type ClientStorySuggestedAction = {
    id: string;
    label: string;
};

export type ClientStoryRetrievedChunk = {
    law_name?: string | null;
    article_number?: string | null;
    content?: string | null;
    similarity?: number | null;
};

export type ClientStoryAnalysis = {
    title: string;
    category: string;
    reply: string;
    summary: string[];
    actions: ClientStorySuggestedAction[];
    isDocument: boolean;
    isFallback?: boolean;
    retrievedChunks?: ClientStoryRetrievedChunk[];
};

type InvokePayload = ClientStoryAnalysis & {
    error?: string;
    raw?: string;
    rag?: {
        retrievedChunks?: unknown;
    };
};

function formatInvokeError(err: unknown): string {
    if (err && typeof err === 'object' && 'message' in err) {
        return String((err as { message: unknown }).message);
    }
    return String(err);
}

async function errorBodyFromHttpError(err: FunctionsHttpError): Promise<string | null> {
    const res = err.context;
    if (!(res instanceof Response)) return null;
    try {
        const body = (await res.clone().json()) as { error?: unknown };
        if (typeof body.error === 'string' && body.error.trim()) {
            return body.error;
        }
    } catch {
        /* ليس JSON */
    }
    return null;
}

function parseActionsFromPayload(raw: unknown): ClientStorySuggestedAction[] | null {
    if (!Array.isArray(raw) || raw.length < 1) return null;
    const out: ClientStorySuggestedAction[] = [];
    for (let i = 0; i < raw.length && out.length < 12; i++) {
        const item = raw[i];
        if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
        const o = item as Record<string, unknown>;
        const label = typeof o.label === 'string' ? o.label.trim() : '';
        if (!label) continue;
        const idRaw = typeof o.id === 'string' ? o.id.trim() : '';
        const id = idRaw || `action_${out.length + 1}`;
        out.push({ id, label });
    }
    return out.length >= 1 ? out : null;
}

/**
 * يرسل نص القصة إلى دالة `analyze-case` ويعيد الحقول المستخرجة.
 */
export async function analyzeClientStory(story: string): Promise<ClientStoryAnalysis> {
    const trimmed = story.trim();
    if (!trimmed) {
        throw new Error('يرجى كتابة قصة الموكل قبل التحليل.');
    }
    if (trimmed.length < 24) {
        throw new Error(
            'النص قصير جداً لتحليل مفيد. أضف: الأطراف، نوع النزاع، وما تريد تحقيقه قانونياً.',
        );
    }

    const { data, error: fnError } = await supabase.functions.invoke<InvokePayload>(
        'analyze-case',
        {
            body: { story: trimmed },
        },
    );

    if (fnError) {
        if (fnError instanceof FunctionsHttpError) {
            const fromBody = await errorBodyFromHttpError(fnError);
            if (fromBody) throw new Error(fromBody);
        }
        throw new Error(
            formatInvokeError(fnError) ||
                'فشل الاتصال بدالة analyze-case (تحقق من النشر والشبكة).',
        );
    }

    if (!data) {
        throw new Error('لم يُرجَع أي محتوى من الدالة.');
    }

    if (typeof data.error === 'string' && data.error.trim()) {
        throw new Error(data.error);
    }

    const { title, category, reply, summary } = data;
    if (typeof title !== 'string' || typeof category !== 'string' || typeof reply !== 'string') {
        throw new Error('استجابة غير متوقعة من الخادم.');
    }

    if (!Array.isArray(summary) || summary.length < 2 || summary.length > 3) {
        throw new Error('استجابة غير متوقعة من الخادم (summary).');
    }
    const cleanSummary = summary.map((s) => (typeof s === 'string' ? s.trim() : '')).filter(Boolean);
    if (cleanSummary.length < 2 || cleanSummary.length > 3) {
        throw new Error('استجابة غير متوقعة من الخادم (summary).');
    }

    const actions = parseActionsFromPayload(data.actions);
    if (!actions) {
        throw new Error('استجابة غير متوقعة من الخادم (actions).');
    }

    const isDocument = typeof data.isDocument === 'boolean' ? data.isDocument : false;
    const isFallback = typeof data.isFallback === 'boolean' ? data.isFallback : false;
    const rawChunks = Array.isArray(data.rag?.retrievedChunks)
        ? data.rag?.retrievedChunks
        : [];
    const retrievedChunks: ClientStoryRetrievedChunk[] = rawChunks
        .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x))
        .map((x) => ({
            law_name: typeof x.law_name === 'string' ? x.law_name : null,
            article_number: typeof x.article_number === 'string' ? x.article_number : null,
            content: typeof x.content === 'string' ? x.content : null,
            similarity: typeof x.similarity === 'number' ? x.similarity : null,
        }));

    return {
        title: title.trim(),
        category: category.trim(),
        reply: reply.trim(),
        summary: cleanSummary,
        actions,
        isDocument,
        isFallback,
        retrievedChunks,
    };
}
