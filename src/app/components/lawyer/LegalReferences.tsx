import React from 'react';
import { motion } from 'motion/react';
import { Book, Scale, X, Gavel, ScrollText } from 'lucide-react';
import {
    EXECUTION_LAW_CANONICAL_NAME,
    IRAQI_LAW_CANONICAL_NAMES,
} from '@/app/constants/iraqiLawCatalog';

export const LegalReferences = ({ onClose }: { onClose: () => void }) => {
    const references = [
        {
            id: 1,
            title: 'قانون التنفيذ',
            sub: EXECUTION_LAW_CANONICAL_NAME.replace('قانون التنفيذ العراقي ', ''),
            icon: Scale,
            color: '#E6C673',
        },
        {
            id: 2,
            title: 'قانون العقوبات',
            sub: IRAQI_LAW_CANONICAL_NAMES.penal.replace('قانون العقوبات العراقي ', ''),
            icon: Gavel,
            color: '#EF4444',
        },
        {
            id: 3,
            title: 'أصول المحاكمات الجزائية',
            sub: IRAQI_LAW_CANONICAL_NAMES.procedure.replace('قانون أصول المحاكمات الجزائية العراقي ', ''),
            icon: ScrollText,
            color: '#F97316',
        },
        {
            id: 4,
            title: 'قانون رعاية الأحداث',
            sub: IRAQI_LAW_CANONICAL_NAMES.juvenile.replace('قانون رعاية الأحداث العراقي ', ''),
            icon: Users,
            color: '#3B82F6',
        },
    ];

    return (
        <div className="fixed inset-0 z-[70] bg-[#0F172A]/90 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#1A1E2E] w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#0B1021]">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Book className="text-[#E6C673]" size={24} />
                            المكتبة القانونية
                        </h2>
                        <p className="text-white/40 text-xs mt-1">القوانين المعتمدة في النظام (V1)</p>
                    </div>
                    <button type="button" onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto grid grid-cols-2 gap-4">
                    {references.map((ref) => (
                        <div key={ref.id} className="bg-[#0B1021] border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center hover:border-[#E6C673]/30 transition-colors group cursor-pointer relative overflow-hidden">
                            <div className={`w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`} style={{ color: ref.color }}>
                                <ref.icon size={28} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-white text-sm font-bold mb-1">{ref.title}</h3>
                            <p className="text-white/40 text-[10px]">{ref.sub}</p>
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
};

const Users = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);
