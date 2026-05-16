import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Sparkles, Circle } from 'lucide-react';

interface ChatPreview {
    id: string;
    clientName: string;
    avatarUrl: string;
    caseStatus: string;
    lastMessage: string;
    time: string;
    unreadCount: number;
    hasAiSummary: boolean;
}

const MOCK_CHATS: ChatPreview[] = [
    {
        id: '1',
        clientName: 'أحمد العلي',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100&h=100',
        caseStatus: 'دعوى تمليك - جلسة مرافعة',
        lastMessage: 'أستاذ بخصوص الشهود، هل أحتاج أحضرهم؟',
        time: '10:30 ص',
        unreadCount: 2,
        hasAiSummary: true
    },
    {
        id: '2',
        clientName: 'شركة البنيان',
        avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=100&h=100',
        caseStatus: 'عقد استثمار - مراجعة قانونية',
        lastMessage: 'تم إرسال المسودة النهائية.',
        time: 'أمس',
        unreadCount: 0,
        hasAiSummary: false
    },
     {
        id: '3',
        clientName: 'سارة محمد',
        avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100&h=100',
        caseStatus: 'أحوال شخصية - تفريق',
        lastMessage: 'تم التبليغ حسب الأصول',
        time: 'أمس',
        unreadCount: 1,
        hasAiSummary: false
    }
];

interface MessagesListProps {
    onSelectChat: (chatId: string) => void;
}

export const MessagesList: React.FC<MessagesListProps> = ({ onSelectChat }) => {
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <div className="w-full h-full flex flex-col gap-4 animate-in fade-in zoom-in duration-300">
            {/* Search Bar */}
            <div className="relative">
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <Search className="text-white/30" size={18} />
                </div>
                <input 
                    type="text" 
                    placeholder="بحث عن موكل..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#1A1E2E]/60 backdrop-blur-md border border-white/10 rounded-2xl py-3 pr-10 pl-4 text-white text-sm focus:border-[#E6C673]/50 focus:bg-[#1A1E2E] transition-all outline-none placeholder-white/30 shadow-lg"
                />
            </div>

            {/* Chat List */}
            <div className="flex flex-col gap-2 pb-24">
                {MOCK_CHATS.map((chat, idx) => (
                    <motion.button
                        key={chat.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => onSelectChat(chat.id)}
                        className="group w-full bg-[#1A1E2E]/40 hover:bg-[#1A1E2E] border border-white/5 hover:border-[#E6C673]/30 rounded-2xl p-4 flex items-center gap-4 transition-all duration-300 text-right relative overflow-hidden"
                    >
                        {/* Hover Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#E6C673]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <img 
                                src={chat.avatarUrl} 
                                alt={chat.clientName} 
                                className="w-14 h-14 rounded-full object-cover border-2 border-white/10 group-hover:border-[#E6C673] transition-colors"
                            />
                            {chat.unreadCount > 0 && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#E6C673] flex items-center justify-center text-[10px] font-bold text-black border-2 border-[#0B1021]">
                                    {chat.unreadCount}
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 z-10">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-white font-bold group-hover:text-[#E6C673] transition-colors">{chat.clientName}</h3>
                                <span className="text-[10px] text-white/30 font-mono">{chat.time}</span>
                            </div>
                            
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#E6C673]" />
                                <span className="text-[10px] text-white/50 bg-white/5 px-2 py-0.5 rounded-full border border-white/5 truncate">
                                    {chat.caseStatus}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <p className="text-sm text-white/70 truncate leading-relaxed max-w-[90%]">
                                    {chat.lastMessage}
                                </p>
                                {chat.hasAiSummary && (
                                    <Sparkles size={12} className="text-[#E6C673] animate-pulse shrink-0" />
                                )}
                            </div>
                        </div>
                    </motion.button>
                ))}
            </div>
        </div>
    );
};
