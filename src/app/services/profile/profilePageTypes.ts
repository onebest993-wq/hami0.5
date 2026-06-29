export type ProfileAppearanceColor = 'navy' | 'gold' | 'emerald' | 'wine' | 'ice' | 'bronze';

export type ProfileAppearanceMaterial = 'glass' | 'fabric' | 'metallic' | 'gilded' | 'ornate' | 'matte';

export type ProfileBlockShape = 'rounded' | 'pill' | 'diamond' | 'circle' | 'hexagon';

export type ProfileBlockKind = 'text' | 'image';

export type ProfileMediaTemplate =
    | 'rectangle'
    | 'circle'
    | 'flower'
    | 'diamond'
    | 'hexagon'
    | 'arch'
    | 'perspective'
    | 'crest'
    | 'lens'
    | 'temple'
    | 'star'
    | 'cinema'
    | 'vault';

export interface ProfilePrivacySettings {
    showPhoneMeta: boolean;
    showCityMeta: boolean;
    showSyndicate: boolean;
    showContactChannels: boolean;
    showGallery: boolean;
    showCustomBlocks: boolean;
    /** قنوات مخفية عن الزوار فقط */
    hiddenContactIds: string[];
}

export interface ProfileAppearanceSettings {
    accentColor: ProfileAppearanceColor;
    material: ProfileAppearanceMaterial;
}

export type ProfileTextEffect = 'none' | 'glow' | 'gradient' | 'underline' | 'shadow';

export type ProfileFontSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';

export type ProfileTextFont = 'tajawal' | 'cairo' | 'literary';

export interface ProfileBlockTextStyle {
    color?: string;
    fontSize?: ProfileFontSize;
    fontWeight?: 'normal' | 'bold';
    effect?: ProfileTextEffect;
    align?: 'right' | 'center' | 'left';
    fontFamily?: ProfileTextFont;
    lineHeight?: number;
    letterSpacing?: number;
}

/** تنسيق مقطع/كلمة داخل سطر */
export interface ProfileTextSpanStyle {
    id: string;
    lineIndex: number;
    start: number;
    end: number;
    style: ProfileBlockTextStyle;
}

export type ProfileCanvasMaterial = 'glass' | 'paper' | 'velvet' | 'parchment' | 'slate' | 'night';

export type ProfileCanvasFrameShape = 'rounded' | 'arch' | 'scroll' | 'door';

export type ProfileCanvasFrameGlow = 'none' | 'soft' | 'gold' | 'aurora' | 'bloom';

export type ProfileCanvasInteraction =
    | 'none'
    | 'tapReveal'
    | 'doorOpen'
    | 'mistSwipe'
    | 'stardust'
    | 'luminousFold';

export type ProfileImageInteraction = 'none' | 'kenBurns' | 'tilt' | 'shimmer' | 'pulse' | 'parallax';

export interface ProfileImageFrameStyle {
    accentColor?: string;
    frameGlow?: ProfileCanvasFrameGlow;
    glowIntensity?: number;
    rimStyle?: 'minimal' | 'gold' | 'ornate' | 'neon';
    interaction?: ProfileImageInteraction;
    vignette?: boolean;
}

export interface ProfileBlockCanvasStyle {
    /** تفعيل لوحة الكتابة — إن false يبقى النص حراً بدون إطار */
    enabled?: boolean;
    backgroundColor?: string;
    backgroundImage?: string;
    material?: ProfileCanvasMaterial;
    frameShape?: ProfileCanvasFrameShape;
    frameGlow?: ProfileCanvasFrameGlow;
    glowIntensity?: number;
    accentColor?: string;
    borderWidthPx?: number;
    paddingPx?: number;
    minHeightPx?: number;
    interaction?: ProfileCanvasInteraction;
}

export interface ProfileCustomBlock {
    id: string;
    /** نص حر = خواطر/قصيدة بدون إطار — صورة = قوالب قص بدون حواف */
    kind: ProfileBlockKind;
    title: string;
    shape: ProfileBlockShape;
    width: 'full' | 'half';
    minHeightPx: number;
    imageUrl?: string;
    mediaTemplate?: ProfileMediaTemplate;
    /** النص الحر متعدد الأسطر */
    body?: string;
    /** تنسيق افتراضي لكل الأسطر */
    bodyStyle?: ProfileBlockTextStyle;
    /** تنسيق مخصص لكل سطر (اختياري) */
    lineStyles?: ProfileBlockTextStyle[];
    /** تنسيق مقاطع/كلمات داخل الأسطر */
    textSpans?: ProfileTextSpanStyle[];
    /** لوحة الكتابة — خامة، إطار، تفاعل */
    canvasStyle?: ProfileBlockCanvasStyle;
    order?: number;
    posX?: number;
    /** موضع عمودي من الأعلى كنسبة 0–100 */
    posY?: number;
    /** عرض الحاوية كنسبة من مساحة اللوحة */
    blockWidthPct?: number;
    /** @deprecated استُبدل بـ posX/posY */
    offsetX?: number;
    /** @deprecated استُبدل بـ posX/posY */
    offsetY?: number;
    imageHeightPx?: number;
    /** موضع أفقي للصورة داخل الإطار (0–100) */
    imageFocusX?: number;
    /** موضع عمودي للصورة داخل الإطار (0–100) */
    imageFocusY?: number;
    /** تكبير الصورة داخل الإطار (100–220) */
    imageZoom?: number;
    imageFrameStyle?: ProfileImageFrameStyle;
    /** @deprecated استُبدل بـ bodyStyle */
    titleStyle?: ProfileBlockTextStyle;
}

export interface ProfilePageCustomization {
    privacy: ProfilePrivacySettings;
    appearance: ProfileAppearanceSettings;
    customBlocks: ProfileCustomBlock[];
}
