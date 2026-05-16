import React from 'react';
import { motion } from 'motion/react';
import { Check, Crown, CheckCircle2, MapPin, Castle, Anchor, Landmark, Crown as CrownIcon, Waves, Palmtree, Flame, Sprout, Columns, Mountain, Wheat, Tent, Hand, type LucideIcon } from 'lucide-react';
import { GoldButton } from '../../../SharedComponents';

const getProvinceIcon = (name: string): LucideIcon => {
    if (name.includes('بغداد')) return Castle;
    if (name.includes('البصرة')) return Anchor;
    if (name.includes('نينوى')) return Landmark;
    if (name.includes('كربلاء') || name.includes('النجف')) return Landmark;
    if (name.includes('أربيل')) return Castle;
    if (name.includes('بابل')) return CrownIcon;
    if (name.includes('ذي قار')) return Waves;
    if (name.includes('صلاح الدين')) return Landmark;
    if (name.includes('الأنبار')) return Palmtree;
    if (name.includes('كركوك')) return Flame;
    if (name.includes('ديالى')) return Sprout;
    if (name.includes('واسط')) return Columns;
    if (name.includes('ميسان')) return Waves;
    if (name.includes('سليمانية') || name.includes('دهوك')) return Mountain;
    if (name.includes('القادسية')) return Wheat;
    if (name.includes('المثنى')) return Tent;
    if (name.includes('حلبجة')) return Hand;
    return MapPin;
};

interface GlassGridSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    items: Array<string | { name: string; icon?: LucideIcon }>;
    selectedItems: string | string[];
    onToggle: (item: string) => void;
    singleSelect?: boolean;
    allOptionLabel?: string;
    icon?: LucideIcon;
}

export const GlassGridSheet = ({
    isOpen, onClose, title, items, selectedItems, onToggle, singleSelect = false, allOptionLabel, icon: HeaderIcon
}: GlassGridSheetProps) => {
    if (!isOpen) return null;
    const selectedArray = Array.isArray(selectedItems) ? selectedItems : [selectedItems];
    const isAllSelected = !singleSelect && selectedArray.includes('ALL');

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 backdrop-blur-md p-4"
        >
            <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full max-w-md bg-[#00102A] border-t border-[#D4AF37] rounded-t-[32px] max-h-[85vh] flex flex-col shadow-[0_-10px_60px_rgba(0,0,0,0.9)] relative overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="px-6 py-5 border-b border-[#D4AF37]/10 bg-[#001830]/50 backdrop-blur-xl z-10 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {HeaderIcon && <HeaderIcon className="text-[#D4AF37]" size={20} />}
                        <div>
                            <h3 className="text-white font-bold text-lg leading-none">{title}</h3>
                            {!singleSelect && <p className="text-[10px] text-gray-400 mt-1">💡 يمكنك اختيار أكثر من عنصر</p>}
                        </div>
                    </div>
                </div>

                <div className="overflow-y-auto scrollbar-hide p-6 space-y-4 flex-1 z-10 pb-24">
                    {allOptionLabel && !singleSelect && (
                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onToggle('ALL')}
                            className={`w-full p-4 rounded-xl flex items-center justify-between transition-all duration-300 relative overflow-hidden group
                            bg-gradient-to-r from-[#D4AF37] to-[#8C7324] text-[#00102A] shadow-[0_0_20px_rgba(212,175,55,0.3)] border-none`}
                        >
                            <div className="absolute inset-0 bg-white/20 blur-xl group-hover:bg-white/30 transition-colors" />
                            <span className="font-bold flex items-center gap-3 relative z-10">
                                <Crown size={20} strokeWidth={2.5} /> {allOptionLabel}
                            </span>
                            {isAllSelected ? <CheckCircle2 size={24} className="relative z-10" strokeWidth={3} /> : <div className="w-6 h-6 rounded-full border-2 border-[#00102A]/30 relative z-10" />}
                        </motion.button>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {items.map((item) => {
                            const itemName = typeof item === 'string' ? item : item.name;
                            const ItemIcon = typeof item === 'string' ? getProvinceIcon(itemName) : (item.icon || MapPin);
                            const isSelected = singleSelect ? selectedArray[0] === itemName : selectedArray.includes(itemName);

                            return (
                                <motion.button
                                    key={itemName}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => onToggle(itemName)}
                                    className={`relative aspect-[4/3] rounded-2xl flex flex-col items-center justify-center gap-3 p-1 text-center transition-all duration-300 overflow-hidden group isolate
                                    ${isSelected
                                        ? 'bg-[#001830] border-2 border-[#D4AF37] text-white'
                                        : 'bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10 hover:border-white/20'}`}
                                >
                                    {isSelected && (
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] z-0 pointer-events-none">
                                            <div className="w-full h-full bg-[radial-gradient(circle_closest-side,rgba(212,175,55,0.25)_0%,transparent_70%)] blur-md" />
                                        </div>
                                    )}

                                    <div className={`relative z-10 p-2.5 rounded-full flex items-center justify-center transition-colors duration-300 mx-auto
                                        ${isSelected ? 'bg-[#D4AF37] text-[#00102A] shadow-lg' : 'bg-white/5 text-gray-500 group-hover:bg-white/10 group-hover:text-[#D4AF37]'}`}>
                                        <div className="w-5 h-5 flex items-center justify-center">
                                            <ItemIcon className="w-full h-full object-contain" />
                                        </div>
                                    </div>

                                    <div className="w-full relative z-10 px-2 pb-1">
                                        <span className={`text-[11px] font-bold leading-tight block truncate w-full ${isSelected ? 'text-[#D4AF37]' : ''}`}>
                                            {itemName}
                                        </span>
                                    </div>

                                    {isSelected && (
                                        <div className="absolute top-3 left-3 w-1.5 h-1.5 bg-[#D4AF37] rounded-full shadow-[0_0_8px_#D4AF37] z-20" />
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#00102A] border-t border-[#D4AF37]/20 z-20">
                    <GoldButton fullWidth onClick={onClose} icon={Check}>تأكيد الاختيار وإغلاق</GoldButton>
                </div>
            </motion.div>
        </motion.div>
    );
};
