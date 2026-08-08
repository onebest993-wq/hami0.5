import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, AlertTriangle, Info, X, Sparkles } from '@/app/components/ui/lucideIcons';
import { useGhostStore, Insight } from '../../stores/ghostStore';
import { cn } from '../ui/utils';

export const GhostInsightBar = () => {
  const insights = useGhostStore((s) => s.insights);
  const removeInsight = useGhostStore((s) => s.removeInsight);
  const [activeInsight, setActiveInsight] = useState<Insight | null>(null);

  useEffect(() => {
    if (insights.length > 0) {
      setActiveInsight(insights[0] ?? null);
    } else {
      setActiveInsight(null);
    }
  }, [insights]);

  if (!activeInsight) return null;

  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <AnimatePresence mode="wait">
        {activeInsight && (
          <motion.div
            key={activeInsight.id}
            initial={{ y: -100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="pointer-events-auto w-full max-w-lg"
          >
            <div className={cn(
              "relative overflow-hidden rounded-xl border p-4 shadow-2xl backdrop-blur-md",
              activeInsight.type === 'alert' && "bg-red-50/90 border-red-200 text-red-900",
              activeInsight.type === 'suggestion' && "bg-amber-50/90 border-amber-200 text-amber-900",
              activeInsight.type === 'info' && "bg-blue-50/90 border-blue-200 text-blue-900",
              "dark:bg-slate-900/90 dark:text-slate-100"
            )}>
              {/* Glowing Effect Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />

              <div className="flex items-start gap-4">
                <div className={cn(
                  "p-2 rounded-full shrink-0",
                  activeInsight.type === 'alert' && "bg-red-100 text-red-600",
                  activeInsight.type === 'suggestion' && "bg-amber-100 text-amber-600",
                  activeInsight.type === 'info' && "bg-blue-100 text-blue-600"
                )}>
                  {activeInsight.type === 'alert' && <AlertTriangle size={20} />}
                  {activeInsight.type === 'suggestion' && <Sparkles size={20} />}
                  {activeInsight.type === 'info' && <Info size={20} />}
                </div>

                <div className="flex-1 pt-0.5">
                  <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
                    {activeInsight.title}
                    <span className="text-[10px] uppercase tracking-wider opacity-60 px-1.5 py-0.5 rounded border border-current">
                      Ghost AI
                    </span>
                  </h3>
                  <p className="text-sm opacity-90 leading-relaxed">
                    {activeInsight.message}
                  </p>
                  
                  {activeInsight.action && (
                    <button type="button"
                      onClick={() => {
                        activeInsight.action?.onClick();
                        removeInsight(activeInsight.id);
                      }}
                      className="mt-3 text-xs font-medium bg-white/50 hover:bg-white/80 px-3 py-1.5 rounded-md transition-colors border border-black/5"
                    >
                      {activeInsight.action.label}
                    </button>
                  )}
                </div>

                <button type="button" 
                  onClick={() => removeInsight(activeInsight.id)}
                  className="text-black/40 hover:text-black/70 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};