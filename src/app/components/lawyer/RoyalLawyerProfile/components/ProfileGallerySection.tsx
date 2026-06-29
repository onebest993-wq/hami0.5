import React from 'react';
import { motion } from 'motion/react';
import { Briefcase, Camera, X } from 'lucide-react';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import { PROFILE_THEME } from '../profileThemeClasses';
import { ProfileAvatarImage } from './ProfileAvatarImage';
import { MoroccanGlassFrame } from '@/app/components/shared/MoroccanGlassOverlay';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';

const fadeUp = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
};

export type ProfileGallerySectionProps = {
    isEditing: boolean;
    readOnly: boolean;
    draft: EditDraft | null;
    setDraft: React.Dispatch<React.SetStateAction<EditDraft | null>>;
    gallery: string[];
    uploading: 'avatar' | 'gallery' | null;
    galleryRef: React.RefObject<HTMLInputElement | null>;
    ornatePattern: boolean;
};

export function ProfileGallerySection({
    isEditing,
    readOnly,
    draft,
    setDraft,
    gallery,
    uploading,
    galleryRef,
    ornatePattern,
}: ProfileGallerySectionProps) {
    const reduceMotion = useReduceMotion();
    return (
        <motion.div
            initial={reduceMotion ? false : fadeUp.initial}
            animate={fadeUp.animate}
            transition={reduceMotion ? { duration: 0 } : { delay: 0.12 }}
        >
            <MoroccanGlassFrame
                profilePanel
                ornatePattern={ornatePattern}
                className="hami-profile-section-panel"
                patternOpacity={0.07}
            >
                <div className="hami-profile-section-head">
                    <div>
                        <p className="hami-profile-section-kicker">Gallery</p>
                        <h2 className="hami-profile-section-title flex items-center gap-2">
                            <Camera size={16} className={PROFILE_THEME.accentText} />
                            معرض الشهادات
                        </h2>
                    </div>
                    {isEditing && !readOnly ? (
                        <button
                            type="button"
                            disabled={uploading === 'gallery'}
                            onClick={() => galleryRef.current?.click()}
                            className={`hami-profile-section-action ${PROFILE_THEME.accentBtn}`}
                        >
                            {uploading === 'gallery' ? 'جاري الرفع...' : '+ صورة'}
                        </button>
                    ) : null}
                </div>

                {gallery.length === 0 ? (
                    <div className="hami-profile-gallery-empty">
                        <Briefcase size={26} className="mx-auto text-white/20 mb-2" />
                        <p className="text-xs text-white/35">ارفع صور الشهادات أو المكتب من «تعديل».</p>
                    </div>
                ) : (
                    <div className="hami-profile-gallery-rail">
                        {gallery.map((url, i) => (
                            <div key={`${url}-${i}`} className="hami-profile-gallery-tile group">
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
                                        className="absolute top-2 left-2 z-[2] min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-black/70 text-red-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity"
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
    );
}
