import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Scale } from 'lucide-react';
import type { HubChatMessage } from './types';
import { MessageBubble } from './MessageBubble';

interface ChatAreaProps {
    messages: HubChatMessage[];
    isLoading: boolean;
    loadingFrame: number;
    onCopy: (text: string) => void;
    onShare: (text: string) => void;
    onActionClick: (actionId: string, label: string) => void;
}

const LoadingDots = ({ loadingFrame }: { loadingFrame: number }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-start"
    >
        <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-md p-4 text-sm max-w-[90%]">
            <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                    <motion.span
                        key={i}
                        className="w-2 h-2 bg-amber-400/70 rounded-full"
                        animate={{ opacity: loadingFrame % 3 === i ? 1 : 0.3 }}
                        transition={{ duration: 0.3 }}
                    />
                ))}
            </div>
        </div>
    </motion.div>
);

export const ChatArea = ({ messages, isLoading, loadingFrame, onCopy, onShare, onActionClick }: ChatAreaProps) => {
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    return (
        <div className="flex-1 overflow-y-auto p-4 md:px-12 space-y-5 scroll-smooth scrollbar-hide bg-gradient-to-b from-[#0F172A] to-[#0B1021]">
            <div className="text-center my-8">
                <Scale className="inline-block text-amber-400/20 mb-2" size={40} />
                <p className="text-white/30 text-sm font-medium">اسأل المستشار الذكي عن أي استفسار قانوني</p>
                <p className="text-white/20 text-[11px] mt-1">نظام RAG متصل بقانون المرافعات والقوانين العراقية</p>
            </div>

            <AnimatePresence>
                {messages.map((msg: HubChatMessage) => (
                    <MessageBubble key={msg.id} msg={msg} onCopy={onCopy} onShare={onShare} onActionClick={onActionClick} />
                ))}
            </AnimatePresence>

            {isLoading && <LoadingDots loadingFrame={loadingFrame} />}

            <div ref={chatEndRef} />
        </div>
    );
};
