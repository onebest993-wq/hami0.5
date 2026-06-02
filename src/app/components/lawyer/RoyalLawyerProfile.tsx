import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    ArrowRight,
    Briefcase,
    Camera,
    Check,
    Copy,
    Edit3,
    FileText,
    Gavel,
    Globe,
    Mail,
    MapPin,
    MessageCircle,
    Phone,
    Plus,
    Scale,
    Share2,
    StickyNote,
    Trash2,
    X,
    Award,
    Building2,
    Landmark,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import {
    ProfileDB,
    type LawyerProfileData,
    type LawyerProfileHeader,
    type LawyerProfileSection,
    type ProfileAction,
} from '@/app/services/lawyer-cloud';
import { useLawyerSettingsOptional } from '@/app/context/LawyerSettingsContext';
import { uploadProfileMedia, profileMediaErrorMessage } from '@/app/services/profileMediaService';
import { useLawyerProfileStats } from '@/app/hooks/useLawyerProfileStats';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { SmartDialog } from '@/app/components/ui/SmartDialog';

const GLASS =
    'bg-white/[0.06] backdrop-blur-[24px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)]';

type EditDraft = {
    header: LawyerProfileHeader;
    bio: string;
    actions: ProfileAction[];
    gallery: string[];
};

function getBio(sections: LawyerProfileSection[]): string {
    const s = sections.find((x) => x.type === 'bio');
    return s && typeof s.data === 'string' ? s.data : '';
}

function getActions(sections: LawyerProfileSection[]): ProfileAction[] {
    const s = sections.find((x) => x.type === 'actions');
    return s && Array.isArray(s.data) ? (s.data as ProfileAction[]) : [];
}

function getGallery(sections: LawyerProfileSection[]): string[] {
    const s = sections.find((x) => x.type === 'gallery');
    return s && Array.isArray(s.data) ? (s.data as string[]) : [];
}

function buildSections(draft: EditDraft): LawyerProfileSection[] {
    return [
        { id: 'bio-1', type: 'bio', data: draft.bio },
        { id: 'actions-1', type: 'actions', data: draft.actions },
        { id: 'gallery-1', type: 'gallery', data: draft.gallery },
    ];
}

function actionHref(a: ProfileAction): string {
    switch (a.type) {
        case 'whatsapp':
            return `https://wa.me/${a.value.replace(/\D/g, '')}`;
        case 'call':
            return `tel:${a.value}`;
        case 'email':
            return `mailto:${a.value}`;
        case 'website':
            return a.value.startsWith('http') ? a.value : `https://${a.value}`;
        case 'location':
            return `https://maps.google.com/?q=${encodeURIComponent(a.value)}`;
        default:
            return '#';
    }
}

const ActionIcon = ({ type }: { type: ProfileAction['type'] }) => {
    const cls = 'shrink-0';
    if (type === 'whatsapp') return <MessageCircle size={18} className={cls} />;
    if (type === 'call') return <Phone size={18} className={cls} />;
    if (type === 'email') return <Mail size={18} className={cls} />;
    if (type === 'website') return <Globe size={18} className={cls} />;
    return <MapPin size={18} className={cls} />;
};

type RoyalLawyerProfileProps = {
    isScreenMode?: boolean;
    onBack?: () => void;
};

export const RoyalLawyerProfile = ({ isScreenMode, onBack }: RoyalLawyerProfileProps) => {
    const { user } = useAuth();
    const lawyerSettings = useLawyerSettingsOptional();
    const maskSensitiveInPublic = lawyerSettings?.settings.security.maskSensitiveInPublic ?? false;
    const decoyMode = lawyerSettings?.settings.security.decoyMode ?? false;
    const maskSensitive = maskSensitiveInPublic || decoyMode;
    const userId = user?.id || '';
    const email = user?.email || '';
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const metaName = typeof meta.full_name === 'string' ? meta.full_name : '';

    const [profile, setProfile] = useState<LawyerProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState<EditDraft | null>(null);
    const [uploading, setUploading] = useState<'avatar' | 'cover' | 'gallery' | null>(null);

    const avatarRef = useRef<HTMLInputElement>(null);
    const coverRef = useRef<HTMLInputElement>(null);
    const galleryRef = useRef<HTMLInputElement>(null);

    const liveStats = useLawyerProfileStats(
        userId,
        profile?.header.practiceSinceYear,
        user?.created_at,
    );

    const loadProfile = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const data = await ProfileDB.getProfile(userId);
            if (!data.header.name?.trim()) {
                data.header.name = metaName || data.header.name;
            }
            setProfile(data);
        } catch {
            SmartToast.error('تعذر تحميل الملف الشخصي');
        } finally {
            setLoading(false);
        }
    }, [userId, metaName]);

    useEffect(() => {
        void loadProfile();
    }, [loadProfile]);

    const header = isEditing && draft ? draft.header : profile?.header;
    const bio = isEditing && draft ? draft.bio : profile ? getBio(profile.sections) : '';
    const actions = isEditing && draft ? draft.actions : profile ? getActions(profile.sections) : [];
    const gallery = isEditing && draft ? draft.gallery : profile ? getGallery(profile.sections) : [];

    const displayName = header?.name?.trim() || 'محامٍ';
    const initials = displayName.charAt(0) || 'ح';
    const displayNamePublic = maskSensitive && !isEditing ? 'المحامي' : displayName;
    const titlePublic = maskSensitive && !isEditing ? 'مكتب قانوني' : header?.title;
    const emailPublic = maskSensitive && !isEditing ? '—' : email;
    const cityPublic = maskSensitive && !isEditing ? undefined : header?.city;
    const phonePublic = maskSensitive && !isEditing ? undefined : header?.phone;
    const workplacePublic = maskSensitive && !isEditing ? undefined : header?.workplace;
    const specializationPublic = maskSensitive && !isEditing ? undefined : header?.specialization;
    const syndicateIdPublic = maskSensitive && !isEditing ? undefined : header?.syndicateId;

    const statCards = useMemo(
        () => [
            { label: 'سنوات الخبرة', value: String(liveStats.experienceYears), icon: Award },
            { label: 'ملفات الدعاوى', value: String(liveStats.lawsuitFiles), icon: Scale },
            { label: 'ملفات التنفيذ', value: String(liveStats.executionFiles), icon: Gavel },
            { label: 'الملاحظات', value: String(liveStats.notes), icon: StickyNote },
        ],
        [liveStats],
    );

    const startEdit = () => {
        if (!profile) return;
        setDraft({
            header: { ...profile.header },
            bio: getBio(profile.sections),
            actions: [...getActions(profile.sections)],
            gallery: [...getGallery(profile.sections)],
        });
        setIsEditing(true);
    };

    const cancelEdit = () => {
        setDraft(null);
        setIsEditing(false);
    };

    const saveProfile = async () => {
        if (!userId || !draft) return;
        setSaving(true);
        try {
            const payload: LawyerProfileData = {
                header: draft.header,
                sections: buildSections(draft),
            };
            await ProfileDB.saveProfile(userId, payload);
            setProfile(payload);
            setIsEditing(false);
            setDraft(null);
            SmartToast.success('تم حفظ الملف الشخصي');
        } catch {
            SmartToast.error('فشل حفظ الملف الشخصي');
        } finally {
            setSaving(false);
        }
    };

    const ensureEditDraft = (): EditDraft | null => {
        if (draft) return draft;
        if (!profile) return null;
        const next: EditDraft = {
            header: { ...profile.header },
            bio: getBio(profile.sections),
            actions: [...getActions(profile.sections)],
            gallery: [...getGallery(profile.sections)],
        };
        setDraft(next);
        setIsEditing(true);
        return next;
    };

    const applyHeaderImage = (
        target: 'avatar' | 'cover',
        displayUrl: string,
        storagePath?: string,
    ) => {
        if (!profile) return;
        const imageKey = target === 'avatar' ? 'profileImage' : 'coverImage';
        const pathKey = target === 'avatar' ? 'profileImagePath' : 'coverImagePath';
        const nextHeader = {
            ...profile.header,
            [imageKey]: displayUrl,
            [pathKey]: storagePath,
        };
        const next = { ...profile, header: nextHeader };
        setProfile(next);
        if (draft) {
            setDraft({ ...draft, header: nextHeader });
        }
        void ProfileDB.saveProfile(userId, next);
    };

    const uploadImage = async (file: File, target: 'avatar' | 'cover' | 'gallery') => {
        if (!userId) {
            SmartToast.error('يرجى تسجيل الدخول لرفع الصور');
            return;
        }
        setUploading(target);
        try {
            const res = await uploadProfileMedia(userId, file);
            const url = res.displayUrl;

            if (target === 'gallery') {
                const base = draft ?? ensureEditDraft();
                if (!base) return;
                setDraft({ ...base, gallery: [...base.gallery, url] });
                if (!isEditing) setIsEditing(true);
            } else {
                applyHeaderImage(target, url, res.storagePath);
            }

            SmartToast.success(
                res.source === 'cloud' ? 'تم رفع الصورة' : 'تم حفظ الصورة محلياً على هذا الجهاز',
            );
        } catch (err) {
            SmartToast.error(profileMediaErrorMessage(err));
        } finally {
            setUploading(null);
        }
    };

    const addAction = async () => {
        const type = (await SmartDialog.prompt('نوع التواصل (whatsapp|call|email|website|location):', 'whatsapp')) as ProfileAction['type'] | null;
        if (!type || !['whatsapp', 'call', 'email', 'website', 'location'].includes(type)) return;
        const label = await SmartDialog.prompt('التسمية:', 'تواصل');
        const value = await SmartDialog.prompt('القيمة (رقم/بريد/رابط):', '');
        if (!value?.trim()) return;
        setDraft((d) =>
            d
                ? {
                      ...d,
                      actions: [
                          ...d.actions,
                          { id: `a-${Date.now()}`, type, label: label || type, value: value.trim() },
                      ],
                  }
                : d,
        );
    };

    const shareProfile = async () => {
        const lines = maskSensitive
            ? [displayNamePublic, titlePublic || ''].filter(Boolean)
            : [
                  displayName,
                  header?.title || '',
                  email,
                  header?.phone ? `هاتف: ${header.phone}` : '',
                  header?.city ? `المدينة: ${header.city}` : '',
                  header?.workplace ? `مكان العمل: ${header.workplace}` : '',
                  header?.specialization ? `التخصص: ${header.specialization}` : '',
                  bio ? `\n${bio}` : '',
              ].filter(Boolean);
        const text = lines.join('\n');
        try {
            if (navigator.share) {
                await navigator.share({ title: displayNamePublic, text });
            } else {
                await navigator.clipboard.writeText(text);
                SmartToast.success('تم نسخ بطاقة التعريف');
            }
        } catch {
            SmartToast.info('لم يتم المشاركة');
        }
    };

    if (loading) {
        return (
            <motion.div className="min-h-screen bg-[#05060D] flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-[#E6C673] border-t-transparent rounded-full animate-spin" />
            </motion.div>
        );
    }

    return (
        <motion.div className="min-h-screen bg-[#05060D] text-white overflow-x-hidden pb-28" dir="rtl">
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <motion.div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#E6C673]/10 blur-[100px]" />
                <motion.div className="absolute top-1/3 -left-20 w-64 h-64 rounded-full bg-blue-500/10 blur-[90px]" />
            </div>

            {isScreenMode && onBack ? (
                <div className="sticky top-0 z-40 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 bg-[#05060D]/80 backdrop-blur-md border-b border-white/5">
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex items-center gap-2 text-sm font-bold text-white/80 hover:text-white"
                    >
                        <span className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                            <ArrowRight size={18} />
                        </span>
                        العودة للرئيسية
                    </button>
                </div>
            ) : null}

            {/* Cover */}
            <div className="relative h-48 sm:h-56">
                {header?.coverImage ? (
                    <img src={header.coverImage} alt="" className="w-full h-full object-cover opacity-70" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#1A1E2E] via-[#0B1021] to-[#05060D]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#05060D] via-[#05060D]/40 to-transparent" />

                <button
                    type="button"
                    disabled={uploading === 'cover'}
                    onClick={() => coverRef.current?.click()}
                    className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/20 text-xs font-bold"
                >
                    <Camera size={14} />
                    {uploading === 'cover' ? 'جاري الرفع...' : 'تغيير الغلاف'}
                </button>
            </div>

            {/* Profile hero card */}
            <div className="relative z-10 px-4 -mt-20 max-w-2xl mx-auto">
                <motion.div className={`${GLASS} rounded-3xl p-5`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <motion.div className="flex items-start gap-4">
                        <div className="relative shrink-0">
                            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#E6C673]/50 shadow-[0_0_24px_rgba(230,198,115,0.25)] bg-[#0B1021]">
                                {header?.profileImage ? (
                                    <img src={header.profileImage} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <motion.div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[#E6C673]">
                                        {initials}
                                    </motion.div>
                                )}
                            </div>
                            <button
                                type="button"
                                disabled={uploading === 'avatar'}
                                onClick={() => avatarRef.current?.click()}
                                className="absolute -bottom-1 -left-1 w-8 h-8 rounded-full bg-[#E6C673] text-black flex items-center justify-center shadow-lg"
                                aria-label="تغيير الصورة الشخصية"
                            >
                                <Camera size={14} />
                            </button>
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                            {isEditing && draft ? (
                                <div className="space-y-2">
                                    <input
                                        value={draft.header.name}
                                        onChange={(e) =>
                                            setDraft({ ...draft, header: { ...draft.header, name: e.target.value } })
                                        }
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-[#E6C673]/50"
                                        placeholder="الاسم الكامل"
                                    />
                                    <input
                                        value={draft.header.title}
                                        onChange={(e) =>
                                            setDraft({ ...draft, header: { ...draft.header, title: e.target.value } })
                                        }
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-[#E6C673]/50"
                                        placeholder="المسمى المهني"
                                    />
                                </div>
                            ) : (
                                <>
                                    <h1 className="text-xl font-bold leading-tight truncate">{displayNamePublic}</h1>
                                    <p className="text-[#E6C673] text-sm mt-0.5">{titlePublic}</p>
                                </>
                            )}
                            <p className="text-white/40 text-xs mt-2 truncate">{emailPublic}</p>
                            {(cityPublic || phonePublic) && !isEditing && (
                                <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-white/50">
                                    {cityPublic ? (
                                        <span className="flex items-center gap-1">
                                            <MapPin size={10} /> {cityPublic}
                                        </span>
                                    ) : null}
                                    {phonePublic ? (
                                        <span className="flex items-center gap-1">
                                            <Phone size={10} /> {phonePublic}
                                        </span>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    </motion.div>

                    <motion.div className="flex gap-2 mt-4">
                        <button
                            type="button"
                            onClick={shareProfile}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#E6C673]/15 border border-[#E6C673]/30 text-[#E6C673] text-xs font-bold"
                        >
                            <Share2 size={14} />
                            مشاركة
                        </button>
                        {!isEditing ? (
                            <button
                                type="button"
                                onClick={startEdit}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10"
                            >
                                <Edit3 size={14} />
                                تعديل الملف
                            </button>
                        ) : null}
                    </motion.div>
                </motion.div>
            </div>

            {/* Live stats */}
            <div className="px-4 mt-5 max-w-2xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
                {statCards.map(({ label, value, icon: Icon }) => (
                    <motion.div key={label} className={`${GLASS} rounded-2xl p-3 text-center`}>
                        <Icon size={18} className="mx-auto text-[#E6C673] mb-1.5" />
                        <p className="text-lg font-bold text-white">{value}</p>
                        <p className="text-[10px] text-white/45 mt-0.5">{label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Workplace & specialization */}
            <div className="px-4 mt-5 max-w-2xl mx-auto">
                <motion.div className={`${GLASS} rounded-2xl p-4`}>
                    <div className="flex items-center gap-2 mb-3">
                        <Landmark size={16} className="text-[#E6C673]" />
                        <h2 className="text-sm font-bold">مكان العمل والتخصص</h2>
                    </div>

                    {isEditing && draft ? (
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] text-white/45 mb-1 block">مكان العمل</label>
                                <input
                                    value={draft.header.workplace || ''}
                                    onChange={(e) =>
                                        setDraft({
                                            ...draft,
                                            header: { ...draft.header, workplace: e.target.value },
                                        })
                                    }
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#E6C673]/40"
                                    placeholder="مثال: مكتب المحامي — بغداد، الكرادة"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-white/45 mb-1 block">التخصص الدقيق</label>
                                <input
                                    value={draft.header.specialization || ''}
                                    onChange={(e) =>
                                        setDraft({
                                            ...draft,
                                            header: { ...draft.header, specialization: e.target.value },
                                        })
                                    }
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#E6C673]/40"
                                    placeholder="مثال: مدني — عقود وملكية — تنفيذ أحكام"
                                />
                            </div>
                        </div>
                    ) : header?.workplace || header?.specialization ? (
                        <div className="space-y-3">
                            {workplacePublic ? (
                                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                                    <div className="p-2 rounded-lg bg-[#E6C673]/10 text-[#E6C673] shrink-0">
                                        <Building2 size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-white/40 mb-0.5">مكان العمل</p>
                                        <p className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap">
                                            {workplacePublic}
                                        </p>
                                    </div>
                                </div>
                            ) : null}
                            {specializationPublic ? (
                                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                                    <div className="p-2 rounded-lg bg-[#E6C673]/10 text-[#E6C673] shrink-0">
                                        <Scale size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-white/40 mb-0.5">التخصص الدقيق</p>
                                        <p className="text-sm text-white/85 leading-relaxed">{specializationPublic}</p>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <p className="text-xs text-white/35">
                            أضف مكتبك وتخصصك الدقيق من «تعديل الملف» ليظهران في بطاقتك المهنية.
                        </p>
                    )}
                </motion.div>
            </div>

            {/* Edit: contact fields */}
            {isEditing && draft && (
                <div className="px-4 mt-5 max-w-2xl mx-auto space-y-3">
                    <motion.div className={`${GLASS} rounded-2xl p-4 space-y-3`}>
                        <p className="text-xs font-bold text-[#E6C673]">بيانات التواصل</p>
                        <input
                            value={draft.header.phone || ''}
                            onChange={(e) =>
                                setDraft({ ...draft, header: { ...draft.header, phone: e.target.value } })
                            }
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none"
                            placeholder="رقم الهاتف"
                        />
                        <input
                            value={draft.header.city || ''}
                            onChange={(e) =>
                                setDraft({ ...draft, header: { ...draft.header, city: e.target.value } })
                            }
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none"
                            placeholder="المدينة / المحافظة"
                        />
                        <input
                            type="number"
                            value={draft.header.practiceSinceYear || ''}
                            onChange={(e) =>
                                setDraft({
                                    ...draft,
                                    header: {
                                        ...draft.header,
                                        practiceSinceYear: Number(e.target.value) || undefined,
                                    },
                                })
                            }
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none"
                            placeholder="سنة بدء الممارسة (مثال: 2010)"
                        />
                        <input
                            value={draft.header.syndicateId || ''}
                            onChange={(e) =>
                                setDraft({ ...draft, header: { ...draft.header, syndicateId: e.target.value } })
                            }
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none"
                            placeholder="رقم نقابة المحامين"
                        />
                    </motion.div>
                </div>
            )}

            {/* Bio */}
            <motion.div className="px-4 mt-5 max-w-2xl mx-auto">
                <motion.div className={`${GLASS} rounded-2xl p-4`}>
                    <div className="flex items-center gap-2 mb-3">
                        <FileText size={16} className="text-[#E6C673]" />
                        <h2 className="text-sm font-bold">نبذة مهنية</h2>
                    </div>
                    {isEditing && draft ? (
                        <textarea
                            value={draft.bio}
                            onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                            rows={5}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm leading-relaxed outline-none resize-none focus:border-[#E6C673]/40"
                            placeholder="اكتب نبذة عن خبراتك وتخصصاتك القانونية..."
                        />
                    ) : bio ? (
                        <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap">{bio}</p>
                    ) : (
                        <p className="text-sm text-white/35">لم تُضف نبذة بعد — اضغط «تعديل الملف» لإضافتها.</p>
                    )}
                </motion.div>
            </motion.div>

            {/* Syndicate badge */}
            {syndicateIdPublic && !isEditing && (
                <div className="px-4 mt-4 max-w-2xl mx-auto">
                    <div className={`${GLASS} rounded-xl px-4 py-3 flex items-center gap-3`}>
                        <Building2 size={18} className="text-[#E6C673]" />
                        <div>
                            <p className="text-[10px] text-white/40">نقابة المحامين</p>
                            <p className="text-sm font-bold">{syndicateIdPublic}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Contact actions */}
            <motion.div className="px-4 mt-5 max-w-2xl mx-auto">
                <motion.div className={`${GLASS} rounded-2xl p-4`}>
                    <div className="flex items-center justify-between mb-3">
                        <motion.div className="flex items-center gap-2">
                            <Briefcase size={16} className="text-[#E6C673]" />
                            <h2 className="text-sm font-bold">قنوات التواصل</h2>
                        </motion.div>
                        {isEditing && (
                            <button
                                type="button"
                                onClick={() => void addAction()}
                                className="text-[10px] font-bold text-[#E6C673] flex items-center gap-1"
                            >
                                <Plus size={12} /> إضافة
                            </button>
                        )}
                    </div>
                    {maskSensitive && !isEditing ? (
                        <p className="text-xs text-white/35">تم إخفاء قنوات التواصل حسب إعدادات الخصوصية.</p>
                    ) : actions.length === 0 ? (
                        <p className="text-xs text-white/35">أضف واتساب، هاتف، بريد، أو موقعك في وضع التعديل.</p>
                    ) : (
                        <div className="space-y-2">
                            {actions.map((action) =>
                                isEditing && draft ? (
                                    <div
                                        key={action.id}
                                        className="flex items-center gap-2 bg-white/5 rounded-xl p-2 border border-white/5"
                                    >
                                        <ActionIcon type={action.type} />
                                        <input
                                            value={action.label}
                                            onChange={(e) =>
                                                setDraft({
                                                    ...draft,
                                                    actions: draft.actions.map((a) =>
                                                        a.id === action.id ? { ...a, label: e.target.value } : a,
                                                    ),
                                                })
                                            }
                                            className="flex-1 bg-transparent text-xs outline-none min-w-0"
                                            placeholder="التسمية"
                                        />
                                        <input
                                            value={action.value}
                                            onChange={(e) =>
                                                setDraft({
                                                    ...draft,
                                                    actions: draft.actions.map((a) =>
                                                        a.id === action.id ? { ...a, value: e.target.value } : a,
                                                    ),
                                                })
                                            }
                                            className="flex-[2] bg-white/5 rounded-lg px-2 py-1 text-xs outline-none min-w-0"
                                            placeholder="القيمة"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setDraft({
                                                    ...draft,
                                                    actions: draft.actions.filter((a) => a.id !== action.id),
                                                })
                                            }
                                            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <a
                                        key={action.id}
                                        href={actionHref(action)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-[#E6C673]/30 transition-colors"
                                    >
                                        <div className="p-2 rounded-lg bg-[#E6C673]/10 text-[#E6C673]">
                                            <ActionIcon type={action.type} />
                                        </div>
                                        <motion.div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{action.label}</p>
                                            <p className="text-[10px] text-white/40 truncate">{action.value}</p>
                                        </motion.div>
                                        <Copy
                                            size={14}
                                            className="text-white/25 shrink-0"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                void navigator.clipboard.writeText(action.value);
                                                SmartToast.success('تم النسخ');
                                            }}
                                        />
                                    </a>
                                ),
                            )}
                        </div>
                    )}
                </motion.div>
            </motion.div>

            {/* Gallery */}
            <motion.div className="px-4 mt-5 max-w-2xl mx-auto">
                <motion.div className={`${GLASS} rounded-2xl p-4`}>
                    <div className="flex items-center justify-between mb-3">
                        <motion.div className="flex items-center gap-2">
                            <Camera size={16} className="text-[#E6C673]" />
                            <h2 className="text-sm font-bold">معرض الشهادات والصور</h2>
                        </motion.div>
                        <button
                            type="button"
                            disabled={uploading === 'gallery'}
                            onClick={() => {
                                if (!isEditing) ensureEditDraft();
                                galleryRef.current?.click();
                            }}
                            className="text-[10px] font-bold text-[#E6C673]"
                        >
                            {uploading === 'gallery' ? 'جاري الرفع...' : '+ صورة'}
                        </button>
                    </div>
                    {gallery.length === 0 ? (
                        <p className="text-xs text-white/35">ارفع صور الشهادات أو المكتب في وضع التعديل.</p>
                    ) : (
                        <div className="grid grid-cols-3 gap-2">
                            {gallery.map((url, i) => (
                                <div key={`${url}-${i}`} className="relative aspect-square rounded-xl overflow-hidden group">
                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                    {isEditing && draft && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setDraft({
                                                    ...draft,
                                                    gallery: draft.gallery.filter((_, idx) => idx !== i),
                                                })
                                            }
                                            className="absolute top-1 left-1 p-1 rounded-md bg-black/60 text-red-400 opacity-0 group-hover:opacity-100"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </motion.div>

            {/* Hidden file inputs */}
            <input
                ref={avatarRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadImage(f, 'avatar');
                    e.target.value = '';
                }}
            />
            <input
                ref={coverRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadImage(f, 'cover');
                    e.target.value = '';
                }}
            />
            <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadImage(f, 'gallery');
                    e.target.value = '';
                }}
            />

            {/* Edit bar */}
            <AnimatePresence>
                {isEditing && (
                    <motion.div
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-[#05060D] via-[#05060D]/95 to-transparent"
                    >
                        <div className="max-w-2xl mx-auto flex gap-3">
                            <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={saving}
                                className="flex-1 py-3 rounded-xl border border-white/15 text-sm font-bold"
                            >
                                إلغاء
                            </button>
                            <button
                                type="button"
                                onClick={() => void saveProfile()}
                                disabled={saving}
                                className="flex-1 py-3 rounded-xl bg-[#E6C673] text-black text-sm font-bold flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                ) : (
                                    <Check size={16} />
                                )}
                                حفظ
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
