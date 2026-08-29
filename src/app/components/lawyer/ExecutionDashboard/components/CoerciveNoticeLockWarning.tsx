import React from 'react';
import { Lock } from '@/app/components/ui/icons/Lock';

export const CoerciveNoticeLockWarning: React.FC<{
    daysSinceNoticeCalculated: number;
}> = ({ daysSinceNoticeCalculated }) => (
    <div className="rounded-2xl border border-amber-500/40 bg-slate-800/60 p-5 text-center">
        <Lock size={40} className="text-amber-400 mx-auto mb-3" />
        <h4 className="text-amber-400 font-bold text-sm mb-2">
            🔒 الإجراءات الجبرية مقفلة قانوناً
        </h4>
        <p className="text-gray-400 text-xs mb-3">
            يرجى انتظار انتهاء فترة الإخبار (7 أيام) أو إخلال المدين بالتسوية
        </p>
        <div className="text-amber-300 font-bold text-lg">
            {Math.max(0, 7 - daysSinceNoticeCalculated)} أيام متبقية (تقديري)
        </div>
    </div>
);
