import React from 'react';
import { Globe } from 'lucide-react';
import { ecg } from './executionCreationGlassUi';

export interface ForeignJudgmentData {
    country: string;
    court: string;
    isAuthenticated: boolean;
    [key: string]: unknown;
}

interface ForeignJudgmentSectionProps {
    foreignData: ForeignJudgmentData;
    onForeignDataChange: (data: ForeignJudgmentData) => void;
}

export const ForeignJudgmentSection: React.FC<ForeignJudgmentSectionProps> = ({
    foreignData,
    onForeignDataChange,
}) => (
    <div className={`${ecg.subCard} animate-fade-in`}>
        <h4 className={`${ecg.subCardTitle} border-b border-white/8 pb-3 mb-1 text-[#E6C673]`}>
            <Globe size={18} className="text-[#E6C673]" /> بيانات الحكم الأجنبي
        </h4>
        <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
                <label className={ecg.labelGold}>دولة إصدار الحكم</label>
                <input
                    type="text"
                    placeholder="مثال: المملكة الأردنية الهاشمية"
                    value={foreignData.country}
                    onChange={(e) => onForeignDataChange({ ...foreignData, country: e.target.value })}
                    className={ecg.field}
                />
            </div>
            <div>
                <label className={ecg.labelGold}>المحكمة المصدرة</label>
                <input
                    type="text"
                    placeholder="اسم المحكمة..."
                    value={foreignData.court}
                    onChange={(e) => onForeignDataChange({ ...foreignData, court: e.target.value })}
                    className={ecg.field}
                />
            </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-[#F0DFA8] transition-colors rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <input
                type="checkbox"
                checked={foreignData.isAuthenticated}
                onChange={(e) => onForeignDataChange({ ...foreignData, isAuthenticated: e.target.checked })}
                className="accent-[#E6C673] w-5 h-5 cursor-pointer"
            />
            <span className="font-medium">مصدق أصولياً (وزارة الخارجية / العدل)</span>
        </label>
    </div>
);
