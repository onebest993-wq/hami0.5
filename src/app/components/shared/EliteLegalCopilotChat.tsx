/**
 * Elite Legal AI Co-Pilot — موحّد عبر gemini-chat.
 */
import React, { useCallback, useId, useRef, useState } from 'react';
import { Loader2, MessageCircle, Send, Sparkles, User } from 'lucide-react';
import { supabase } from '@/app/lib/supabase-client';

type UiMessage =
    | { id: string; role: 'user'; text: string }
    | { id: string; role: 'model'; text: string };

function uid(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type EliteLegalCopilotChatProps = {
    appState: {
        role?: string;
        activeCase?: {
            stage?: string;
        };
    };
    className?: string;
};

export function EliteLegalCopilotChat({ appState, className = '' }: EliteLegalCopilotChatProps) {
    const formId = useId();
    const stateRef = useRef(appState);
    stateRef.current = appState;
    const [messages, setMessages] = useState<UiMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const handleReset = useCallback(() => {
        setMessages([]);
    }, []);

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const text = input.trim();
            if (!text || loading) return;

            setInput('');
            setMessages((m) => [...m, { id: uid(), role: 'user', text }]);
            setLoading(true);

            try {
                const history = messages.map((m) => ({
                    role: m.role,
                    content: m.text,
                }));
                const { data, error } = await supabase.functions.invoke<{ text?: string; error?: string }>(
                    'gemini-chat',
                    { body: { prompt: text, messages: history } },
                );
                if (error) throw new Error(error.message || 'تعذر الاتصال ببوابة الذكاء.');
                if (!data) throw new Error('لم تُرجع البوابة أي استجابة.');
                if (typeof data.error === 'string' && data.error.trim()) throw new Error(data.error);
                setMessages((m) => [
                    ...m,
                    { id: uid(), role: 'model', text: data.text || 'تعذر توليد رد.' },
                ]);
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                setMessages((m) => [
                    ...m,
                    { id: uid(), role: 'model', text: `خطأ: ${msg}` },
                ]);
            } finally {
                setLoading(false);
            }
        },
        [input, loading],
    );

    return (
        <div
            className={`flex flex-col max-w-md mx-auto h-[min(640px,85vh)] rounded-3xl border border-[#D4AF37]/25 bg-gradient-to-b from-[#0a0f1c] to-[#05060d] overflow-hidden shadow-xl ${className}`}
            dir="rtl"
        >
            <header className="shrink-0 px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 flex items-center justify-center border border-[#D4AF37]/30 shrink-0">
                        <Sparkles className="w-4 h-4 text-[#E6C673]" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-sm font-bold text-white truncate">مساعد حامي القانوني</h2>
                        <p className="text-[10px] text-white/40 truncate">
                            سياق: {appState.role === 'lawyer' ? 'محامٍ' : 'موكل'}
                            {appState.activeCase?.stage ? ` · ${appState.activeCase.stage}` : ''}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleReset}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg border border-white/15 text-white/60 hover:bg-white/5"
                >
                    محادثة جديدة
                </button>
            </header>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                {messages.length === 0 && (
                    <p className="text-center text-white/35 text-xs py-8 px-4">
                        اطرح سؤالاً قانونياً عراقياً.
                    </p>
                )}
                {messages.map((msg) =>
                    msg.role === 'user' ? (
                        <div key={msg.id} className="flex gap-2 justify-end">
                            <div className="max-w-[88%] rounded-2xl rounded-br-md bg-[#D4AF37]/20 border border-[#D4AF37]/25 px-3 py-2">
                                <p className="text-xs text-white/90 whitespace-pre-wrap">{msg.text}</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-white/60" />
                            </div>
                        </div>
                    ) : (
                        <div key={msg.id} className="flex gap-2 justify-start">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/15 flex items-center justify-center shrink-0 border border-indigo-500/25">
                                <MessageCircle className="w-4 h-4 text-indigo-300" />
                            </div>
                            <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-white/5 border border-white/10 px-3 py-2">
                                <p className="text-xs text-white/85 whitespace-pre-wrap leading-relaxed">
                                    {msg.text}
                                </p>
                            </div>
                        </div>
                    ),
                )}
                {loading && (
                    <div className="flex items-center gap-2 text-white/40 text-xs px-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        جاري التفكير...
                    </div>
                )}
            </div>

            <form
                id={formId}
                onSubmit={handleSubmit}
                className="shrink-0 p-3 border-t border-white/10 bg-[#05060d]/80 backdrop-blur-sm flex gap-2"
            >
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="اكتب رسالتك..."
                    disabled={loading}
                    className="flex-1 h-11 rounded-xl bg-[#0d1220] border border-white/10 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/35 disabled:opacity-50"
                />
                <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#C9A227] to-[#E6C673] text-[#0a0f1c] flex items-center justify-center disabled:opacity-40"
                    aria-label="إرسال"
                >
                    <Send className="w-5 h-5" />
                </button>
            </form>
        </div>
    );
}
