import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, Settings, Phone, MessageCircle, Globe, MapPin, Mail } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { ProfileDB, LawyerProfileData, LawyerProfileSection, ProfileAction, LawyerProfileHeader, ProfileStat } from '@/app/services/lawyer-cloud';
import { SmartToast } from '@/app/components/ui/SmartToast';

export const RoyalLawyerProfile = (props: Record<string, unknown>) => {
    const { user } = useAuth();
    const isScreenMode = props.isScreenMode === true;

    const [profile, setProfile] = useState<LawyerProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCustomizing, setIsCustomizing] = useState(false);
    const [editHeader, setEditHeader] = useState<LawyerProfileHeader | null>(null);
    const [editSections, setEditSections] = useState<LawyerProfileSection[]>([]);

    const userId = user?.id || '';
    const email = user?.email || '';

    useEffect(() => {
        const load = async () => {
            if (!userId) { setLoading(false); return; }
            try {
                const data = await ProfileDB.getProfile(userId);
                if (!data.header.name) data.header.name = (user?.user_metadata as Record<string, unknown>)?.full_name as string || '';
                setProfile(data);
            } catch { /* */ }
            setLoading(false);
        };
        load();
    }, [userId, user]);

    const startCustomizing = useCallback(() => {
        if (!profile) return;
        setEditHeader({ ...profile.header });
        setEditSections(JSON.parse(JSON.stringify(profile.sections)));
        setIsCustomizing(true);
    }, [profile]);

    const saveCustomization = useCallback(async () => {
        if (!userId || !editHeader) return;
        const updated: LawyerProfileData = {
            header: editHeader,
            sections: editSections,
        };
        await ProfileDB.saveProfile(userId, updated);
        setProfile(updated);
        setIsCustomizing(false);
        SmartToast.success('تم حفظ التغييرات');
    }, [userId, editHeader, editSections]);

    const addSection = useCallback((type: LawyerProfileSection['type']) => {
        const id = `section-${Date.now()}`;
        const newSection: LawyerProfileSection = {
            id, type,
            data: type === 'stats' ? [{ id: `stat-${Date.now()}`, label: 'إحصائية جديدة', value: '0' }] :
                  type === 'actions' ? [{ id: `action-${Date.now()}`, type: 'whatsapp', label: 'واتساب', value: '' }] :
                  type === 'gallery' ? [] : '',
        };
        setEditSections(prev => [...prev, newSection]);
    }, []);

    const removeSection = useCallback((sectionId: string) => {
        setEditSections(prev => prev.filter(s => s.id !== sectionId));
    }, []);

    const updateSectionData = useCallback((sectionId: string, data: LawyerProfileSection['data']) => {
        setEditSections(prev => prev.map(s => s.id === sectionId ? { ...s, data } : s));
    }, []);

    if (loading) return (
        <div className="min-h-screen bg-[#131620] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#E6C673] border-t-transparent rounded-full animate-spin" />
        </div>
    );

    const header = profile?.header;
    const sections = profile?.sections || [];
    const displayName = header?.name || 'الملف الشخصي';

    const content = (
        <div className="min-h-screen bg-[#131620] flex flex-col">
            {/* Header */}
            {!isScreenMode && (
                <div className="px-5 py-4 flex items-center gap-4 bg-[#1A1E2E] border-b border-white/5">
                    <button type="button" onClick={() => props.onClose && typeof props.onClose === 'function' && (props.onClose as () => void)()} className="p-2 hover:bg-white/5 rounded-lg text-white/60 hover:text-white transition-colors">
                        <ChevronRight size={22} />
                    </button>
                    <h1 className="text-white font-bold text-lg">الملف التعريفي</h1>
                </div>
            )}

            {/* Customize Button */}
            {!isCustomizing && (
                <button type="button" onClick={startCustomizing} className="absolute top-20 left-4 z-20 p-3 bg-[#1A1E2E]/80 backdrop-blur-sm rounded-xl border border-white/10 text-white/60 hover:text-[#E6C673] transition-all">
                    <Settings size={20} />
                </button>
            )}

            {/* Cover + Avatar */}
            <div className="relative">
                <div className="h-52 bg-gradient-to-br from-[#1A1E2E] to-[#131620] overflow-hidden">
                    {header?.coverImage && (
                        <img src={header.coverImage} alt="" className="w-full h-full object-cover opacity-40" />
                    )}
                </div>
                <div className="absolute -bottom-16 right-6">
                    <div className="w-32 h-32 rounded-full border-4 border-[#1A1E2E] bg-gradient-to-br from-[#E6C673] to-[#D4AF37] p-[3px]">
                        <div className="w-full h-full rounded-full bg-[#131620] overflow-hidden flex items-center justify-center">
                            {header?.profileImage ? (
                                <img src={header.profileImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl font-bold text-[#E6C673]">{displayName.charAt(0)}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Name + Title */}
            <div className="pt-20 pb-6 px-6">
                <h2 className="text-white text-2xl font-bold">{displayName}</h2>
                <p className="text-[#E6C673] text-sm mt-1">{header?.title || ''}</p>
                <p className="text-white/30 text-xs mt-1">{email}</p>
            </div>

            {/* Sections */}
            <div className="px-6 pb-20 space-y-6">
                {sections.map(section => (
                    <div key={section.id}>
                        {section.type === 'stats' && Array.isArray(section.data) && (
                            <div className="grid grid-cols-3 gap-3">
                                {(section.data as ProfileStat[]).map(stat => (
                                    <div key={stat.id} className="bg-[#1A1E2E] rounded-xl p-4 text-center border border-white/5">
                                        <p className="text-[#E6C673] text-2xl font-bold">{stat.value}</p>
                                        <p className="text-white/40 text-xs mt-1">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {section.type === 'bio' && typeof section.data === 'string' && section.data && (
                            <div className="bg-[#1A1E2E] rounded-xl p-5 border border-white/5">
                                <h3 className="text-white/60 text-sm font-bold mb-3">نبذة تعريفية</h3>
                                <p className="text-white/70 text-sm leading-relaxed">{section.data}</p>
                            </div>
                        )}
                        {section.type === 'gallery' && Array.isArray(section.data) && section.data.length > 0 && (
                            <div>
                                <h3 className="text-white/60 text-sm font-bold mb-3">معرض الصور</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {(section.data as string[]).map((url, i) => (
                                        <div key={i} className="aspect-square rounded-xl overflow-hidden bg-[#1A1E2E]">
                                            <img src={url} alt="" className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {section.type === 'actions' && Array.isArray(section.data) && section.data.length > 0 && (
                            <div className="space-y-2">
                                {(section.data as ProfileAction[]).map(action => (
                                    <a key={action.id}
                                        href={action.type === 'whatsapp' ? `https://wa.me/${action.value}` :
                                              action.type === 'call' ? `tel:${action.value}` :
                                              action.type === 'email' ? `mailto:${action.value}` :
                                              action.type === 'website' ? action.value :
                                              action.type === 'location' ? `https://maps.google.com/?q=${encodeURIComponent(action.value)}` : '#'}
                                        target="_blank" rel="noopener noreferrer"
                                        className="bg-[#1A1E2E] rounded-xl p-4 flex items-center gap-4 border border-white/5 hover:border-[#E6C673]/30 transition-all"
                                    >
                                        <div className={`p-3 rounded-xl ${
                                            action.type === 'whatsapp' ? 'bg-emerald-500/10 text-emerald-500' :
                                            action.type === 'call' ? 'bg-blue-500/10 text-blue-500' :
                                            action.type === 'email' ? 'bg-red-500/10 text-red-500' :
                                            action.type === 'website' ? 'bg-purple-500/10 text-purple-500' :
                                            'bg-amber-500/10 text-amber-500'
                                        }`}>
                                            {action.type === 'whatsapp' ? <MessageCircle size={20} /> :
                                             action.type === 'call' ? <Phone size={20} /> :
                                             action.type === 'email' ? <Mail size={20} /> :
                                             action.type === 'website' ? <Globe size={20} /> :
                                             <MapPin size={20} />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-white text-sm font-medium">{action.label}</p>
                                            <p className="text-white/30 text-xs">{action.value}</p>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    return content;
};
