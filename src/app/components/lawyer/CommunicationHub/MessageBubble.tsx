import React from 'react';
import { motion } from 'motion/react';
import { Copy, Share2, FileText, Sparkles, Scale, ChevronDown } from '@/app/components/ui/lucideIcons';
import type { HubChatMessage } from './types';
import { renderText } from './utils';

interface MessageBubbleProps {
    msg: HubChatMessage;
    onCopy: (text: string) => void;
    onShare: (text: string) => void;
    onActionClick: (actionId: string, label: string) => void;
}

export const MessageBubble = ({ msg, onCopy, onShare, onActionClick }: MessageBubbleProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
            <div className={`flex flex-col max-w-[90%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap relative shadow-md ${
                    msg.role === 'user'
                        ? 'bg-[#1E3A8A] text-white rounded-br-md border border-blue-400/20'
                        : (
                            msg.isDocument
                                ? 'bg-[#F8FAFC] text-slate-800 border-2 border-[#E6C673] rounded-bl-md font-serif shadow-xl'
                                : 'bg-[#F9FAFB] border border-slate-300 text-slate-800 rounded-bl-md shadow-lg'
                        )
                }`}>
                    {msg.isDocument && (
                        <div className="absolute -top-3 left-4 bg-[#E6C673] text-[#0B1021] text-[9px] font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                            <FileText size={10} /> مسودة عريضة
                        </div>
                    )}
                    {renderText(msg.content)}
                </div>

                {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {msg.sources.map((src: string, i: number) => (
                            <div key={i} className="flex items-center gap-1 bg-[#1A1E2E] border border-[#E6C673]/40 px-3 py-1 rounded-full text-[10px] text-[#E6C673]">
                                <Scale size={10} />
                                <span>{src}</span>
                            </div>
                        ))}
                    </div>
                )}

                {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-3 flex gap-2">
                        {msg.actions.map((action) => (
                            <button type="button"
                                key={action.id}
                                onClick={() => onActionClick(action.id, action.label || action.id)}
                                className="px-4 py-2 bg-[#E6C673] text-[#0B1021] text-xs font-bold rounded-lg shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
                            >
                                <Sparkles size={14} />
                                {action.label}
                            </button>
                        ))}
                    </div>
                )}

                {msg.role === 'model' && (
                    <>
                        <div className="mt-2 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => onCopy(msg.content)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-300 text-slate-700 text-[11px] hover:bg-slate-100 transition-colors"
                            >
                                <Copy size={12} />
                                نسخ
                            </button>
                            <button
                                type="button"
                                onClick={() => onShare(msg.content)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-300 text-slate-700 text-[11px] hover:bg-slate-100 transition-colors"
                            >
                                <Share2 size={12} />
                                مشاركة
                            </button>
                        </div>
                        {msg.retrievedChunks && msg.retrievedChunks.length > 0 && (
                            <details className="mt-2 w-full rounded-xl border border-[#E6C673]/30 bg-gradient-to-br from-[#0F172A] to-[#111827] overflow-hidden group">
                                <summary className="list-none cursor-pointer select-none px-3 py-2 flex items-center justify-between text-[#E6C673] text-xs font-semibold hover:bg-white/5 transition-colors">
                                    <span className="flex items-center gap-1.5">⚖️ المصادر القانونية المعتمدة</span>
                                    <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
                                </summary>
                                <div className="border-t border-[#E6C673]/20 px-3 py-2 space-y-2 max-h-64 overflow-y-auto">
                                    {msg.retrievedChunks.map((chunk, idx) => (
                                        <div key={`${msg.id}-source-${idx}`} className="rounded-lg border border-white/10 bg-[#0B1220]/80 p-2.5">
                                            <div className="text-[11px] text-[#E6C673] mb-1">
                                                {(chunk.law_name || 'قانون غير محدد')} — {(chunk.article_number || 'مادة غير محددة')}
                                            </div>
                                            <div className="text-[12px] leading-6 text-gray-300 whitespace-pre-wrap">
                                                {chunk.content}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        )}
                        <span className="text-[10px] text-white/40 mt-1 flex items-center gap-1">
                            <Sparkles size={8} /> {msg.isDemo ? 'المستشار الذكي (محاكاة)' : (msg.isFallback ? 'حامي (وضع طوارئ)' : 'حامي')}
                        </span>
                    </>
                )}
            </div>
        </motion.div>
    );
};
