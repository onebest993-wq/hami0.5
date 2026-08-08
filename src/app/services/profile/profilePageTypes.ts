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

/** ┘à┘ ┘è┘à┘â┘┘ç ╪▓┘è╪د╪▒╪ر ╪د┘╪╡┘╪ص╪ر ╪د┘╪┤╪«╪╡┘è╪ر ظ¤ ┘à╪▒╪ز╪ذ╪╖ ╪ذ┘à╪ز╪د╪ذ╪╣╪ر ╪د┘┘à┘╪ز╪»┘ë ╪╣┘╪» followers */
export type ProfilePageAccess = 'public' | 'followers' | 'private';

export interface ProfilePrivacySettings {
    /** ╪د┘╪ز╪▒╪د╪╢┘è public ظ¤ ┘┘╪ز┘ê╪د┘┘é ┘à╪╣ ┘à┘┘╪د╪ز ┘é╪»┘è┘à╪ر */
    pageAccess?: ProfilePageAccess;
    showPhoneMeta: boolean;
    showCityMeta: boolean;
    showSyndicate: boolean;
    showContactChannels: boolean;
    showGallery: boolean;
    showCustomBlocks: boolean;
    /** ┘é┘┘ê╪د╪ز ┘à╪«┘┘è╪ر ╪╣┘ ╪د┘╪▓┘ê╪د╪▒ ┘┘é╪╖ */
    hiddenContactIds: string[];
}

export type ProfilePortraitFrameId = 'classic' | 'ornate' | 'minimal' | 'circle' | 'arch';

/** @deprecated ╪د╪│╪ز╪«╪»┘à ProfilePortraitFrameId ┘┘┘é┘è┘à╪ر ╪د┘┘à╪«╪▓┘ّ┘╪ر╪ؤ ┘ê╪د┘╪«┘è╪د╪▒ ╪د┘┘à╪╣╪▒┘ê╪╢ ┘ç┘ê ProfilePortraitFrameOption */
export type ProfilePortraitFrame = ProfilePortraitFrameId;

export type ProfilePortraitFrameOption = {
    id: ProfilePortraitFrameId;
    label: string;
    hint: string;
};

export interface ProfileAppearanceSettings {
    accentColor: ProfileAppearanceColor;
    material: ProfileAppearanceMaterial;
    portraitFrame?: ProfilePortraitFrameId;
}

export type ProfileTextEffect = 'none' | 'glow' | 'gradient' | 'underline' | 'shadow';

export type ProfileFontSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';

export type ProfileTextFont =
    | 'tajawal'
    | 'cairo'
    | 'literary'
    | 'almarai'
    | 'changa'
    | 'noto'
    | 'reem';

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

/** ╪ز┘╪│┘è┘é ┘à┘é╪╖╪╣/┘â┘┘à╪ر ╪»╪د╪«┘ ╪│╪╖╪▒ */
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
    /** ╪ز┘╪╣┘è┘ ┘┘ê╪ص╪ر ╪د┘┘â╪ز╪د╪ذ╪ر ظ¤ ╪ح┘ false ┘è╪ذ┘é┘ë ╪د┘┘╪╡ ╪ص╪▒╪د┘ï ╪ذ╪»┘ê┘ ╪ح╪╖╪د╪▒ */
    enabled?: boolean;
    backgroundColor?: string;
    backgroundImage?: string;
    /** ┘à╪│╪د╪▒ ╪ز╪«╪▓┘è┘ ╪│╪ص╪د╪ذ┘è ┘╪«┘┘┘è╪ر ╪د┘┘┘ê╪ص╪ر (╪ح┘ ┘ê┘╪ش╪») */
    backgroundStoragePath?: string;
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
    /** ┘╪╡ ╪ص╪▒ = ╪«┘ê╪د╪╖╪▒/┘é╪╡┘è╪»╪ر ╪ذ╪»┘ê┘ ╪ح╪╖╪د╪▒ ظ¤ ╪╡┘ê╪▒╪ر = ┘é┘ê╪د┘╪ذ ┘é╪╡ ╪ذ╪»┘ê┘ ╪ص┘ê╪د┘ */
    kind: ProfileBlockKind;
    title: string;
    shape: ProfileBlockShape;
    width: 'full' | 'half';
    minHeightPx: number;
    imageUrl?: string;
    /** ┘à╪│╪د╪▒ ╪ز╪«╪▓┘è┘ ╪│╪ص╪د╪ذ┘è ┘╪╡┘ê╪▒╪ر ╪د┘┘â╪ز┘╪ر ظ¤ ┘è┘╪│╪ز╪«╪»┘à ┘╪ح╪╣╪د╪»╪ر ╪د┘╪ز┘ê┘é┘è╪╣ ╪»┘ê┘ ┘┘é╪» ╪د┘┘â╪ز┘╪ر */
    imageStoragePath?: string;
    mediaTemplate?: ProfileMediaTemplate;
    /** ╪د┘┘╪╡ ╪د┘╪ص╪▒ ┘à╪ز╪╣╪»╪» ╪د┘╪ث╪│╪╖╪▒ */
    body?: string;
    /** ╪ز┘╪│┘è┘é ╪د┘╪ز╪▒╪د╪╢┘è ┘┘â┘ ╪د┘╪ث╪│╪╖╪▒ */
    bodyStyle?: ProfileBlockTextStyle;
    /** ╪ز┘╪│┘è┘é ┘à╪«╪╡╪╡ ┘┘â┘ ╪│╪╖╪▒ (╪د╪«╪ز┘è╪د╪▒┘è) */
    lineStyles?: ProfileBlockTextStyle[];
    /** ╪ز┘╪│┘è┘é ┘à┘é╪د╪╖╪╣/┘â┘┘à╪د╪ز ╪»╪د╪«┘ ╪د┘╪ث╪│╪╖╪▒ */
    textSpans?: ProfileTextSpanStyle[];
    /** ┘┘ê╪ص╪ر ╪د┘┘â╪ز╪د╪ذ╪ر ظ¤ ╪«╪د┘à╪ر╪î ╪ح╪╖╪د╪▒╪î ╪ز┘╪د╪╣┘ */
    canvasStyle?: ProfileBlockCanvasStyle;
    order?: number;
    posX?: number;
    /** ┘à┘ê╪╢╪╣ ╪╣┘à┘ê╪»┘è ┘à┘ ╪د┘╪ث╪╣┘┘ë ┘â┘╪│╪ذ╪ر 0ظô100 */
    posY?: number;
    /** ╪╣╪▒╪╢ ╪د┘╪ص╪د┘ê┘è╪ر ┘â┘╪│╪ذ╪ر ┘à┘ ┘à╪│╪د╪ص╪ر ╪د┘┘┘ê╪ص╪ر */
    blockWidthPct?: number;
    /** @deprecated ╪د╪│╪ز┘╪ذ╪»┘ ╪ذ┘ posX/posY */
    offsetX?: number;
    /** @deprecated ╪د╪│╪ز┘╪ذ╪»┘ ╪ذ┘ posX/posY */
    offsetY?: number;
    imageHeightPx?: number;
    /** ┘à┘ê╪╢╪╣ ╪ث┘┘é┘è ┘┘╪╡┘ê╪▒╪ر ╪»╪د╪«┘ ╪د┘╪ح╪╖╪د╪▒ (0ظô100) */
    imageFocusX?: number;
    /** ┘à┘ê╪╢╪╣ ╪╣┘à┘ê╪»┘è ┘┘╪╡┘ê╪▒╪ر ╪»╪د╪«┘ ╪د┘╪ح╪╖╪د╪▒ (0ظô100) */
    imageFocusY?: number;
    /** ╪ز┘â╪ذ┘è╪▒ ╪د┘╪╡┘ê╪▒╪ر ╪»╪د╪«┘ ╪د┘╪ح╪╖╪د╪▒ (100ظô220) */
    imageZoom?: number;
    imageFrameStyle?: ProfileImageFrameStyle;
    /** @deprecated ╪د╪│╪ز┘╪ذ╪»┘ ╪ذ┘ bodyStyle */
    titleStyle?: ProfileBlockTextStyle;
}

export interface ProfilePageCustomization {
    privacy: ProfilePrivacySettings;
    appearance: ProfileAppearanceSettings;
    customBlocks: ProfileCustomBlock[];
}
