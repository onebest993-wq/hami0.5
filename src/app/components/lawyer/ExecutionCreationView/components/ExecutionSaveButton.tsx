import React from 'react';

interface ExecutionSaveButtonProps {
    onSubmit: () => void;
    buttonText?: string;
}

export const ExecutionSaveButton: React.FC<ExecutionSaveButtonProps> = ({
    onSubmit,
    buttonText = 'فتح إضبارة تنفيذية',
}) => {
    return (
        <div className="flex-shrink-0 px-4 pb-4 z-20">
            <button type="button"
                onClick={onSubmit}
                className="relative w-full group overflow-hidden rounded-xl h-16"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 backdrop-blur-xl rounded-xl"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/0 via-emerald-400/20 to-teal-400/30 opacity-0 group-hover:opacity-100 transition-all duration-700 rounded-xl"></div>
                <div className="absolute inset-0 rounded-xl border-2 border-emerald-400/40 group-hover:border-emerald-400/70 transition-all duration-300"></div>
                <div className="absolute inset-[2px] rounded-[10px] border border-emerald-300/20 group-hover:border-emerald-300/40 transition-all duration-300"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1200 rounded-xl"></div>
                <div className="absolute inset-0 rounded-xl shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)] group-hover:shadow-[inset_0_3px_8px_rgba(255,255,255,0.15)] transition-all duration-300"></div>
                <div className="absolute inset-0 rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] group-hover:shadow-[0_0_45px_rgba(16,185,129,0.6),0_0_70px_rgba(20,184,166,0.3)] transition-all duration-500"></div>
                <div className="relative flex items-center justify-center h-full group-active:scale-[0.96] transition-transform duration-150">
                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-teal-200 to-cyan-200 group-hover:from-emerald-100 group-hover:via-teal-100 group-hover:to-cyan-100 tracking-wide drop-shadow-[0_2px_15px_rgba(16,185,129,0.5)] group-hover:drop-shadow-[0_3px_20px_rgba(16,185,129,0.7)] transition-all duration-300">
                        {buttonText}
                    </span>
                </div>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-4/5 h-5 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent blur-2xl rounded-full opacity-60 group-hover:opacity-100 group-hover:h-7 group-hover:w-full transition-all duration-500"></div>
                <div className="absolute top-2 right-2 w-2 h-2 bg-emerald-300 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-300"></div>
                <div className="absolute top-2 left-2 w-2 h-2 bg-teal-300 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-300" style={{animationDelay: '150ms'}}></div>
                <div className="absolute bottom-2 right-2 w-2 h-2 bg-cyan-300 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-300" style={{animationDelay: '300ms'}}></div>
                <div className="absolute bottom-2 left-2 w-2 h-2 bg-emerald-400 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-300" style={{animationDelay: '450ms'}}></div>
            </button>
        </div>
    );
};
