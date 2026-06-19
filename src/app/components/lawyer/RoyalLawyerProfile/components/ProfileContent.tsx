import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Briefcase,
    Camera,
    Check,
    Copy,
    Edit3,
    MapPin,
    Phone,
    Plus,
    Share2,
    Shield,
    Trash2,
    X,
} from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { LawyerProfileHeader, ProfileAction } from '@/app/services/lawyer-cloud';
import { PROFILE_INPUT, PROFILE_SECTION_LABEL } from '../constants';
import type { EditDraft } from '../types';
import { actionHref } from '../utils/profileSections';
import { ActionIcon } from './ActionIcon';
import { ProfileAvatarImage } from './ProfileAvatarImage';
import { ProfileFloatingPortrait } from './ProfileFloatingPortrait';
import { MoroccanGlassFrame } from '@/app/components/shared/MoroccanGlassOverlay';

const CONTACT_CHANNEL_OPTIONS: { type: ProfileAction['type']; label: string }[] = [
    { type: 'whatsapp', label: 'واتساب' },
    { type: 'call', label: 'هاتف' },
    { type: 'email', label: 'بريد' },
    { type: 'website', label: 'موقع' },
];

export interface ProfileContentProps {
    loading: boolean;
    saving: boolean;
    isEditing: boolean;
    draft: EditDraft | null;
    setDraft: React.Dispatch<React.SetStateAction<EditDraft | null>>;
    uploading: 'avatar' | 'cover' | 'gallery' | null;
    avatarRef: React.RefObject<HTMLInputElement | null>;
    galleryRef: React.RefObject<HTMLInputElement | null>;
    header: LawyerProfileHeader | undefined;
    actions: ProfileAction[];
    gallery: string[];
    initials: string;
    displayNamePublic: string;
    titlePublic: string | undefined;
    emailPublic: string;
    cityPublic: string | undefined;
    phonePublic: string | undefined;
    syndicateIdPublic: string | undefined;
    startEdit: () => void;
    cancelEdit: () => void;
    saveProfile: () => Promise<void>;
    ensureEditDraft: () => EditDraft | null;
    uploadImage: (file: File, target: 'avatar' | 'cover' | 'gallery') => Promise<void>;
    addContactChannel: (type: ProfileAction['type']) => void;
    shareProfile: () => Promise<void>;
}

const fadeUp = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
};

export function ProfileContent({
    saving,
    isEditing,
    draft,
    setDraft,
    uploading,
    avatarRef,
    galleryRef,
    header,
    actions,
    gallery,
    initials,
    displayNamePublic,
    cityPublic,
    phonePublic,
    syndicateIdPublic,
    startEdit,
    cancelEdit,
    saveProfile,
    ensureEditDraft,
    uploadImage,
    addContactChannel,
    shareProfile,
}: ProfileContentProps) {
    const metaItems = [
        phonePublic ? { icon: Phone, label: 'الهاتف', value: phonePublic } : null,
        cityPublic ? { icon: MapPin, label: 'المدينة', value: cityPublic } : null,
    ].filter(Boolean) as { icon: typeof Phone; label: string; value: string }[];

    return (
        <motion.div data-testid="lawyer-profile" className="relative max-w-lg mx-auto">
            {/* Identity */}
            <div className="relative z-10 px-4 pt-4">
                <motion.div {...fadeUp} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
                    <div className="relative pt-[52px]">
                        {/* Avatar — خارج الإطار الزجاجي لعدم القص */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
                            <div className="relative">
                                <ProfileFloatingPortrait>
                                {header?.profileImage ? (
                                    <ProfileAvatarImage src={header.profileImage} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-[#E6C673] bg-gradient-to-br from-[#141824] to-[#0A0F1C]">
                                        {initials}
                                    </div>
                                )}
                            </ProfileFloatingPortrait>
                            {isEditing ? (
                                <button
                                    type="button"
                                    disabled={uploading === 'avatar'}
                                    onClick={() => avatarRef.current?.click()}
                                    className="absolute -bottom-2 -left-3 w-9 h-9 rounded-xl bg-[#E6C673] text-black flex items-center justify-center shadow-lg border-2 border-[#030508] z-30"
                                    aria-label="تغيير الصورة الشخصية"
                                >
                                    <Camera size={15} />
                                </button>
                            ) : null}
                            </div>
                        </div>

                        <MoroccanGlassFrame
                            className="rounded-[32px] pt-14 pb-5 px-6"
                            patternOpacity={0.09}
                            clip={false}
                        >
                            <div
                                className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-[#E6C673]/60 to-transparent z-[2]"
                                aria-hidden
                            />

                            {/* Name block */}
                            <div className="text-center w-full">
                        {isEditing && draft ? (
                            <div className="space-y-3 text-right">
                                <input
                                    value={draft.header.name}
                                    onChange={(e) =>
                                        setDraft({ ...draft, header: { ...draft.header, name: e.target.value } })
                                    }
                                    className={PROFILE_INPUT}
                                    placeholder="الاسم الكامل"
                                />
                            </div>
                        ) : (
                            <>
                                <h1 className="text-2xl font-bold tracking-tight text-white leading-tight px-2">
                                    {displayNamePublic}
                                </h1>
                                {syndicateIdPublic ? (
                                    <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-[#E6C673]/10 border border-[#E6C673]/25 text-[10px] font-bold text-[#E6C673]">
                                        <Shield size={12} />
                                        نقابة المحامين · {syndicateIdPublic}
                                    </div>
                                ) : null}
                            </>
                        )}
                    </div>

                    {/* Meta chips */}
                    {!isEditing && metaItems.length > 0 ? (
                        <div className="flex flex-wrap justify-center gap-2 mt-5">
                            {metaItems.map((item) => (
                                <span
                                    key={item.label}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[11px] text-white/65"
                                >
                                    <item.icon size={12} className="text-[#E6C673]/80 shrink-0" />
                                    <span className="truncate max-w-[140px]">{item.value}</span>
                                </span>
                            ))}
                        </div>
                    ) : null}
                        </MoroccanGlassFrame>

                        {/* Actions — أسفل بطاقة الهوية */}
                        <div className="flex gap-2.5 mt-4">
                            <button
                                type="button"
                                onClick={shareProfile}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-[#E6C673]/20 to-[#E6C673]/5 border border-[#E6C673]/30 text-[#E6C673] text-xs font-bold hover:from-[#E6C673]/28 transition-all min-h-[44px]"
                            >
                                <Share2 size={16} />
                                مشاركة
                            </button>
                            {!isEditing ? (
                                <button
                                    type="button"
                                    data-testid="lawyer-profile-edit"
                                    onClick={startEdit}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/[0.06] border border-white/10 text-xs font-bold hover:bg-white/10 transition-colors min-h-[44px]"
                                >
                                    <Edit3 size={16} />
                                    تعديل
                                </button>
                            ) : null}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Contact channels */}
            <motion.div {...fadeUp} transition={{ delay: 0.08 }} className="px-4 mt-5">
                <MoroccanGlassFrame className="rounded-[28px] p-5" patternOpacity={0.07}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className={PROFILE_SECTION_LABEL}>Connect</p>
                            <h2 className="text-base font-bold mt-1">قنوات التواصل</h2>
                        </div>
                        {isEditing ? (
                            <button
                                type="button"
                                data-testid="lawyer-profile-add-contact"
                                onClick={() => addContactChannel('whatsapp')}
                                className="text-[11px] font-bold text-[#E6C673] flex items-center gap-1 px-3 py-2 rounded-xl bg-[#E6C673]/10 border border-[#E6C673]/20 hover:bg-[#E6C673]/18 transition-colors"
                            >
                                <Plus size={14} />
                                إضافة
                            </button>
                        ) : null}
                    </div>

                    {isEditing ? (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {CONTACT_CHANNEL_OPTIONS.map((opt) => (
                                <button
                                    key={opt.type}
                                    type="button"
                                    onClick={() => addContactChannel(opt.type)}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold bg-[#E6C673]/10 border border-[#E6C673]/25 text-[#E6C673] hover:bg-[#E6C673]/18 transition-colors"
                                >
                                    <Plus size={12} />
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    ) : null}

                    {actions.length === 0 && isEditing ? (
                        <p className="text-xs text-white/35 text-center py-4">
                            اضغط «إضافة» أو اختر نوع القناة أعلاه.
                        </p>
                    ) : actions.length === 0 ? (
                        <p className="text-xs text-white/35 text-center py-4">
                            أضف واتساب، هاتف، بريد، أو موقعك من «تعديل».
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {actions.map((action) =>
                                isEditing && draft ? (
                                    <div
                                        key={action.id}
                                        className="col-span-full flex items-center gap-2 bg-black/25 rounded-2xl p-3 border border-white/[0.06]"
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
                                            className="flex-[2] bg-white/5 rounded-xl px-2 py-1.5 text-xs outline-none min-w-0"
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
                                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl"
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
                                        className="group flex items-center gap-3 p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:border-[#E6C673]/35 hover:bg-[#E6C673]/[0.04] transition-all"
                                    >
                                        <div className="p-2.5 rounded-xl bg-[#E6C673]/10 text-[#E6C673] group-hover:scale-105 transition-transform">
                                            <ActionIcon type={action.type} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate">{action.label}</p>
                                            <p className="text-[10px] text-white/40 truncate mt-0.5">{action.value}</p>
                                        </div>
                                        <Copy
                                            size={14}
                                            className="text-white/20 shrink-0 group-hover:text-[#E6C673]/60"
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
                </MoroccanGlassFrame>
            </motion.div>

            {/* Gallery */}
            <motion.div {...fadeUp} transition={{ delay: 0.12 }} className="px-4 mt-5">
                <MoroccanGlassFrame className="rounded-[28px] p-5" patternOpacity={0.07}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className={PROFILE_SECTION_LABEL}>Gallery</p>
                            <h2 className="text-base font-bold mt-1 flex items-center gap-2">
                                <Camera size={16} className="text-[#E6C673]" />
                                معرض الشهادات
                            </h2>
                        </div>
                        {isEditing ? (
                            <button
                                type="button"
                                disabled={uploading === 'gallery'}
                                onClick={() => galleryRef.current?.click()}
                                className="text-[11px] font-bold text-[#E6C673] px-3 py-2 rounded-xl bg-[#E6C673]/10 border border-[#E6C673]/20"
                            >
                                {uploading === 'gallery' ? 'جاري الرفع...' : '+ صورة'}
                            </button>
                        ) : null}
                    </div>

                    {gallery.length === 0 ? (
                        <div className="py-8 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
                            <Briefcase size={24} className="mx-auto text-white/20 mb-2" />
                            <p className="text-xs text-white/35">ارفع صور الشهادات أو المكتب من «تعديل».</p>
                        </div>
                    ) : (
                        <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {gallery.map((url, i) => (
                                <div
                                    key={`${url}-${i}`}
                                    className="relative shrink-0 w-[140px] aspect-[4/5] rounded-2xl overflow-hidden snap-start group border border-white/10"
                                >
                                    <ProfileAvatarImage src={url} />
                                    {isEditing && draft ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setDraft({
                                                    ...draft,
                                                    gallery: draft.gallery.filter((_, idx) => idx !== i),
                                                })
                                            }
                                            className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/70 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={14} />
                                        </button>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    )}
                </MoroccanGlassFrame>
            </motion.div>
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
                {isEditing ? (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
                    >
                        <div className="max-w-lg mx-auto flex gap-3 p-2 rounded-[24px] bg-[#0A0F1C]/90 backdrop-blur-2xl border border-white/10 shadow-[0_-8px_40px_rgba(0,0,0,0.5)]">
                            <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={saving}
                                className="flex-1 py-3.5 rounded-2xl border border-white/15 text-sm font-bold text-white/80 hover:bg-white/5 transition-colors min-h-[48px]"
                            >
                                إلغاء
                            </button>
                            <button
                                type="button"
                                onClick={() => void saveProfile()}
                                disabled={saving}
                                className="flex-[1.2] py-3.5 rounded-2xl bg-gradient-to-r from-[#E6C673] to-[#d4b45a] text-black text-sm font-bold flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(230,198,115,0.35)] min-h-[48px]"
                            >
                                {saving ? (
                                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                ) : (
                                    <Check size={16} />
                                )}
                                حفظ التغييرات
                            </button>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </motion.div>
    );
}
