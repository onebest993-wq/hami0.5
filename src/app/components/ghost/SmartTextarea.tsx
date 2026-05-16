import React, { useState, useEffect, useRef } from 'react';
import { Lightbulb, Loader2 } from 'lucide-react';
import { useGhostStore } from '../../stores/ghostStore';
import { analyzeLegalText } from '../../lib/ghost-engine';
import { cn } from '../ui/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SmartTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onGhostCorrection?: (newText: string) => void;
}

export const SmartTextarea = React.forwardRef<HTMLTextAreaElement, SmartTextareaProps>(
  ({ className, value, onChange, onGhostCorrection, ...props }, ref) => {
    const [localValue, setLocalValue] = useState(value as string || '');
    const [isThinking, setIsThinking] = useState(false);
    const [hasInsight, setHasInsight] = useState(false);
    const [lastAnalysis, setLastAnalysis] = useState<any>(null);
    const debounceTimer = useRef<NodeJS.Timeout>();
    
    const addInsight = useGhostStore((s) => s.addInsight);

    useEffect(() => {
      setLocalValue(value as string || '');
    }, [value]);

    useEffect(() => {
      return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newVal = e.target.value;
      setLocalValue(newVal);
      if (onChange) onChange(e);

      setHasInsight(false);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      
      debounceTimer.current = setTimeout(async () => {
        if (newVal.length > 10) {
            setIsThinking(true);
            try {
                const result = await analyzeLegalText(newVal);
                if (result.found) {
                    setHasInsight(true);
                    setLastAnalysis(result);
                }
            } finally {
                setIsThinking(false);
            }
        }
      }, 1500);
    };

    const handleGhostClick = () => {
      if (lastAnalysis) {
        addInsight({
          title: lastAnalysis.title,
          message: lastAnalysis.message,
          type: lastAnalysis.type || 'info',
          action: lastAnalysis.correction ? {
            label: `تصحيح إلى: ${lastAnalysis.correction}`,
            onClick: () => {
              if (onGhostCorrection) {
                 onGhostCorrection(lastAnalysis.correction);
              }
            }
          } : undefined
        });
      }
    };

    return (
      <div className="relative group">
        <textarea
          ref={ref}
          value={localValue}
          onChange={handleChange}
          className={cn(
            "w-full min-h-[120px] p-4 rounded-xl border bg-white dark:bg-slate-900 transition-all duration-500 outline-none resize-y",
            hasInsight 
                ? "border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)]" 
                : "border-gray-200 focus:border-blue-500",
            className
          )}
          {...props}
        />
        
        <AnimatePresence>
            {(hasInsight || isThinking) && (
                <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    onClick={handleGhostClick}
                    className={cn(
                        "absolute top-4 left-4 p-2 rounded-full shadow-lg transition-colors z-10",
                        isThinking ? "bg-blue-50 text-blue-500" : "bg-amber-100 text-amber-600 hover:bg-amber-200 cursor-pointer"
                    )}
                >
                    {isThinking ? (
                        <Loader2 className="animate-spin" size={16} />
                    ) : (
                        <Lightbulb size={18} className={hasInsight ? "animate-pulse" : ""} />
                    )}
                </motion.button>
            )}
        </AnimatePresence>
      </div>
    );
  }
);

SmartTextarea.displayName = 'SmartTextarea';