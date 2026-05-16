import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    Copy, Share2, User, Clock, ChevronDown, 
    CheckCircle2, XCircle, Star, Filter, 
    Phone, MessageSquare, ArrowRight,
    Briefcase, Calendar
} from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';

// --- TYPES ---
interface Lead {
    id: number;
    name: string;
    type: string;
    time: string;
    avatar?: string; // Optional URL
    phone: string;
    notes: string;
    isNew: boolean;
    status: 'pending' | 'accepted' | 'ignored';
}

// --- MOCK DATA ---
const MOCK_LEADS: Lead[] = [
    {
        id: 1,
        name: "شركة النور للتجارة",
        type: "تأسيس شركة - طلب جديد",
        time: "منذ 10 دقائق",
        phone: "0501234567",
        notes: "نحتاج لتأسيس شركة ذات مسؤولية محدودة في أسرع وقت ممكن. لدينا جميع الأوراق جاهزة.",
        isNew: true,
        status: 'pending'
    },
    {
        id: 2,
        name: "خالد عبد الرحمن",
        type: "استشارة عقارية - مستعجل",
        time: "منذ 35 دقيقة",
        phone: "0559876543",
        notes: "مشكلة في عقد إيجار تجاري، المالك يهدد بالإخلاء.",
        isNew: true,
        status: 'pending'
    },
    {
        id: 3,
        name: "مؤسسة البناء الحديث",
        type: "قضية عمالية",
        time: "منذ ساعتين",
        phone: "0541122334",
        notes: "تم رفع دعوى من قبل موظف سابق يطالب بمكافأة نهاية الخدمة.",
        isNew: false,
        status: 'pending'
    },
    {
        id: 4,
        name: "سارة محمد",
        type: "أحوال شخصية - نفقة",
        time: "أمس",
        phone: "0566677889",
        notes: "استفسار بخصوص زيادة النفقة الشهرية للأبناء.",
        isNew: false,
        status: 'pending'
    }
];

export const LeadManagement = ({ onClose }: { onClose: () => void }) => {
    const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [filter, setFilter] = useState<'all' | 'new' | 'starred'>('all');

    // Filter Logic
    const filteredLeads = leads.filter(lead => {
        if (filter === 'new') return lead.isNew;
        // Add starred logic if we had a starred property, strictly following prompt layout for now
        return true;
    });

    const handleCopyLink = async () => {
        const text = "hami.app/lawyer/ahmed";
        try {
            await navigator.clipboard.writeText(text);
            SmartToast.success("تم نسخ الرابط بنجاح");
        } catch (err) {
            // Fallback for restricted iframe environments
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                SmartToast.success("تم نسخ الرابط بنجاح");
            } catch (e) {
                SmartToast.error("فشل النسخ");
            }
            document.body.removeChild(textArea);
        }
    };

    const handleAction = (id: number, action: 'accept' | 'ignore') => {
        SmartToast.info(action === 'accept' ? "تم قبول الملف وبدء الإجراءات" : "تم تجاهل الطلب");
        // Remove or update status in real app
        setExpandedId(null);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-0 z-[60] bg-[#0B1021] flex flex-col"
        >
            {/* --- HEADER BAR (Back Button) --- */}
            <div className="px-4 py-4 flex items-center gap-4 bg-[#0B1021]/80 backdrop-blur-md sticky top-0 z-50 border-b border-white/5">
                <button type="button" 
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                    <ArrowRight size={20} />
                </button>
                <h1 className="text-xl font-bold text-white">طلبات التوكيل</h1>
            </div>

            {/* --- SCROLLABLE CONTENT --- */}
            <div className="flex-1 overflow-y-auto scrollbar-hide pb-32">
                <div className="p-4 space-y-6">
                    
                    {/* 1. SMART LINK CARD (The Royal Invitation) */}
                    <div className="relative overflow-hidden rounded-2xl border border-[#E6C673]/30 bg-gradient-to-br from-[#E6C673]/10 to-[#0B1021] p-6 shadow-2xl group">
                        {/* Shimmer Effect (every 5s) */}
                        <motion.div 
                            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ repeat: Infinity, duration: 2, repeatDelay: 5, ease: "linear" }}
                        />
                        
                        <div className="relative z-10 flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-[#E6C673] text-sm font-bold uppercase tracking-wider mb-1">رابط التوكيل الخاص بك</h2>
                                    <p className="text-white text-2xl font-bold tracking-tight">hami.app/lawyer/ahmed</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-[#E6C673]/20 flex items-center justify-center text-[#E6C673]">
                                    <Briefcase size={20} />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-2">
                                <button type="button" 
                                    onClick={handleCopyLink}
                                    className="flex-1 h-12 rounded-xl bg-[#E6C673] text-[#0B1021] font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-lg"
                                >
                                    <Copy size={18} />
                                    <span>نسخ الرابط</span>
                                </button>
                                <button type="button" className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#E6C673] hover:bg-white/10 active:scale-95 transition-all">
                                    <Share2 size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 2. FLOATING FILTERS (Scrollable Chips) */}
                    <div className="w-full overflow-x-auto no-scrollbar pb-2">
                        <div className="flex gap-3 min-w-max px-1">
                            {[
                                { id: 'all', label: 'الكل' },
                                { id: 'new', label: 'طلبات جديدة ✨' },
                                { id: 'starred', label: 'المميزة ⭐' }
                            ].map((f: { id: string; label: string }) => (
                                <button type="button"
                                    key={f.id}
                                    onClick={() => setFilter(f.id as 'all' | 'new' | 'starred')}
                                    className={`px-5 py-2.5 rounded-full text-sm font-bold border transition-all duration-300 ${
                                        filter === f.id 
                                        ? 'bg-[#E6C673] border-[#E6C673] text-[#0B1021] shadow-[0_0_15px_rgba(230,198,115,0.4)]' 
                                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 3. GLASS REQUEST CARDS (The Royal List) */}
                    <div className="flex flex-col gap-4">
                        <AnimatePresence>
                            {filteredLeads.map((lead, index) => {
                                const isExpanded = expandedId === lead.id;
                                
                                return (
                                    <motion.div
                                        key={lead.id}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: index * 0.05 }}
                                        onClick={() => setExpandedId(isExpanded ? null : lead.id)}
                                        className={`relative overflow-hidden rounded-[20px] border-[1.5px] transition-all duration-500 cursor-pointer group mb-3 shadow-xl ${
                                            isExpanded 
                                            ? 'bg-[#1A1A2E] border-[#FFD700] z-10 shadow-[0_0_30px_rgba(255,215,0,0.15)]' 
                                            : 'bg-[#1A1A2E]/60 border-[#FFD700] hover:bg-[#1A1A2E]/80'
                                        }`}
                                    >
                                        {/* Card Content Container */}
                                        <div className="p-4">
                                            {/* Header Row */}
                                            <div className="flex items-center gap-4">
                                                {/* Avatar (Royal Circle Icon) */}
                                                <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 text-xl font-bold border border-[#FFD700] bg-black/30 text-[#FFD700]">
                                                    {lead.name.charAt(0)}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <h3 className="text-lg font-bold text-white truncate">
                                                            {lead.name}
                                                        </h3>
                                                        <span className="text-xs text-[#CCCCCC] font-mono whitespace-nowrap flex items-center gap-1 mt-1">
                                                            <Clock size={10} />
                                                            {lead.time}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-[#CCCCCC] truncate mt-0.5">{lead.type}</p>
                                                </div>
                                            </div>

                                            {/* EXPANDABLE ACCORDION CONTENT */}
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="pt-6 pb-2 space-y-6">
                                                            {/* Details Grid */}
                                                            <div className="grid grid-cols-1 gap-4 p-4 rounded-xl bg-black/20 border border-white/5">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#E6C673]">
                                                                        <Phone size={14} />
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[10px] text-white/40 uppercase">رقم الهاتف</div>
                                                                        <div className="text-white text-sm font-mono dir-ltr text-right">{lead.phone}</div>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="flex items-start gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#E6C673] mt-1">
                                                                        <MessageSquare size={14} />
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[10px] text-white/40 uppercase mb-1">الملاحظات</div>
                                                                        <div className="text-white/80 text-sm leading-relaxed">
                                                                            {lead.notes}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* DECISION BUTTONS */}
                                                            <div className="flex gap-3 pt-2">
                                                                <button type="button" 
                                                                    onClick={(e) => { e.stopPropagation(); handleAction(lead.id, 'accept'); }}
                                                                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all"
                                                                >
                                                                    <CheckCircle2 size={18} />
                                                                    <span>قبول وبدء الملف</span>
                                                                </button>
                                                                
                                                                <button type="button" 
                                                                    onClick={(e) => { e.stopPropagation(); handleAction(lead.id, 'ignore'); }}
                                                                    className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 text-white/60 font-bold flex items-center justify-center gap-2 hover:bg-white/10 hover:text-white active:scale-95 transition-all"
                                                                >
                                                                    <XCircle size={18} />
                                                                    <span>تجاهل</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                        
                                        {/* Status Indicator Bar (Left Side) */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${lead.isNew ? 'bg-[#E6C673]' : 'bg-transparent'}`} />
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {/* Empty State Spacer */}
                    <div className="h-20"></div>
                </div>
            </div>
        </motion.div>
    );
};
