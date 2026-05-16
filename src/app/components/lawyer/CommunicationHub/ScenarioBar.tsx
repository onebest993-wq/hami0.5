import React from 'react';
import { Scale, FileText, Gavel, Banknote, MessageCircle, Shield } from 'lucide-react';
import type { ScenarioBarProps } from './types';

const SCENARIOS = [
    { id: 1, label: 'الاختصاص القيمي', icon: Scale, desc: 'تحديد الاختصاص استناداً للقيمة' },
    { id: 2, label: 'صياغة عريضة', icon: FileText, desc: 'تدقيق المتطلبات الشكلية (مادة 46)' },
    { id: 3, label: 'تحليل حكم', icon: Gavel, desc: 'تحليل منطوق الأحكام' },
    { id: 4, label: 'حساب النفقة', icon: Banknote, desc: 'احتساب النفقات والإعالة' },
    { id: 5, label: 'إنذار كاتب عدل', icon: MessageCircle, desc: 'صياغة إنذار معدّل حسب القانون' },
    { id: 6, label: 'ايقاف التنفيذ', icon: Shield, desc: 'إجراءات وقف التنفيذ' },
];

export const ScenarioBar = ({ onRunScenario }: ScenarioBarProps) => (
    <div id="scenario-bar" className="px-4 py-3 overflow-x-auto">
        <div className="flex gap-3 min-w-min">
            {SCENARIOS.map((s) => {
                const Icon = s.icon;
                return (
                    <button type="button"
                        key={s.id}
                        onClick={() => onRunScenario(s.id)}
                        className="flex flex-col items-center gap-1 p-3 bg-white/5 rounded-2xl min-w-[90px] border border-white/10 hover:bg-white/10 hover:border-[#E6C673]/30 transition-colors"
                    >
                        <Icon className="text-amber-400" size={18} />
                        <span className="text-white/80 text-[10px] font-bold leading-tight text-center">{s.label}</span>
                        <span className="text-white/40 text-[8px] leading-tight text-center">{s.desc}</span>
                    </button>
                );
            })}
        </div>
    </div>
);
