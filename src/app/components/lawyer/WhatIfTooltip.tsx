import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Brain } from '@/app/components/ui/lucideIcons';

interface WhatIfTooltipProps {
    docType?: string;
}

export const WhatIfTooltip: React.FC<WhatIfTooltipProps> = ({ docType }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    
    const getContent = () => {
        if (docType === 'السندات المتضمنة إقراراً بدين') {
            return 'إذا أنكر المدين توقيعه، سيُبطل المنفذ الإجراءات. جهز نفسك لدعوى (مضاهاة تواقيع) في البداءة.';
        }
        
        if (docType === 'الأوراق التجارية') {
            return 'إذا ادعى المدين تزوير الصك، سيُكلف بمراجعة محكمة التحقيق، وسيُوقف التنفيذ مؤقتاً لحين حسم الدعوى الجزائية.';
        }
        
        return 'استخدم هذا المؤشر لمعرفة ماذا يحدث إذا اعترض المدين على السند.';
    };
    
    const shouldShow = docType === 'السندات المتضمنة إقراراً بدين' || docType === 'الأوراق التجارية';
    
    if (!shouldShow) return null;
    
    return (
        <div className="relative">
            <button type="button"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg p-1.5 transition-all group"
                title="ماذا لو اعترض المدين؟"
            >
                <Brain size={18} className="text-blue-400 group-hover:text-blue-300" />
            </button>
            
            {showTooltip && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute top-full left-0 mt-2 bg-[#0B1120] border-2 border-blue-500/50 rounded-xl p-3 shadow-2xl z-[9999] w-64"
                >
                    <div className="absolute -top-2 left-4 w-4 h-4 bg-[#0B1120] border-t-2 border-l-2 border-blue-500/50 rotate-45" />
                    <div className="flex items-start gap-2 mb-2">
                        <Brain size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                        <h4 className="text-blue-300 font-bold text-sm">💡 ماذا لو اعترض المدين؟</h4>
                    </div>
                    <p className="text-gray-300 text-xs leading-relaxed">
                        {getContent()}
                    </p>
                </motion.div>
            )}
        </div>
    );
};
