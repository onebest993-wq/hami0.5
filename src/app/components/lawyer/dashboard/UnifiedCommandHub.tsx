import React from 'react';
import { Plus, Scale, FileText, Hammer, Inbox } from 'lucide-react';

export const UnifiedCommandHub = ({ theme, shapeClass, onAddClick, onSearch, onFilter, onOpenArchive, isEditMode, glassMode }: any) => {
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
                    {
                        id: 'client_requests',
                        label: 'طلبات التوكيل',
                        icon: Inbox
                    }
                ].map((card, idx) => (
                    <button type="button" 
                        key={card.id}
                        onClick={() => {
                            if (card.id === 'new-file') {
                                onAddClick();
                            } else {
                                onOpenArchive(card.id);
                            }
                        }}
                        className="relative h-[125px] w-full rounded-2xl overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                        style={{
                            // Unified Royal Touch: Dark Gradient + Gold Border
                            background: 'linear-gradient(180deg, rgba(26, 33, 48, 0.6) 0%, rgba(5, 5, 5, 0.8) 100%)',
                            border: '1px solid rgba(212, 175, 55, 0.5)', // Gold Border
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
                        }}
                    >
                        {/* Notification Badge for Client Requests */}
                        {card.id === 'client_requests' && (
                             <div className="absolute top-3 left-3 z-30 bg-rose-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.5)] border border-white/20">
                                3
                             </div>
                        )}

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
                                
                                {/* 1. Rotating Gold Ring (The Halo) */}
                                <div className="absolute inset-0 rounded-full border border-[#E6C673]/20 border-t-[#E6C673]/80 group-hover:rotate-180 transition-all duration-700 ease-out shadow-[0_0_20px_rgba(230,198,115,0.15)]" />
                                
                                {/* 2. Deep Dark Glass Lens */}
                                <div className="absolute inset-[4px] rounded-full bg-[#0B1021] border border-white/5 shadow-[inset_0_4px_10px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden">
                                    
                                    {/* Ambient Gold Spill */}
                                    <div 
                                        className="absolute top-0 left-0 right-0 h-full opacity-20 group-hover:opacity-50 transition-opacity duration-500" 
                                        style={{ background: `radial-gradient(circle at 50% 0%, #D4AF37, transparent 60%)` }} 
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