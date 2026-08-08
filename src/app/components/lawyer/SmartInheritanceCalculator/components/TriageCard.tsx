import React from 'react';
import { motion } from 'motion/react';
import { Gavel, Wallet, Landmark, Trees, Check } from '@/app/components/ui/lucideIcons';
import type { AssetType, Sect } from '@/app/core/IraqiInheritanceLogic';

interface TriageCardProps {
    assetType: AssetType;
    sect: Sect;
    onAssetTypeChange: (t: AssetType) => void;
    onSectChange: (s: Sect) => void;
}

export const TriageCard: React.FC<TriageCardProps> = ({
    assetType, sect, onAssetTypeChange, onSectChange
}) => {
    return (
        <div className="bg-[#25293C] rounded-2xl p-5 border border-white/5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <Gavel className="text-[#E6C673]" size={20} />
                <h2 className="text-white font-bold">التكييف القانوني</h2>
            </div>

            <label className="text-xs text-white/50 block">نوع المال الموروث (يحدد المسار القضائي)</label>
            <div className="grid grid-cols-1 gap-2">
                {[
                    { id: 'movable' as AssetType, icon: Wallet, label: 'ملك صرف / منقولات', desc: 'يخضع للقسام الشرعي (حسب المذهب)' },
                    { id: 'statutory' as AssetType, icon: Landmark, label: 'أراضي أميرية / حق تصرف', desc: 'يخضع للقسام النظامي (القانون المدني)' },
                    { id: 'mixed' as AssetType, icon: Trees, label: 'تركة مختلطة (بستان)', desc: 'يجمع بين الاثنين (رقبة + مشيدات)' },
                ].map((item) => {
                    const isActive = assetType === item.id;
                    const Icon = item.icon;
                    return (
                        <button type="button"
                            key={item.id}
                            onClick={() => onAssetTypeChange(item.id)}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isActive ? 'bg-[#E6C673]/10 border-[#E6C673] text-white' : 'bg-[#1A1E2E] border-white/5 text-white/50'}`}
                        >
                            <Icon size={18} />
                            <div className="text-right">
                                <div className="font-bold text-sm">{item.label}</div>
                                <div className="text-[10px] opacity-70">{item.desc}</div>
                            </div>
                            {isActive && <Check size={16} className="mr-auto text-[#E6C673]" />}
                        </button>
                    );
                })}
            </div>

            {(assetType === 'movable' || assetType === 'mixed') && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="pt-2 border-t border-white/5 mt-2">
                    <label className="text-xs text-white/50 block mb-2">المذهب الفقهي (للقسام الشرعي)</label>
                    <div className="flex bg-[#1A1E2E] p-1 rounded-xl">
                        <button type="button"
                            onClick={() => onSectChange('jafari')}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${sect === 'jafari' ? 'bg-[#E6C673] text-black shadow-lg' : 'text-white/50'}`}
                        >
                            المذهب الجعفري
                        </button>
                        <button type="button"
                            onClick={() => onSectChange('sunni')}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${sect === 'sunni' ? 'bg-[#E6C673] text-black shadow-lg' : 'text-white/50'}`}
                        >
                            المذهب السني
                        </button>
                    </div>
                </motion.div>
            )}
        </div>
    );
};
