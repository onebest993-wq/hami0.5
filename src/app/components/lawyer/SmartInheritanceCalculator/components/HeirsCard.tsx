import React from 'react';
import { Users, Info } from 'lucide-react';
import { HeirCounter } from './HeirCounter';
import { HeirToggle } from './HeirToggle';

interface HeirEntry {
    type: string;
    count: number;
    isAlive: boolean;
}

interface HeirsCardProps {
    heirs: HeirEntry[];
    onUpdateCount: (type: string, delta: number) => void;
    onToggleAlive: (type: string) => void;
}

export const HeirsCard: React.FC<HeirsCardProps> = ({ heirs, onUpdateCount, onToggleAlive }) => {
    const getCount = (type: string) => heirs.find(h => h.type === type)?.count || 0;
    const getAlive = (type: string) => heirs.find(h => h.type === type)?.isAlive ?? true;

    return (
        <div className="bg-[#25293C] rounded-2xl p-5 border border-white/5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <Users className="text-[#E6C673]" size={20} />
                <h2 className="text-white font-bold">حصر الورثة</h2>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] text-[#E6C673] uppercase tracking-wider font-bold">الزوجية</label>
                <HeirCounter label="الزوجة" type="wife" count={getCount('wife')} onUpdate={onUpdateCount} />
                <HeirCounter label="الزوج" type="husband" count={getCount('husband')} onUpdate={onUpdateCount} />
            </div>

            <div className="space-y-2 mt-4">
                <label className="text-[10px] text-[#E6C673] uppercase tracking-wider font-bold">الأصول (الوالدين)</label>
                <HeirToggle label="الأب" type="father" isAlive={getAlive('father')} onToggle={onToggleAlive} />
                <HeirToggle label="الأم" type="mother" isAlive={getAlive('mother')} onToggle={onToggleAlive} />
            </div>

            <div className="space-y-2 mt-4">
                <label className="text-[10px] text-[#E6C673] uppercase tracking-wider font-bold">الفروع (الأولاد)</label>
                <HeirCounter label="أبناء (ذكور)" type="son" count={getCount('son')} onUpdate={onUpdateCount} />
                <HeirCounter label="بنات (إناث)" type="daughter" count={getCount('daughter')} onUpdate={onUpdateCount} />
            </div>

            <div className="pt-4 border-t border-white/5 mt-4">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] text-[#E6C673] uppercase tracking-wider font-bold flex items-center gap-1">
                        الوصية الواجبة (م74)
                        <Info size={10} />
                    </label>
                </div>
                <div className="grid grid-cols-1 gap-2">
                    <HeirCounter label="أحفاد (أولاد ابن/بنت متوفى)" type="son_son" count={getCount('son_son')} onUpdate={onUpdateCount} />
                </div>
                <p className="text-[10px] text-white/30 mt-2 leading-relaxed">
                    أضف الأحفاد هنا فقط إذا كان والدهم/والدتهم توفي قبل المورث الأصلي. سيقوم النظام باحتساب حصتهم تلقائياً.
                </p>
            </div>
        </div>
    );
};
