import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { LibraryBig, X, Search } from 'lucide-react';

interface CriminalArticle {
    art: string;
    type: 'felony' | 'misdemeanor';
    title: string;
    keywords: string;
    text: string;
}

/** Minimal surface for lazily loaded Fuse instance */
interface CriminalFuseSearch {
    search(pattern: string): { item: CriminalArticle }[];
}

const CRIMINAL_LEGAL_DB: CriminalArticle[] = [
    { art: '406', type: 'felony', title: 'القتل العمد المشدد', keywords: 'قتل اعدام سبق اصرار ترصد سم', text: 'يعاقب بالإعدام من قتل نفسا عمدا في الحالات التالية: أ- اذا كان القتل مع سبق الاصرار او الترصد. ب- اذا حصل باستعمال مادة سامة او مفرقعة. ج- اذا كان لدافع دنيء او مقابل اجر...' },
    { art: '405', type: 'felony', title: 'القتل العمد البسيط', keywords: 'قتل مؤبد', text: 'من قتل نفسا عمدا يعاقب بالسجن المؤبد أو المؤقت.' },
    { art: '440', type: 'felony', title: 'السرقة المشددة (ليلاً)', keywords: 'سرقة ليل سلاح كسر', text: 'يعاقب بالسجن المؤبد أو المؤقت من ارتكب سرقة اجتمعت فيها الظروف التالية: 1- بين غروب الشمس وشروقه. 2- من شخصين فأكثر. 3- حامل سلاح. 4- في محل مسكون.' },
    { art: '456', type: 'misdemeanor', title: 'الاحتيال', keywords: 'نصب احتيال غش', text: 'يعاقب بالحبس كل من توصل الى تسلم او نقل حيازة مال منقول مملوك للغير لنفسه او الى شخص اخر باستعمال طرق احتيالية او اتخاذ اسم كاذب.' },
    { art: '459', type: 'misdemeanor', title: 'الصكوك (الشيكات)', keywords: 'صك شيك رصيد', text: 'يعاقب بالحبس وبغرامة لا تزيد على 300 دينار من اعطى بسوء نية صكا وهو يعلم بان ليس له مقابل وفاء كاف قائم.' },
    { art: '393', type: 'felony', title: 'جرائم العرض', keywords: 'اغتصاب زنا لواط', text: 'يعاقب بالحبس المؤبد أو المؤقت كل من واقع انثى بغير رضاها أو لاط بذكر أو انثى بغير رضاه.' },
    { art: '156', type: 'felony', title: 'أمن الدولة الخارجي', keywords: 'خيانة امن دولة استقلال', text: 'يعاقب بالإعدام من ارتكب عمدا فعلا بقصد المساس باستقلال البلاد او وحدتها او سلامة اراضيها.' },
    { art: '413', type: 'misdemeanor', title: 'الإيذاء العمد', keywords: 'ضرب جرح مشاجرة', text: 'من اعتدى عمدا على اخر بالجرح او بالضرب او بالعنف فسبب له اذى او مرضا يعاقب بالحبس مدة لا تزيد على سنة.' },
    { art: '289', type: 'felony', title: 'تزوير المحررات الرسمية', keywords: 'تزوير موظف', text: 'يعاقب بالسجن مدة لا تزيد على خمس عشرة سنة كل من ارتكب تزويرا في محرر رسمي.' },
];

export const SmartCriminalLibrary = ({ onClose }: any) => {
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'felony' | 'misdemeanor'>('all');
    const [fuseSearch, setFuseSearch] = useState<CriminalFuseSearch | null>(null);

    useEffect(() => {
        let cancelled = false;
        import('fuse.js').then((mod) => {
            if (cancelled) return;
            const Fuse = mod.default;
            setFuseSearch(
                new Fuse(CRIMINAL_LEGAL_DB, {
                    keys: ['art', 'title', 'keywords', 'text'],
                    threshold: 0.3,
                })
            );
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const results = useMemo(() => {
        let res: CriminalArticle[] =
            query && fuseSearch
                ? fuseSearch.search(query).map((r) => r.item)
                : [...CRIMINAL_LEGAL_DB];
        if (filter !== 'all') {
            res = res.filter((item: CriminalArticle) => item.type === filter);
        }
        return res;
    }, [query, filter, fuseSearch]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-4xl h-[85vh] bg-[#0F121E] border border-[#E6C673]/30 rounded-3xl shadow-[0_0_50px_rgba(230,198,115,0.15)] flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-[#E6C673]/10 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#E6C673]/20 flex items-center justify-center border border-[#E6C673]/30">
                            <LibraryBig size={28} className="text-[#E6C673]" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">المكتبة الجنائية الذكية</h2>
                            <p className="text-[#E6C673]/70 text-sm">المرجع القانوني العراقي - إصدار 2026</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-500 flex items-center justify-center transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Search & Filters */}
                <div className="p-6 space-y-4">
                    <div className="relative">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                        <input
                            type="text"
                            placeholder="ابحث برقم المادة (مثلاً 406) أو وصف الجريمة (مثلاً سرقة، شيك)..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full h-14 bg-[#1A1E2E] border border-white/10 rounded-xl pr-12 pl-4 text-white placeholder-white/30 focus:border-[#E6C673] focus:shadow-[0_0_15px_rgba(230,198,115,0.2)] outline-none transition-all text-lg"
                            autoFocus
                        />
                    </div>
                    <div className="flex gap-2">
                        {[
                            { id: 'all', label: 'الكل' },
                            { id: 'felony', label: 'الجنايات (السجن/الإعدام)' },
                            { id: 'misdemeanor', label: 'الجنح (الحبس/الغرامة)' },
                        ].map((f) => (
                            <button type="button"
                                key={f.id}
                                onClick={() => setFilter(f.id as 'all' | 'felony' | 'misdemeanor')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === f.id ? 'bg-[#E6C673] text-black shadow-[0_0_10px_#E6C673]' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Results Grid */}
                <div className="flex-1 overflow-y-auto p-6 pt-0 grid grid-cols-1 gap-4">
                    {results.length > 0 ? (
                        results.map((item: CriminalArticle, idx: number) => (
                            <motion.div
                                key={item.art}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="group bg-[#1A1E2E]/50 border border-white/5 hover:border-[#E6C673]/50 rounded-2xl p-5 cursor-pointer transition-all hover:bg-[#1A1E2E] hover:shadow-xl relative overflow-hidden"
                            >
                                {/* Glow Effect on Hover */}
                                <div className="absolute inset-0 bg-gradient-to-r from-[#E6C673]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                                <div className="flex justify-between items-start relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className={`px-3 py-1 rounded-lg text-xs font-bold border ${item.type === 'felony' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                                            {item.type === 'felony' ? 'جناية' : 'جنحة'}
                                        </div>
                                        <h3 className="text-xl font-bold text-[#E6C673]">مادة {item.art}</h3>
                                    </div>
                                </div>

                                <h4 className="text-white font-bold text-lg mt-3 mb-2">{item.title}</h4>
                                <p className="text-white/70 leading-relaxed text-sm bg-black/20 p-3 rounded-lg border border-white/5 font-mono">
                                    "{item.text}"
                                </p>
                            </motion.div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-white/30">
                            <Search size={48} className="mb-4 opacity-20" />
                            <p>لا توجد نتائج مطابقة</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
