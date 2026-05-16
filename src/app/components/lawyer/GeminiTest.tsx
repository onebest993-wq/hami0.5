import React, { useCallback, useState } from 'react';
import { FunctionsHttpError } from '@supabase/functions-js';
import { supabase } from '@/app/lib/supabase-client';
import { AlertTriangle } from 'lucide-react';

type RetrievedChunk = {
    law_name?: string | null;
    article_number?: string | null;
    content?: string | null;
    similarity?: number | null;
};

type GeminiChatSuccess = {
    text: string;
    model?: string;
    isFallback?: boolean;
    rag?: {
        rpc?: string;
        matchCount?: number;
        retrievedChunks?: RetrievedChunk[];
        fallbackReason?: string;
    };
};
type GeminiChatErrorBody = { error?: string };

function formatInvokeError(err: unknown): string {
    if (err && typeof err === "object" && "message" in err) {
        return String((err as { message: unknown }).message);
    }
    return String(err);
}

async function errorBodyFromHttpError(
    err: FunctionsHttpError,
): Promise<string | null> {
    const res = err.context;
    if (!(res instanceof Response)) return null;
    try {
        const body = (await res.clone().json()) as { error?: unknown };
        if (typeof body.error === "string" && body.error.trim()) {
            return body.error;
        }
    } catch {
        /* ليس JSON */
    }
    return null;
}

/**
 * اختبار Gemini عبر دالة Supabase Edge `gemini-chat` (المفتاح على الخادم فقط).
 * انشر الدالة وعيّن Secret: GEMINI_API_KEY
 */
export function GeminiTest() {
    const [prompt, setPrompt] = useState('');
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastModel, setLastModel] = useState<string | null>(null);
    const [isFallback, setIsFallback] = useState(false);
    const [retrievedChunks, setRetrievedChunks] = useState<RetrievedChunk[]>([]);

    const handleSubmit = useCallback(async () => {
        const trimmed = prompt.trim();
        if (!trimmed) return;

        setError(null);
        setAnswer('');
        setLoading(true);
        setLastModel(null);
        setIsFallback(false);
        setRetrievedChunks([]);

        try {
            const { data, error: fnError } = await supabase.functions.invoke<
                GeminiChatSuccess & GeminiChatErrorBody
            >("gemini-chat", {
                body: { prompt: trimmed },
            });

            if (fnError) {
                if (fnError instanceof FunctionsHttpError) {
                    const fromBody = await errorBodyFromHttpError(fnError);
                    if (fromBody) {
                        setError(fromBody);
                        return;
                    }
                }
                setError(
                    formatInvokeError(fnError) ||
                        "فشل الاتصال بدالة gemini-chat (تحقق من النشر والشبكة).",
                );
                return;
            }

            if (!data) {
                setError("لم يُرجَع أي محتوى من الدالة.");
                return;
            }

            if (typeof data.error === "string" && data.error.trim()) {
                setError(data.error);
                return;
            }

            if (typeof data.text === "string") {
                setAnswer(data.text);
                setLastModel(
                    typeof data.model === "string" ? data.model : null,
                );
                const chunks = Array.isArray(data.rag?.retrievedChunks)
                    ? data.rag?.retrievedChunks.filter((c) =>
                        c && typeof c === 'object'
                    )
                    : [];
                setRetrievedChunks(chunks);

                const fallbackByFlag = data.isFallback === true;
                const fallbackByModel = data.model === 'fallback-template';
                const fallbackByPrefix = data.text.startsWith('عذراً، المستشار الذكي يواجه ضغطاً');
                setIsFallback(fallbackByFlag || fallbackByModel || fallbackByPrefix);
                return;
            }

            setError("استجابة غير متوقعة من الخادم.");
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "خطأ غير متوقع أثناء الطلب.",
            );
        } finally {
            setLoading(false);
        }
    }, [prompt]);

    return (
        <div
            className="w-full rounded-2xl border border-cyan-500/35 bg-slate-950/90 p-4 shadow-[0_0_24px_rgba(6,182,212,0.12)] backdrop-blur-md"
            dir="rtl"
        >
            <h2 className="mb-3 text-center text-lg font-bold text-cyan-100">
                المساعد القانوني الذكي
            </h2>

            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="اكتب سؤالك القانوني هنا للتجربة..."
                rows={4}
                className="mb-3 w-full resize-y rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
                disabled={loading}
            />

            <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !prompt.trim()}
                className="mb-3 w-full rounded-xl bg-gradient-to-r from-cyan-700 to-blue-800 py-2.5 text-sm font-bold text-white shadow-md transition-opacity disabled:cursor-not-allowed disabled:opacity-45 hover:from-cyan-600 hover:to-blue-700"
            >
                {loading ? 'جاري التفكير...' : 'إرسال السؤال'}
            </button>

            {error ? (
                <div
                    className="mb-2 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-right text-sm text-rose-100"
                    role="alert"
                >
                    {error}
                </div>
            ) : null}

            {lastModel ? (
                <p className="mb-2 text-center text-[10px] text-slate-500">
                    النموذج المستخدم: {lastModel}
                </p>
            ) : null}

            {isFallback ? (
                <div className="mb-3 rounded-xl border border-yellow-700/50 bg-yellow-900/20 px-3 py-2 text-right text-sm text-yellow-100">
                    <div className="mb-1 flex items-center justify-end gap-2 font-semibold">
                        <span>وضع الطوارئ (استرجاع نصوص مباشرة)</span>
                        <AlertTriangle size={16} className="text-yellow-300" />
                    </div>
                    <p className="text-xs text-yellow-200/90">
                        تم عرض النصوص القانونية المسترجعة من قاعدة البيانات بدل التحليل الكامل بسبب ضغط مؤقت على خدمة التوليد.
                    </p>
                </div>
            ) : null}

            <div className="min-h-[3rem] rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2 text-right text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
                {loading && !answer ? (
                    <span className="text-slate-400">جاري التفكير...</span>
                ) : answer ? (
                    answer
                ) : (
                    <span className="text-slate-500">ستظهر إجابة النموذج هنا.</span>
                )}
            </div>

            {isFallback && retrievedChunks.length > 0 ? (
                <div className="mt-3 space-y-2">
                    {retrievedChunks.slice(0, 3).map((chunk, idx) => (
                        <div
                            key={`${chunk.law_name ?? 'law'}-${chunk.article_number ?? idx}-${idx}`}
                            className="rounded-xl border border-[#E6C673]/30 bg-[#0A0F1C] p-3"
                        >
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <span className="rounded-md border border-[#E6C673]/45 bg-[#E6C673]/10 px-2 py-0.5 text-[11px] font-bold text-[#E6C673]">
                                    {chunk.article_number || `مادة ${idx + 1}`}
                                </span>
                                <span className="text-[11px] text-white/60">
                                    {chunk.law_name || 'قانون غير محدد'}
                                </span>
                            </div>
                            <p className="text-sm leading-relaxed text-white/85 whitespace-pre-wrap">
                                {chunk.content || 'لا يوجد نص مسترجع.'}
                            </p>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
