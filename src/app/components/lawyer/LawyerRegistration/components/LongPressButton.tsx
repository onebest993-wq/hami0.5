import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Fingerprint } from 'lucide-react';

interface LongPressButtonProps {
    onComplete: () => void;
    label: string;
    disabled?: boolean;
}

export const LongPressButton = ({ onComplete, label, disabled }: LongPressButtonProps) => {
    const [progress, setProgress] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const startPress = () => {
        if (disabled) return;
        intervalRef.current = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    setTimeout(() => onComplete(), 0);
                    return 100;
                }
                return prev + 2;
            });
        }, 20);
    };

    const endPress = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (progress < 100) setProgress(0);
    };

    return (
        <div className={`relative w-full select-none touch-none transition-all duration-500 ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'opacity-100'}`}>
            <motion.button
                onMouseDown={startPress}
                onMouseUp={endPress}
                onMouseLeave={endPress}
                onTouchStart={startPress}
                onTouchEnd={endPress}
                whileTap={disabled ? undefined : { scale: 0.98 }}
                className={`relative w-full h-14 rounded-xl border overflow-hidden flex items-center justify-center group
                    ${disabled ? 'bg-gray-800 border-gray-700' : 'bg-[#001830] border-[#D4AF37]'}`}
            >
                {!disabled && (
                    <motion.div
                        className="absolute left-0 top-0 bottom-0 bg-[#D4AF37]"
                        style={{ width: `${progress}%` }}
                    />
                )}
                <div className={`relative z-10 flex items-center gap-2 font-bold transition-colors duration-300 mix-blend-difference
                    ${disabled ? 'text-gray-500' : 'text-[#D4AF37]'}`}>
                    <Fingerprint size={20} />
                    <span className="text-sm">{progress === 100 ? 'تم التوقيع بنجاح' : label}</span>
                </div>
            </motion.button>
        </div>
    );
};
