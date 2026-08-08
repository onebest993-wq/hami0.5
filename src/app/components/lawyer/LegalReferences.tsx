import React from 'react';
import { motion } from 'motion/react';
import { Book, Scale, X, ScrollText, Gavel, Landmark, FileText, Globe } from '@/app/components/ui/lucideIcons';

export const LegalReferences = ({ onClose }: { onClose: () => void }) => {
    const references = [
        { id: 1, title: "القانون المدني العراقي", sub: "رقم 40 لسنة 1951", icon: Scale, color: "#E6C673" },
        { id: 2, title: "قانون العقوبات", sub: "رقم 111 لسنة 1969", icon: Gavel, color: "#EF4444" },
        { id: 3, title: "الأحوال الشخصية", sub: "رقم 188 لسنة 1959", icon: Users, color: "#EC4899" }, // Defined below
        { id: 4, title: "أصول المحاكمات الجزائية", sub: "رقم 23 لسنة 1971", icon: Siren, color: "#F97316" }, // Defined below
        { id: 5, title: "المرافعات المدنية", sub: "رقم 83 لسنة 1969", icon: ScrollText, color: "#3B82F6" },
        { id: 6, title: "جريدة الوقائع العراقية", sub: "المصدر الرسمي للتحديثات", icon: Globe, color: "#10B981" },
    ];

    return (
        <div className="fixed inset-0 z-[70] bg-[#0F172A]/90 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#1A1E2E] w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#0B1021]">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Book className="text-[#E6C673]" size={24} />
                            المكتبة القانونية (الذاكرة التشريعية)
                        </h2>
                        <p className="text-white/40 text-xs mt-1">المصادر الأساسية التي يعتمد عليها النظام في التحليل</p>
                    </div>
                    <button type="button" onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Grid */}
                <div className="p-6 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-4">
                    {references.map((ref) => (
                        <div key={ref.id} className="bg-[#0B1021] border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center hover:border-[#E6C673]/30 transition-colors group cursor-pointer relative overflow-hidden">
                            <div className={`w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`} style={{ color: ref.color }}>
                                <ref.icon size={28} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-white text-sm font-bold mb-1">{ref.title}</h3>
                            <p className="text-white/40 text-[10px]">{ref.sub}</p>
                            
                            {/* Hover Effect */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                        </div>
                    ))}
                </div>

                {/* Footer Info */}
                <div className="p-4 bg-[#E6C673]/5 border-t border-[#E6C673]/10 text-center">
                    <p className="text-[#E6C673] text-xs">
                        * يتم تحديث هذه القوانين تلقائياً مع كل نشر جديد في جريدة الوقائع.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

// Missing Icons Helper
const Users = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const Siren = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 18v-6a5 5 0 1 1 10 0v6"/><path d="M5 21a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-1Z"/><path d="M21 12h1"/><path d="M18.5 4.5 20.5 2.5"/><path d="M2 12h1"/><path d="M3.5 4.5 5.5 2.5"/></svg>;
