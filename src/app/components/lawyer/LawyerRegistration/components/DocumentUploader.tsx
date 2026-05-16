import React, { useRef } from 'react';
import { Camera, Check } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';

interface DocumentUploaderProps {
    label: string;
    value: string | null;
    onUpload: (filename: string) => void;
    devMode?: boolean;
}

export const DocumentUploader = ({ label, value, onUpload, devMode }: DocumentUploaderProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAction = () => {
        if (devMode) {
            fileInputRef.current?.click();
        } else {
            SmartToast.info('كاميرا فقط: سيتم فتح الكاميرا الآمنة لالتقاط صورة مباشرة.');
            setTimeout(() => onUpload('data:image/png;base64,SimulatedCameraImage'), 1000);
        }
    };

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => onUpload(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-2 group">
            <label className="text-xs text-[#D4AF37] font-medium group-hover:text-white transition-colors">{label}</label>
            <div
                onClick={handleAction}
                className={`w-full h-32 rounded-2xl border border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300 overflow-hidden relative
                ${value
                    ? 'border-[#D4AF37] bg-[#D4AF37]/5'
                    : 'border-[#D4AF37]/30 bg-[#001020]/50 hover:bg-[#D4AF37]/5 hover:border-[#D4AF37]/60'}`}
            >
                {value ? (
                    <>
                        <img src={value} alt="Preview" className="w-full h-full object-cover opacity-60" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-[#D4AF37] text-[#00102A] px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                                <Check size={12} strokeWidth={3} /> تم الرفع
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <Camera className="text-[#D4AF37]/50 mb-3 group-hover:scale-110 transition-transform" size={28} />
                        <span className="text-xs text-gray-400 group-hover:text-[#D4AF37] transition-colors">
                            {devMode ? 'رفع صورة (مطور)' : 'التقاط (كاميرا)'}
                        </span>
                    </>
                )}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFile} />
            </div>
        </div>
    );
};
