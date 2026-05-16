import React from 'react';

interface DirectorateSectionProps {
    directorate: string;
    fileNumber: string;
    onDirectorateChange: (v: string) => void;
    onFileNumberChange: (v: string) => void;
}

export const DirectorateSection: React.FC<DirectorateSectionProps> = ({
    directorate,
    fileNumber,
    onDirectorateChange,
    onFileNumberChange,
}) => {
    return (
        <div className="w-full px-3 py-4">
            <div className="mb-5 pb-3 border-b border-amber-500/30">
                <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 tracking-wide drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]">
                    بيانات المديرية
                </h3>
            </div>

            <div className="flex flex-col gap-4 w-full">
                <div className="w-full">
                    <input
                        type="text"
                        placeholder="اسم المديرية"
                        value={directorate}
                        onChange={(e) => onDirectorateChange(e.target.value)}
                        className="w-full bg-[#111827] border border-gray-700 text-white p-3.5 rounded-lg focus:border-amber-500 outline-none placeholder-gray-500/50 transition-colors"
                    />
                </div>

                <div className="w-full">
                    <input
                        type="text"
                        placeholder="رقم الإضبارة"
                        value={fileNumber}
                        onChange={(e) => onFileNumberChange(e.target.value)}
                        className="w-full bg-[#111827] border border-gray-700 text-white p-3.5 rounded-lg focus:border-amber-500 outline-none placeholder-gray-500/50 font-mono transition-colors text-right"
                        dir="ltr"
                        style={{ textAlign: 'right' }}
                    />
                </div>
            </div>
        </div>
    );
};
