import type {
    ProfileAppearanceColor,
    ProfileAppearanceMaterial,
    ProfileAppearanceSettings,
    ProfileBlockKind,
    ProfileBlockShape,
    ProfileCanvasFrameGlow,
    ProfileCanvasFrameShape,
    ProfileCanvasInteraction,
    ProfileCanvasMaterial,
    ProfileFontSize,
    ProfileImageFrameStyle,
    ProfileImageInteraction,
    ProfileMediaTemplate,
    ProfilePrivacySettings,
    ProfilePortraitFrame,
    ProfilePortraitFrameId,
    ProfilePortraitFrameOption,
    ProfileTextEffect,
    ProfileTextFont,
} from './profilePageTypes';

export const PROFILE_ACCENT_COLORS: { id: ProfileAppearanceColor; label: string; hex: string }[] = [
    { id: 'navy', label: 'كحلي', hex: '#0A0F1C' },
    { id: 'gold', label: 'ذهبي', hex: '#E6C673' },
    { id: 'emerald', label: 'زمردي', hex: '#34D399' },
    { id: 'wine', label: 'خمري', hex: '#9B2C4A' },
    { id: 'ice', label: 'جليدي', hex: '#A8C4D4' },
    { id: 'bronze', label: 'برونزي', hex: '#C4782F' },
];

export const PROFILE_MATERIALS: { id: ProfileAppearanceMaterial; label: string }[] = [
    { id: 'glass', label: 'زجاجي' },
    { id: 'fabric', label: 'قماشي' },
    { id: 'metallic', label: 'معدني' },
    { id: 'gilded', label: 'طلائي' },
    { id: 'ornate', label: 'زخرفي' },
    { id: 'matte', label: 'معتم' },
];

export const PROFILE_BLOCK_SHAPES: { id: ProfileBlockShape; label: string }[] = [
    { id: 'rounded', label: 'مستطيل' },
    { id: 'pill', label: 'بيضاوي' },
    { id: 'circle', label: 'دائري' },
    { id: 'diamond', label: 'معين' },
    { id: 'hexagon', label: 'سداسي' },
];

export const PROFILE_MEDIA_TEMPLATES: { id: ProfileMediaTemplate; label: string }[] = [
    { id: 'rectangle', label: 'مستطيل ناعم' },
    { id: 'circle', label: 'دائري' },
    { id: 'lens', label: 'عدسة ملكية' },
    { id: 'crest', label: 'درع' },
    { id: 'temple', label: 'قوس معبد' },
    { id: 'arch', label: 'قوس ناعم' },
    { id: 'flower', label: 'وردة' },
    { id: 'star', label: 'نجمة' },
    { id: 'diamond', label: 'معين' },
    { id: 'hexagon', label: 'سداسي' },
    { id: 'cinema', label: 'سينمائي' },
    { id: 'vault', label: 'خزنة' },
    { id: 'perspective', label: 'منظور 3D' },
];

export const PROFILE_IMAGE_INTERACTIONS: { id: ProfileImageInteraction; label: string; hint: string }[] = [
    { id: 'none', label: 'ثابت', hint: 'بدون حركة' },
    { id: 'kenBurns', label: 'سينمائي', hint: 'تقريب بطيء مستمر' },
    { id: 'tilt', label: 'ميل', hint: 'ميل ثلاثي الأبعاد عند اللمس' },
    { id: 'shimmer', label: 'لمعان', hint: 'وميض ذهبي دوري' },
    { id: 'pulse', label: 'نبض', hint: 'توهج نابض للإطار' },
    { id: 'parallax', label: 'عمق', hint: 'حركة بطيقة داخل الإطار' },
];

export const PROFILE_IMAGE_RIM_STYLES: { id: NonNullable<ProfileImageFrameStyle['rimStyle']>; label: string }[] = [
    { id: 'minimal', label: 'بسيط' },
    { id: 'gold', label: 'ذهبي' },
    { id: 'ornate', label: 'زخرفي' },
    { id: 'neon', label: 'نيون' },
];

export const PROFILE_BLOCK_KINDS: { id: ProfileBlockKind; label: string }[] = [
    { id: 'text', label: 'نص حر' },
    { id: 'image', label: 'صورة' },
];

export const PROFILE_TEXT_FONTS: { id: ProfileTextFont; label: string; className: string }[] = [
    { id: 'tajawal', label: 'تجوال', className: 'hami-profile-font-tajawal' },
    { id: 'cairo', label: 'قاهرة', className: 'hami-profile-font-cairo' },
    { id: 'literary', label: 'أدبي', className: 'hami-profile-font-literary' },
    { id: 'almarai', label: 'المراعي', className: 'hami-profile-font-almarai' },
    { id: 'changa', label: 'تشانجا', className: 'hami-profile-font-changa' },
    { id: 'noto', label: 'نوتو', className: 'hami-profile-font-noto' },
    { id: 'reem', label: 'ريم كوفي', className: 'hami-profile-font-reem' },
];

export const PROFILE_CANVAS_MATERIALS: { id: ProfileCanvasMaterial; label: string }[] = [
    { id: 'glass', label: 'زجاج' },
    { id: 'paper', label: 'ورقي' },
    { id: 'parchment', label: 'رق' },
    { id: 'velvet', label: 'مخمل' },
    { id: 'slate', label: 'حجري' },
    { id: 'night', label: 'ليلي' },
];

export const PROFILE_CANVAS_FRAME_SHAPES: { id: ProfileCanvasFrameShape; label: string }[] = [
    { id: 'rounded', label: 'ناعم' },
    { id: 'arch', label: 'قوس' },
    { id: 'scroll', label: 'مخطوطة' },
    { id: 'door', label: 'باب' },
];

export const PROFILE_CANVAS_FRAME_GLOWS: { id: ProfileCanvasFrameGlow; label: string }[] = [
    { id: 'none', label: 'بدون' },
    { id: 'soft', label: 'هادئ' },
    { id: 'gold', label: 'ذهبي' },
    { id: 'aurora', label: 'شفق' },
    { id: 'bloom', label: 'أزهار' },
];

export const PROFILE_CANVAS_INTERACTIONS: { id: ProfileCanvasInteraction; label: string; hint: string }[] = [
    { id: 'none', label: 'هادئ', hint: 'ظهور مباشر بدون حجاب' },
    { id: 'tapReveal', label: 'ستارة ذهبية', hint: 'لمسة واحدة ترفع الستارة الحريرية' },
    { id: 'doorOpen', label: 'باب ملكي', hint: 'لمسة تفتح الباب الذهبي وتكشف النص' },
    { id: 'luminousFold', label: 'طيّ مضيء', hint: 'انقسام ذهبي أنيق من الوسط بلمسة' },
    { id: 'mistSwipe', label: 'ضباب ذهبي', hint: 'مرّر إصبعك لتمزيق الضباب' },
    { id: 'stardust', label: 'غبار النجوم', hint: 'مرّر لبعثر البريق الذهبي' },
];

export const PROFILE_TEXT_EFFECTS: { id: ProfileTextEffect; label: string }[] = [
    { id: 'none', label: 'بدون' },
    { id: 'glow', label: 'توهج' },
    { id: 'gradient', label: 'تدرج' },
    { id: 'underline', label: 'خط سفلي' },
    { id: 'shadow', label: 'ظل' },
];

export const PROFILE_FONT_SIZES: { id: ProfileFontSize; label: string; className: string }[] = [
    { id: 'xs', label: 'صغير', className: 'text-xs' },
    { id: 'base', label: 'وسط', className: 'text-base' },
    { id: 'lg', label: 'كبير', className: 'text-lg' },
    { id: '2xl', label: 'كبير جدا', className: 'text-2xl' },
];

export const DEFAULT_PROFILE_PRIVACY: ProfilePrivacySettings = {
    pageAccess: 'public',
    showPhoneMeta: true,
    showCityMeta: true,
    showSyndicate: true,
    showContactChannels: true,
    showGallery: true,
    showCustomBlocks: true,
    hiddenContactIds: [],
};

export const DEFAULT_PROFILE_APPEARANCE: ProfileAppearanceSettings = {
    accentColor: 'gold',
    material: 'glass',
    portraitFrame: 'classic',
};

export const PROFILE_PORTRAIT_FRAMES: readonly ProfilePortraitFrameOption[] = [
    { id: 'classic', label: 'كلاسيكي', hint: 'إطار ذهبي هادئ' },
    { id: 'ornate', label: 'أزهار', hint: 'بتلات ناعمة حول البورتريه' },
    { id: 'minimal', label: 'بسيط', hint: 'خط رفيع بلا زخرفة' },
    { id: 'circle', label: 'نجوم راقصة', hint: 'نقاط نجمية تدور ببطء' },
    { id: 'arch', label: 'ثقب أسود', hint: 'دوامة كونية خفيفة' },
] as const;

/** مدة الانتظار بين كل توليد عشوائي للمظهر (ms) */
export const PROFILE_RANDOM_APPEARANCE_COOLDOWN_MS = 45_000;
