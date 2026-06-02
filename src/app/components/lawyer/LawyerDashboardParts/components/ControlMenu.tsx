import React from 'react';
import { Settings, UserCircle } from 'lucide-react';

interface ControlMenuProps {
    onClose: () => void;
    onLogout: () => void;
    onOpenSettings: () => void;
    onOpenProfile: () => void;
    onSwitchRole: (role: string) => void;
}

function ControlMenu({ onClose, onLogout, onOpenSettings, onOpenProfile, onSwitchRole }: ControlMenuProps) {
    return (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex justify-center items-end sm:items-center p-4 animate-in fade-in zoom-in-95 duration-200" onClick={onClose}>
            <div className="bg-[#1A1E2E] w-full max-w-sm rounded-3xl border border-white/10 p-6 space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full bg-[#E6C673]/20 flex items-center justify-center text-[#E6C673]">
                        <Settings size={24} />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg">الإعدادات والتحكم</h3>
                        <p className="text-white/40 text-xs">تخصيص تجربة المحامي</p>
                    </div>
                </div>

                <button type="button" onClick={onOpenProfile} className="w-full h-14 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center px-4 gap-3 text-white transition-colors">
                    <UserCircle size={20} className="text-[#E6C673]" />
                    <span className="font-bold">الملف الشخصي</span>
                </button>

                <button type="button" onClick={onOpenSettings} className="w-full h-14 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center px-4 gap-3 text-white transition-colors">
                    <Settings size={20} className="text-[#E6C673]" />
                    <span className="font-bold">إعدادات التطبيق</span>
                </button>

                <div className="h-px bg-white/10 my-2" />

                <button type="button" onClick={onLogout} className="w-full h-14 bg-red-500/10 hover:bg-red-500/20 rounded-2xl flex items-center px-4 gap-3 text-red-500 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                        <UserCircle size={16} /> 
                    </div>
                    <span className="font-bold">تسجيل الخروج</span>
                </button>
            </div>
        </div>
    );
}

export default ControlMenu;
