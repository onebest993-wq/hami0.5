import React from 'react';
import { motion } from 'motion/react';
import { Scale, Shield, ArrowLeft } from '@/app/components/ui/lucideIcons';
import { COLORS } from './SharedComponents';
import { BackgroundImagePlaceholder } from '../assets/logo-placeholders';
import { HorizontalCategoryPill } from '@/app/components/shared/HorizontalCategoryPill';

// 🚀 DEV MODE - Quick Login Flag
const DEV_MODE = import.meta.env.DEV;
const MainSplashBackgroundSrc = BackgroundImagePlaceholder;

export type SplashSelectedRole = 'lawyer';

interface SplashScreenProps {
  onComplete: (role: SplashSelectedRole) => void;
}

// --- Global Ambient Background Particles ---
const GlobalAmbientDust = () => {
  const particles = Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 10 + 10,
    delay: Math.random() * 5,
    xMove: Math.random() * 40 - 20,
    yMove: Math.random() * 40 - 20,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full opacity-20"
          style={{
            top: p.top,
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: COLORS.gold, // Updated to Theme Gold
            boxShadow: `0 0 ${p.size * 2}px rgba(230, 198, 115, 0.4)`
          }}
          animate={{
            y: [0, p.yMove],
            x: [0, p.xMove],
            opacity: [0, 0.4, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            repeatType: "mirror",
            delay: p.delay,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
};

export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  
  const handleSelect = (role: SplashSelectedRole) => {
    setTimeout(() => onComplete(role), 800);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-['Tajawal'] select-none bg-[#05060D]" dir="rtl">
      
      {/* BACKGROUND - ALIVE */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* 1. Breathing Background Image - Locked Position, Subtle Scale */}
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: `url("${MainSplashBackgroundSrc}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
            }}
          />
        </div>
        
        {/* 2. Global Gold Dust - Floating everywhere */}
        <GlobalAmbientDust />

        {/* 3. Gradient Overlay - Deep Navy */}
        <motion.div 
            className="absolute inset-0 bg-gradient-to-t from-[#05060D] via-[#05060D]/80 to-transparent pointer-events-none z-0" 
            animate={{ opacity: [0.9, 0.8, 0.95] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* 4. Bottom Fade */}
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[#05060D] via-[#05060D]/90 to-transparent pointer-events-none z-0" />
      </div>

      {/* CONTENT */}
      <div className="absolute inset-0 z-10 flex flex-col px-6 pb-14 pt-12">
        {/* 🚀 DEV MODE BADGE (Top Right) */}
        {DEV_MODE && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-6 left-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 z-50"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            DEV MODE
          </motion.div>
        )}

        {/* 🚀 DEV MODE: Quick Lawyer Access (Top Left) */}
        {DEV_MODE && (
          <motion.button
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => handleSelect('lawyer')}
            className="absolute top-6 right-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-50 transition-all"
          >
            <Shield size={14} />
            <span>🚀 محامي</span>
          </motion.button>
        )}

        <div className="flex-grow" />

        <div className="w-full max-w-md mx-auto space-y-6">
          <div className="flex flex-col gap-2 relative">

            {/* HINT TEXT */}
            <div className="flex items-center justify-start gap-2 mb-2 px-2">
                 <motion.span 
                    animate={{ opacity: [0.6, 1, 0.6], x: [0, -2, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="text-[#E6C673] text-xs font-bold tracking-[0.1em] uppercase font-['Tajawal'] drop-shadow-md"
                 >
                    اضغط للاختيار
                 </motion.span>
                 <motion.div
                    animate={{ x: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                 >
                    <ArrowLeft className="w-4 h-4 text-[#E6C673]" />
                 </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.45 }}>
              <HorizontalCategoryPill
                title="أنا محامي"
                subtitle="بوابة المحامين"
                icon={Scale}
                onClick={() => handleSelect('lawyer')}
              />
            </motion.div>
          </div>

          <div className="w-full text-center pt-2 flex flex-col items-center gap-0.5">
             <p className="text-[#E6C673]/90 text-sm font-['Tajawal'] tracking-wide font-bold drop-shadow-md">
                مطور التطبيق : احمد مهدي كريو
             </p>
             <p className="text-[#E6C673]/60 text-[10px] font-['Tajawal'] tracking-wider">
                مطور مستقل
             </p>
          </div>

        </div>
      </div>
    </div>
  );
};