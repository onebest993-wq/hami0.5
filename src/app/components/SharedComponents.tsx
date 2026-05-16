import React from "react";
import { motion } from "motion/react";
import { useAppTheme } from "../context/AppContext";
import { cn } from "./ui/utils";
import type { 
    GlassCardProps, 
    GoldButtonProps, 
    AppHeaderProps, 
    InputFieldProps 
} from "@/app/types/common";

// Global Colors Fallback
export const COLORS = {
  gold: '#E6C673',
  bg: '#05060D'
};

// ⚡ PERFORMANCE: Memoized Font Injection
export const FontInjector = React.memo(() => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap');
    body { font-family: 'Tajawal', sans-serif; background-color: #05060D; color: white; }
    
    /* ROYAL TEXTURE PATTERN */
    .royal-texture {
        background-color: #05060D;
        background-image: 
            radial-gradient(circle at 50% 50%, rgba(230, 198, 115, 0.03) 0%, transparent 50%),
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
        background-size: 100% 100%, 40px 40px, 40px 40px;
        background-attachment: fixed;
    }
    
    /* SCROLLBAR */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(230, 198, 115, 0.2); border-radius: 4px; }
  `}</style>
));

// ⚡ PERFORMANCE: Memoized Page Wrapper
export const PageWrapper = React.memo(({ children }: { children: React.ReactNode }) => {
    const { themeConfig } = useAppTheme();

    return (
        <div dir="rtl" className="min-h-screen w-full font-['Tajawal'] overflow-hidden relative transition-colors duration-700">
            
            {/* 1. Base Layer (Royal Texture or Image) */}
            <div className={`absolute inset-0 z-0 ${!themeConfig.backgroundImage ? 'royal-texture' : ''}`}>
                {themeConfig.backgroundImage && (
                    <div 
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
                        style={{ backgroundImage: `url(${themeConfig.backgroundImage})` }}
                    />
                )}
            </div>

            {/* 2. Smart Overlay (Legibility Layer) */}
            <div 
                className="absolute inset-0 z-[1] backdrop-blur-[2px] transition-all duration-700 pointer-events-none"
                style={{ 
                    background: themeConfig.backgroundImage 
                        ? `linear-gradient(to bottom, rgba(5,6,13,${themeConfig.overlayOpacity}), rgba(5,6,13,${themeConfig.overlayOpacity + 0.2}))` 
                        : 'radial-gradient(circle at top right, rgba(230, 198, 115, 0.05), transparent 60%)'
                }}
            />

            {/* 3. Ambient Glow (The Chameleon Aura) */}
            {!themeConfig.backgroundImage && (
                <div className="fixed inset-0 z-[2] pointer-events-none">
                     <motion.div 
                        animate={{ opacity: [0.1, 0.15, 0.1], scale: [1, 1.1, 1] }}
                        transition={{ duration: 10, repeat: Infinity }}
                        className="absolute -top-[20%] -left-[10%] w-[70%] h-[50%] blur-[120px] rounded-full opacity-20"
                        style={{ backgroundColor: themeConfig.accentColor }}
                     />
                </div>
            )}
            
            {/* Content */}
            <div className="relative z-10 h-full flex flex-col">{children}</div>
        </div>
    );
});

// ⚡ PERFORMANCE: Memoized Glass Card
export const GlassCard = React.memo(({ children, className, onClick, style }: GlassCardProps) => {
    const { themeConfig } = useAppTheme();
    return (
        <motion.div
            onClick={onClick}
            whileTap={onClick ? { scale: 0.98 } : undefined}
            className={cn(
                "rounded-[24px] border transition-all duration-300 relative overflow-hidden backdrop-blur-xl",
                className
            )}
            style={{
                backgroundColor: themeConfig.cardColor,
                borderColor: `${themeConfig.accentColor}26`, // 15% opacity
                boxShadow: `0 4px 30px -5px ${themeConfig.glowColor}0D`, // 5% opacity
                ...style
            }}
        >
            {children}
        </motion.div>
    );
});

// ⚡ PERFORMANCE: Memoized Gold Button
export const GoldButton = React.memo(({ children, onClick, className, icon: Icon, fullWidth, variant = 'primary' }: GoldButtonProps) => {
    const { themeConfig } = useAppTheme();
    
    const primaryStyle = {
        background: `linear-gradient(135deg, ${themeConfig.accentColor}, ${themeConfig.glowColor})`,
        color: '#05060D', 
        boxShadow: `0 4px 20px ${themeConfig.glowColor}40`,
        border: 'none'
    };

    const outlineStyle = {
        background: 'transparent',
        border: `1px solid ${themeConfig.accentColor}`,
        color: themeConfig.accentColor,
    };

    return (
        <motion.button
            onClick={onClick} 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className={cn(
                "flex items-center justify-center rounded-full px-6 py-3 font-bold transition-all",
                fullWidth && "w-full",
                className
            )}
            style={variant === 'primary' ? primaryStyle : outlineStyle}
        >
            {Icon && <Icon className="ml-2 w-5 h-5" />}
            {children}
        </motion.button>
    );
});

// ⚡ PERFORMANCE: Memoized App Header
export const AppHeader = React.memo(({ title, onBack, rightIcon }: AppHeaderProps) => {
    const { themeConfig } = useAppTheme();
    return (
        <div className="flex items-center justify-between p-6 sticky top-0 z-40 backdrop-blur-md border-b transition-colors duration-500"
             style={{ borderColor: `${themeConfig.accentColor}1A`, backgroundColor: 'rgba(5,6,13,0.7)' }}>
            <div className="flex items-center gap-3">
                {onBack && (
                    <motion.button
                        onClick={onBack}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-10 h-10 rounded-full flex items-center justify-center border transition-colors hover:bg-white/5"
                        style={{ borderColor: `${themeConfig.accentColor}33`, color: themeConfig.accentColor }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rotate-180"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </motion.button>
                )}
                <h1 className="text-xl font-bold tracking-wide font-serif text-white">{title}</h1>
            </div>
            {rightIcon}
        </div>
    );
});

export const InputField = ({ label, placeholder, value, onChange, type = "text", icon: Icon, className, maxLength }: InputFieldProps) => {
    const { themeConfig } = useAppTheme();
    return (
        <div className="flex flex-col gap-2">
            {label && <label className="text-sm font-medium transition-colors opacity-80" style={{ color: themeConfig.accentColor }}>{label}</label>}
            <div className="relative">
                {Icon && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <Icon size={18} />
                    </div>
                )}
                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    maxLength={maxLength}
                    className={cn(
                        "w-full rounded-xl bg-white/5 border px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-1 transition-all",
                        Icon && "pr-12",
                        className
                    )}
                    style={{ borderColor: `${themeConfig.accentColor}33`, caretColor: themeConfig.accentColor }}
                />
            </div>
        </div>
    );
};