import React from 'react';
import { Globe } from 'lucide-react';

interface ForeignJudgmentData {
    country: string;
    court: string;
    isAuthenticated: boolean;
}

interface ForeignJudgmentSectionProps {
    foreignData: ForeignJudgmentData;
    onForeignDataChange: (data: ForeignJudgmentData) => void;
}

export const ForeignJudgmentSection: React.FC<ForeignJudgmentSectionProps> = ({
    foreignData,
    onForeignDataChange,
}) => {
    return (
        <div className="bg-gradient-to-br from-amber-950/20 to-amber-900/10 border-2 border-amber-700/40 rounded-xl p-4 animate-fade-in shadow-lg shadow-amber-900/10">
            <h4 className="text-amber-400 font-bold text-base mb-4 flex items-center gap-2 border-b border-amber-800/30 pb-3">
                <Globe size={20} className="text-amber-500" /> بيانات الحكم الأجنبي
            </h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                    <label className="text-xs font-semibold text-amber-300 block mb-2">دولة إصدار الحكم</label>
                    <input
                        type="text"
                        placeholder="مثال: المملكة الأردنية الهاشمية"
                        value={foreignData.country}
                        onChange={(e) => onForeignDataChange({ ...foreignData, country: e.target.value })}
                        className="w-full bg-[#111827] border-2 border-gray-700 p-3 rounded-lg text-white text-sm focus:border-amber-500 outline-none placeholder-gray-600 hover:border-gray-600 transition-all"
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold text-amber-300 block mb-2">المحكمة المصدرة</label>
                    <input
                        type="text"
                        placeholder="اسم المحكمة..."
                        value={foreignData.court}
                        onChange={(e) => onForeignDataChange({ ...foreignData, court: e.target.value })}
                        className="w-full bg-[#111827] border-2 border-gray-700 p-3 rounded-lg text-white text-sm focus:border-amber-500 outline-none placeholder-gray-600 hover:border-gray-600 transition-all"
                    />
                </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-amber-400 transition-colors bg-[#0B1120] p-3 rounded-lg border border-gray-800">
                <input
                    type="checkbox"
                    checked={foreignData.isAuthenticated}
                    onChange={(e) => onForeignDataChange({ ...foreignData, isAuthenticated: e.target.checked })}
                    className="accent-amber-500 w-5 h-5 cursor-pointer"
                />
                <span className="font-medium">مصدق أصولياً (وزارة الخارجية / العدل)</span>
            </label>
        </div>
    );
};
