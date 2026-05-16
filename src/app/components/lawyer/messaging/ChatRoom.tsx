import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Phone, Video, Mic, Paperclip, Send, Gavel, FileText, Sparkles, Check, ChevronLeft, MoreVertical } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';

interface Message {
    id: string;
    sender: 'user' | 'lawyer' | 'system';
    text?: string;
    type: 'text' | 'audio' | 'system_bubble';
    time: string;
    isGhost?: boolean; // For Ghost UI elements
    ghostData?: {
        summary: string;
        actionLabel: string;
        actionType: string;
    };
}

const MOCK_CHAT_HISTORY: Message[] = [
    {
        id: '1',
        sender: 'system',
        type: 'system_bubble',
        text: 'رسالة آلية: الأستاذ حالياً في المرافعة، سيتم الرد لاحقاً',
        time: '09:00 ص'
    },
    {
        id: '2',
        sender: 'user',
        type: 'text',
        text: 'صباح الخير أستاذ، بخصوص جلسة اليوم..',
        time: '09:15 ص'
    },
    {
        id: '3',
        sender: 'lawyer',
        type: 'text',
        text: 'صباح النور، تفضل أنا أسمعك.',
        time: '09:30 ص'
    },
    {
        id: '4',
        sender: 'user',
        type: 'audio',
        time: '09:32 ص',
        isGhost: true,
        ghostData: {
            summary: 'ملخص: الموكل يشتكي من طرد الزوجة ويطلب التدخل العاجل لضمان حق المشاهدة.',
            actionLabel: 'تجهيز عريضة',
            actionType: 'draft_petition'
        }
    }
];

// رقم الموكل (مثال - في التطبيق الحقيقي يأتي من قاعدة البيانات)
const CLIENT_PHONE = '9647701234567';

interface ChatRoomProps {
    chatId: string;
    onBack: () => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ chatId, onBack }) => {
    const [messages, setMessages] = useState<Message[]>(MOCK_CHAT_HISTORY);
    const [inputValue, setInputValue] = useState('');
    const [hearingMode, setHearingMode] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    // 1. وظيفة الاتصال المباشر
    const handleCall = () => {
        window.open(`tel:${CLIENT_PHONE}`, '_self');
    };

    // 2. وظيفة الإرسال عبر واتساب
    const handleWhatsAppSend = () => {
        if (!inputValue.trim()) return;
        
        // تشفير النص للرابط
        const encodedText = encodeURIComponent(inputValue);
        const url = `https://wa.me/${CLIENT_PHONE}?text=${encodedText}`;
        
        // فتح واتساب
        window.open(url, '_blank');
        
        // تفريغ الحقل دون حفظ الرسالة داخلياً
        setInputValue('');
        // toast.success("جاري التحويل إلى واتساب...");
    };

    // 3. وظيفة المرفقات والصوت (فتح واتساب فقط)
    const handleWhatsAppOpen = () => {
        const url = `https://wa.me/${CLIENT_PHONE}`;
        window.open(url, '_blank');
        // toast.info("استخدم واتساب لإرسال الصور والصوتيات");
    };

    const handleGhostAction = (action: string) => {
        if (action === 'draft_petition') {
            SmartToast.success("✨ جاري توجيه الذكاء الاصطناعي لتجهيز مسودة العريضة...");
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#0B1021] flex flex-col animate-in slide-in-from-left duration-300">
            {/* Top Bar */}
            <div className="h-24 bg-[#151825]/90 backdrop-blur-md border-b border-white/10 flex items-end pb-4 px-6 justify-between sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <button type="button" onClick={onBack} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors">
                        <ArrowRight size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <img 
                                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100&h=100" 
                                className="w-10 h-10 rounded-full border border-white/20"
                            />
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#151825]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-white font-bold text-lg leading-none mb-1">أحمد العلي</h3>
                                {/* زر الاتصال الجديد بجانب الاسم */}
                                <button type="button" 
                                    onClick={handleCall}
                                    className="w-8 h-8 rounded-full bg-[#E6C673]/10 text-[#E6C673] flex items-center justify-center hover:bg-[#E6C673]/20 transition-colors"
                                    title="اتصال هاتفي"
                                >
                                    <Phone size={16} />
                                </button>
                            </div>
                            <p className="text-white/40 text-xs">متصل الآن</p>
                        </div>
                    </div>
                </div>

                {/* Hearing Mode Toggle */}
                <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold transition-colors ${hearingMode ? 'text-[#E6C673]' : 'text-white/30'}`}>
                        وضع المرافعة 🏛️
                    </span>
                    <button type="button" 
                        onClick={() => setHearingMode(!hearingMode)}
                        className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${hearingMode ? 'bg-[#E6C673]' : 'bg-white/10'}`}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${hearingMode ? '-translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>
            </div>

            {/* Messages Area - للعرض فقط (Mock) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24 bg-[#0B1021]">
                {messages.map((msg) => {
                    if (msg.type === 'system_bubble') {
                        return (
                            <div key={msg.id} className="flex justify-center my-4">
                                <div className="bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-2 rounded-full text-xs text-white/50 italic flex items-center gap-2">
                                    <Sparkles size={12} className="text-[#E6C673]" />
                                    {msg.text}
                                </div>
                            </div>
                        );
                    }

                    const isMe = msg.sender === 'lawyer';

                    return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-start' : 'items-end'}`}>
                            {/* Message Bubble */}
                            <div className={`max-w-[80%] px-5 py-3 rounded-2xl text-sm leading-relaxed relative group ${
                                isMe 
                                    ? 'bg-[#E6C673] text-[#0B1021] rounded-tr-none' 
                                    : 'bg-[#1A1E2E] text-white border border-white/10 rounded-tl-none'
                            }`}>
                                {msg.type === 'audio' ? (
                                    <div className="flex items-center gap-3 min-w-[150px]">
                                        <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center">
                                            <Mic size={16} />
                                        </div>
                                        <div className="h-1 flex-1 bg-black/10 rounded-full overflow-hidden">
                                            <div className="w-1/3 h-full bg-current opacity-50" />
                                        </div>
                                        <span className="text-xs opacity-70 font-mono">0:42</span>
                                    </div>
                                ) : (
                                    msg.text
                                )}

                                {/* Timestamp */}
                                <div className={`text-[9px] mt-1 opacity-50 flex items-center gap-1 ${isMe ? 'justify-start' : 'justify-end'}`}>
                                    {msg.time}
                                    {isMe && <Check size={10} />}
                                </div>
                            </div>

                            {/* GHOST UI: Mini Card Summary */}
                            {msg.isGhost && msg.ghostData && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-2 mr-1 max-w-[70%]"
                                >
                                    <div className="bg-[#1A1E2E]/80 backdrop-blur border border-[#E6C673]/20 rounded-xl p-3 shadow-lg flex flex-col gap-2 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-[#E6C673]" />
                                        <p className="text-[10px] text-white/70 leading-relaxed pr-2">
                                            {msg.ghostData.summary}
                                        </p>
                                        <button type="button" 
                                            onClick={() => handleGhostAction(msg.ghostData!.actionType)}
                                            className="self-end bg-[#E6C673]/10 hover:bg-[#E6C673]/20 text-[#E6C673] text-[10px] font-bold px-3 py-1.5 rounded-lg border border-[#E6C673]/20 flex items-center gap-1.5 transition-colors"
                                        >
                                            <FileText size={10} />
                                            {msg.ghostData.actionLabel}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Bar - Smart Launcher */}
            <div className="h-[80px] bg-[#0F121E]/95 backdrop-blur-xl border-t border-white/10 flex items-center px-4 gap-3 sticky bottom-0 w-full z-50">
                {/* زر المرفقات - يفتح واتساب فقط */}
                <button type="button" 
                    onClick={handleWhatsAppOpen}
                    className="p-3 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                    title="إرفاق ملف (عبر واتساب)"
                >
                    <Paperclip size={20} />
                </button>
                
                <div className="flex-1 h-12 bg-[#1A1E2E] rounded-full border border-white/5 focus-within:border-[#E6C673]/50 flex items-center px-4 transition-colors">
                    <input 
                        type="text" 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleWhatsAppSend()}
                        placeholder="اكتب رسالة واتساب..."
                        className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/30"
                    />
                    {/* زر المايك - يفتح واتساب فقط */}
                    <button type="button" 
                        onClick={handleWhatsAppOpen}
                        className="text-white/30 hover:text-[#E6C673] transition-colors"
                        title="تسجيل صوتي (عبر واتساب)"
                    >
                        <Mic size={18} />
                    </button>
                </div>

                {/* زر الإرسال - يفتح واتساب بالنص المكتوب */}
                <button type="button" 
                    onClick={handleWhatsAppSend}
                    className="w-12 h-12 rounded-full bg-[#E6C673] flex items-center justify-center text-[#0B1021] hover:bg-[#d4b360] transition-colors shadow-[0_0_15px_rgba(230,198,115,0.3)] hover:shadow-[0_0_25px_rgba(230,198,115,0.5)] transform hover:scale-105 active:scale-95 duration-200"
                >
                    <Send size={20} className="ml-0.5" />
                </button>
            </div>
        </div>
    );
};
