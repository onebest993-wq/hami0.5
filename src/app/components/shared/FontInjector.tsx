import React from 'react';

/** حقن خطوط/خلفية أساسية — بدون motion أو lucide (مسار الإقلاع) */
export const FontInjector = React.memo(() => (
    <style>{`
    body { font-family: 'Tajawal', 'Cairo', sans-serif; background-color: #05060D; color: white; }

    .royal-texture {
        background-color: #05060D;
        background-image:
            radial-gradient(circle at 50% 50%, rgba(230, 198, 115, 0.03) 0%, transparent 50%),
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
        background-size: 100% 100%, 40px 40px, 40px 40px;
        background-attachment: fixed;
    }

    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(230, 198, 115, 0.2); border-radius: 4px; }
  `}</style>
));
