import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Eye, EyeOff, type LucideIcon } from 'lucide-react';

interface StackInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    icon?: LucideIcon;
    isPassword?: boolean;
    onClear?: () => void;
    showClear?: boolean;
}

export const StackInputField = ({ label, icon: Icon, isPassword, onClear, showClear, className, ...props }: StackInputProps) => {
    const [showPass, setShowPass] = useState(false);
    const inputType = isPassword ? (showPass ? 'text' : 'password') : props.type || 'text';

    return (
        <div className="w-full space-y-2">
            <label className="text-xs text-[#D4AF37] font-medium block pr-1">{label}</label>
            <div className="relative group h-12">
                <input
                    {...props}
                    type={inputType}
                    className={`w-full h-full bg-[#001830]/60 border border-white/10 rounded-xl px-4 text-white placeholder-gray-500 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all text-right
                    ${Icon ? 'pr-11' : ''} ${isPassword || showClear ? 'pl-11' : ''} ${className} ${props.readOnly ? 'cursor-pointer' : ''}`}
                />
                {Icon && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#D4AF37] pointer-events-none transition-colors">
                        <Icon size={18} />
                    </div>
                )}
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center z-20">
                    {isPassword && (
                        <button
                            type="button"
                            onClick={() => setShowPass(!showPass)}
                            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-[#D4AF37] transition-all backdrop-blur-sm shadow-lg"
                        >
                            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                    )}
                    {showClear && !isPassword && props.value && !props.readOnly && (
                        <motion.button
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            type="button"
                            onClick={onClear}
                            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 transition-all backdrop-blur-sm"
                        >
                            <X size={12} strokeWidth={3} />
                        </motion.button>
                    )}
                </div>
            </div>
        </div>
    );
};
