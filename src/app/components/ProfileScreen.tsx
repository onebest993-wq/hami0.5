import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, Phone, Mail, Info, Save, User } from '@/app/components/ui/lucideIcons';
import { useAuth } from '@/app/context/AuthContext';
import { ProfileDB } from '@/app/services/lawyer-cloud';

interface ProfileScreenProps {
    onBack: () => void;
    role: 'lawyer' | 'client';
    onNavigate: (target: 'privacy' | 'support' | 'settings') => void;
}

export const ProfileScreen = ({ onBack, role, onNavigate }: ProfileScreenProps) => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [bio, setBio] = useState('');

    const userId = user?.id || '';
    const email = user?.email || '';
    const metaFullName = (user?.user_metadata as Record<string, unknown>)?.full_name as string || '';

    useEffect(() => {
        const load = async () => {
            if (!userId) { setLoading(false); return; }
            try {
                const profile = await ProfileDB.getProfile(userId);
                setName(profile.header.name || metaFullName);
                const bioSection = profile.sections.find(s => s.type === 'bio');
                if (bioSection && typeof bioSection.data === 'string') {
                    setBio(bioSection.data);
                }
            } catch { /* use defaults */ }
            setLoading(false);
        };
        load();
    }, [userId, metaFullName]);

    const handleSave = useCallback(async () => {
        if (!userId) return;
        setSaving(true);
        try {
            const existing = await ProfileDB.getProfile(userId);
            existing.header.name = name;
            const bioIdx = existing.sections.findIndex(s => s.type === 'bio');
            if (bioIdx >= 0) {
                existing.sections[bioIdx] = { ...existing.sections[bioIdx], data: bio };
            }
            await ProfileDB.saveProfile(userId, existing);
            setIsEditing(false);
        } catch { /* ignore */ }
        setSaving(false);
    }, [userId, name, bio]);

    if (loading) return (
        <div className="min-h-screen bg-[#131620] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#E6C673] border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#131620] flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 flex items-center gap-4 bg-[#1A1E2E] border-b border-white/5">
                <button type="button" onClick={onBack} className="p-2 hover:bg-white/5 rounded-lg text-white/60 hover:text-white transition-colors">
                    <ChevronRight size={22} />
                </button>
                <h1 className="text-white font-bold text-lg">الملف الشخصي</h1>
            </div>

            {/* Avatar + Name */}
            <div className="flex flex-col items-center py-8 px-5">
                <div className="relative mb-4">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#E6C673] to-[#D4AF37] p-[3px]">
                        <div className="w-full h-full rounded-full bg-[#1A1E2E] flex items-center justify-center overflow-hidden">
                            <User size={40} className="text-[#E6C673]" />
                        </div>
                    </div>
                </div>

                {isEditing ? (
                    <div className="w-full max-w-md space-y-4">
                        <div>
                            <label className="text-white/50 text-xs block mb-1 pr-1">الاسم الكامل</label>
                            <div className="relative">
                                <User size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-[#131620] border border-white/10 rounded-xl pr-12 pl-4 py-3 text-white focus:border-[#E6C673] outline-none"
                                    placeholder="الاسم"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-white/50 text-xs block mb-1 pr-1">البريد الإلكتروني</label>
                            <div className="relative">
                                <Mail size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30" />
                                <input
                                    type="email"
                                    value={email}
                                    disabled
                                    className="w-full bg-[#131620] border border-white/10 rounded-xl pr-12 pl-4 py-3 text-white/50 outline-none cursor-not-allowed"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-white/50 text-xs block mb-1 pr-1">رقم الهاتف</label>
                            <div className="relative">
                                <Phone size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30" />
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    className="w-full bg-[#131620] border border-white/10 rounded-xl pr-12 pl-4 py-3 text-white focus:border-[#E6C673] outline-none"
                                    placeholder="رقم الهاتف"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-white/50 text-xs block mb-1 pr-1">نبذة تعريفية</label>
                            <textarea
                                value={bio}
                                onChange={e => setBio(e.target.value)}
                                className="w-full bg-[#131620] border border-white/10 rounded-xl p-4 text-white focus:border-[#E6C673] outline-none resize-none h-28"
                                placeholder={role === 'lawyer' ? 'نبذة عن خبراتك القانونية...' : 'نبذة تعريفية...'}
                            />
                        </div>
                        <button type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full bg-[#E6C673] hover:bg-[#D4B360] text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            {saving ? (
                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Save size={18} />
                            )}
                            حفظ التغييرات
                        </button>
                    </div>
                ) : (
                    <div className="text-center mb-6">
                        <h2 className="text-white font-bold text-xl mb-1">{name || metaFullName || 'مستخدم'}</h2>
                        <p className="text-[#E6C673] text-sm">{role === 'lawyer' ? 'محامٍ' : 'عميل'}</p>
                        {bio && <p className="text-white/40 text-sm mt-3 max-w-md leading-relaxed">{bio}</p>}
                        <button type="button"
                            onClick={() => setIsEditing(true)}
                            className="mt-6 px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-white/70 hover:text-white transition-all border border-white/5"
                        >
                            تعديل الملف الشخصي
                        </button>
                    </div>
                )}
            </div>

            {/* Info Cards */}
            <div className="px-5 space-y-3 pb-8">
                <div className="bg-[#1A1E2E] rounded-xl p-4 flex items-center gap-4 border border-white/5">
                    <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                        <Mail size={20} />
                    </div>
                    <div>
                        <p className="text-white/40 text-xs">البريد الإلكتروني</p>
                        <p className="text-white text-sm">{email || 'غير محدد'}</p>
                    </div>
                </div>

                <div className="bg-[#1A1E2E] rounded-xl p-4 flex items-center gap-4 border border-white/5">
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                        <Phone size={20} />
                    </div>
                    <div>
                        <p className="text-white/40 text-xs">رقم الهاتف</p>
                        <p className="text-white text-sm">{phone || 'غير محدد'}</p>
                    </div>
                </div>

                <button type="button" onClick={() => onNavigate('settings')} className="w-full bg-[#1A1E2E] rounded-xl p-4 flex items-center gap-4 border border-white/5 hover:border-[#E6C673]/30 transition-all text-right">
                    <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500">
                        <Info size={20} />
                    </div>
                    <span className="flex-1 text-white text-sm font-medium">الإعدادات</span>
                    <ChevronRight size={18} className="text-white/30" />
                </button>
            </div>
        </div>
    );
};
