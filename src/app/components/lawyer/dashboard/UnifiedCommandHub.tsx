import React from 'react';
import { Scale, FileText, Hammer } from 'lucide-react';

export const UnifiedCommandHub = ({ theme, shapeClass, onOpenArchive, onPrefetchExecution }: any) => {
    const accent = theme?.primary ?? '#E6C673';
    const accentMuted = theme?.secondary ?? '#D4B360';

    // Elegant Shield Navigation (The Unified Royal Touch)
    return (
        <div className="w-full -mt-[25px] mb-6 px-1">
            {/* 2. The 3 Pillars + New File (Vertical Cards) */}
            <div className="grid grid-cols-2 gap-3 mt-2">
                {[
                    { 
                        id: 'lawsuit', 
                        label: 'دعاوى', 
                        icon: Scale
                    },
                    { 
                        id: 'transaction', 
                        label: 'معاملات', 
                        icon: FileText
                    },
                    { 
                        id: 'execution', 
                        label: 'تنفيذ', 
                        icon: Hammer
                    },
                ].map((card) => (
                    <button
                        type="button"
                        data-testid={`hub-archive-${card.id}`}
                        key={card.id}
                        onMouseEnter={() => {
                            if (card.id === 'execution') onPrefetchExecution?.();
                        }}
                        onFocus={() => {
                            if (card.id === 'execution') onPrefetchExecution?.();
                        }}
                        onClick={() => {
                            if (card.id === 'execution') onPrefetchExecution?.();
                            onOpenArchive(card.id);
                        }}
                        className={`relative h-[125px] w-full ${shapeClass || 'rounded-2xl'} overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hami-lawyer-panel`}
                    >
                        {/* 3. Visual Depth: Giant Background Icon - Reduced Size & White */}
                        <card.icon 
                            size={70} 
                            strokeWidth={0.5}
                            className="absolute -right-4 -bottom-4 text-white opacity-[0.05] transform -rotate-12 pointer-events-none transition-transform duration-500 group-hover:scale-110 group-hover:rotate-0" 
                        />

                        {/* Content Container */}
                        <div className="relative z-10 h-full flex flex-col items-center justify-center gap-3">
                            
                            {/* Icon Circle Container */}
                            <div className="relative w-14 h-14 rounded-full flex items-center justify-center group-hover:scale-105 transition-all duration-500">
                                
                                {/* 1. Rotating accent ring */}
                                <div
                                    className="absolute inset-0 rounded-full border group-hover:rotate-180 transition-all duration-700 ease-out"
                                    style={{
                                        borderColor: `${accent}33`,
                                        borderTopColor: `${accent}cc`,
                                        boxShadow: `0 0 20px ${accent}26`,
                                    }}
                                />

                                {/* 2. Deep Dark Glass Lens */}
                                <div className="absolute inset-[4px] rounded-full bg-[#0B1021] border border-white/5 shadow-[inset_0_4px_10px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden">
                                    
                                    {/* Ambient Gold Spill */}
                                    <div 
                                        className="absolute top-0 left-0 right-0 h-full opacity-20 group-hover:opacity-50 transition-opacity duration-500" 
                                        style={{ background: `radial-gradient(circle at 50% 0%, ${accentMuted}, transparent 60%)` }} 
                                    />
                                    
                                    {/* The Icon - Unified Pure White */}
                                    <card.icon 
                                        size={24} 
                                        color="#FFFFFF"
                                        strokeWidth={1.5} 
                                        className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform duration-300"
                                    />
                                </div>
                            </div>

                            {/* Elegant Label - Unified Light Gold */}
                            <span className="text-white font-bold text-base tracking-wide group-hover:text-white transition-colors duration-300">
                                {card.label}
                            </span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};
