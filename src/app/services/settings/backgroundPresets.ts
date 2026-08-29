export type BackgroundPresetId =
    | 'none'
    | 'moroccan-zellige'
    | 'babylon-gate'
    | 'fabric-linen'
    | 'islamic-arch'
    | 'marble-vein'
    | 'parchment'
    | 'mashrabiya'
    | 'arabesque'
    | 'coral-veins'
    | 'silk-wave'
    | 'sumerian-abstract'
    | 'pebbled-leather'
    | 'fluted-wood'
    | 'soft-microcement'
    | 'abstract-calligraphy'
    | 'travertine-pores'
    | 'micro-terrazzo'
    | 'slate-slabs'
    | 'glass-mosaic'
    | 'nebula-fog'
    | 'crystal-lattice'
    | 'babylonian-vaults'
    | 'premium-canvas'
    | 'geological-fractures';

type BackgroundPresetDef = {
    id: BackgroundPresetId;
    label: string;
    backgroundSize: string;
    svg?: string;
    cssLayers?: string[];
};

const A = '{{ACCENT}}';

export const BACKGROUND_PRESETS: BackgroundPresetDef[] = [
    { id: 'none', label: 'بدون زخرفة', backgroundSize: '0' },
    {
        id: 'moroccan-zellige',
        label: 'زليج مغربي',
        backgroundSize: '48px 48px',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><g fill="none" stroke="${A}" stroke-width="0.55" opacity="0.42"><path d="M24 2 L46 24 L24 46 L2 24 Z"/><path d="M24 8 L40 24 L24 40 L8 24 Z"/><path d="M24 2 V46 M2 24 H46"/><circle cx="24" cy="24" r="2.5" fill="${A}" stroke="none" opacity="0.35"/></g></svg>`,
    },
    {
        id: 'babylon-gate',
        label: 'طوب بابلي',
        backgroundSize: '48px 24px',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="24" viewBox="0 0 48 24"><g fill="${A}" opacity="0.2"><rect x="0" y="0" width="12" height="6"/><rect x="12" y="6" width="12" height="6"/><rect x="24" y="0" width="12" height="6"/><rect x="36" y="6" width="12" height="6"/></g><g fill="none" stroke="${A}" stroke-width="0.5" opacity="0.38"><path d="M6 18 Q12 14 18 18 T30 18 T42 18"/><circle cx="24" cy="18" r="2" fill="${A}" stroke="none" opacity="0.28"/></g></svg>`,
    },
    {
        id: 'fabric-linen',
        label: 'نسيج كتان',
        backgroundSize: '16px 16px',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M0 8h16M8 0v16" stroke="${A}" stroke-width="0.45" opacity="0.32"/><path d="M0 0l16 16M16 0L0 16" stroke="${A}" stroke-width="0.35" opacity="0.22"/></svg>`,
    },
    {
        id: 'islamic-arch',
        label: 'أقواس إسلامية',
        backgroundSize: '64px 40px',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="40" viewBox="0 0 64 40"><g fill="none" stroke="${A}" stroke-width="0.55" opacity="0.38"><path d="M4 36 V22 Q16 6 32 22 Q48 6 60 22 V36"/><path d="M4 36 H60"/><path d="M16 36 V26 Q24 16 32 26 Q40 16 48 26 V36" opacity="0.55"/></g></svg>`,
    },
    {
        id: 'marble-vein',
        label: 'عرق رخام',
        backgroundSize: '100px 100px',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><path d="M0 50 Q25 35 50 50 T100 50" fill="none" stroke="${A}" stroke-width="0.6" opacity="0.35"/><path d="M0 70 Q35 48 70 65 T100 78" fill="none" stroke="${A}" stroke-width="0.45" opacity="0.28"/><path d="M8 18 Q45 30 88 12" fill="none" stroke="${A}" stroke-width="0.4" opacity="0.22"/></svg>`,
    },
    {
        id: 'parchment',
        label: 'نسيج رق',
        backgroundSize: '20px 20px',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><path d="M0 5h20M0 10h20M0 15h20" stroke="${A}" stroke-width="0.35" opacity="0.22"/><path d="M5 0v20M10 0v20M15 0v20" stroke="${A}" stroke-width="0.3" opacity="0.16"/><circle cx="5" cy="7" r="0.6" fill="${A}" opacity="0.25"/><circle cx="14" cy="4" r="0.5" fill="${A}" opacity="0.2"/><circle cx="16" cy="13" r="0.55" fill="${A}" opacity="0.22"/></svg>`,
    },
    {
        id: 'mashrabiya',
        label: 'شبكة مشربية',
        backgroundSize: '36px 36px',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><g fill="none" stroke="${A}" stroke-width="0.48" opacity="0.38"><path d="M0 9h36M0 18h36M0 27h36M9 0v36M18 0v36M27 0v36"/><path d="M0 0l36 36M36 0L0 36" opacity="0.55"/><circle cx="18" cy="18" r="2.5"/></g></svg>`,
    },
    {
        id: 'arabesque',
        label: 'أرابيسك',
        backgroundSize: '64px 64px',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><g fill="none" stroke="${A}" stroke-width="0.48" opacity="0.36"><path d="M32 6 C44 6 58 20 58 32 C58 44 44 58 32 58 C20 58 6 44 6 32 C6 20 20 6 32 6 Z"/><path d="M32 14 C40 14 50 24 50 32 C50 40 40 50 32 50 C24 50 14 40 14 32 C14 24 24 14 32 14 Z"/><path d="M32 4 V60 M4 32 H60"/><path d="M10 10 Q32 22 54 10 M10 54 Q32 42 54 54" opacity="0.5"/></g></svg>`,
    },
    {
        id: 'coral-veins',
        label: 'عرق المرجان',
        backgroundSize: '80px 80px',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><g fill="none" stroke="${A}" stroke-width="0.42" stroke-linecap="round" opacity="0.38"><path d="M0 38 C18 22 32 48 50 32 S72 18 80 36"/><path d="M4 58 C22 44 36 62 54 48 S70 52 76 66"/><path d="M8 18 C24 32 18 52 34 62 S58 28 72 14"/></g></svg>`,
    },
    {
        id: 'silk-wave',
        label: 'تموج الحرير',
        backgroundSize: '64px 32px',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32" viewBox="0 0 64 32"><g fill="none" stroke="${A}" stroke-width="0.48" stroke-linecap="round" opacity="0.34"><path d="M0 8 Q16 4 32 8 T64 8"/><path d="M0 16 Q16 12 32 16 T64 16"/><path d="M0 24 Q16 20 32 24 T64 24"/></g></svg>`,
    },
    {
        id: 'sumerian-abstract',
        label: 'تجريد سومري/بابلي',
        backgroundSize: '96px 48px',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="48" viewBox="0 0 96 48"><g fill="${A}" opacity="0.24"><path d="M10 40 V18 L18 18 V40 Z"/><path d="M34 38 V16 L40 16 L46 22 L40 28 V38 Z"/><path d="M62 40 V20 H68 V40 Z"/><path d="M82 38 L82 16 L88 16 L92 24 L88 32 L88 38 Z"/></g><g fill="none" stroke="${A}" stroke-width="0.45" opacity="0.3"><path d="M22 12 H28 M25 12 V18"/></g></svg>`,
    },
    {
        id: 'pebbled-leather',
        label: 'الجلد المحبب',
        backgroundSize: '14px 14px',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><circle cx="3.5" cy="3" r="0.85" fill="${A}" opacity="0.26"/><circle cx="10.5" cy="5.5" r="0.75" fill="${A}" opacity="0.22"/><circle cx="6" cy="10" r="0.8" fill="${A}" opacity="0.24"/><circle cx="12" cy="11.5" r="0.7" fill="${A}" opacity="0.2"/><circle cx="1.5" cy="8.5" r="0.65" fill="${A}" opacity="0.18"/></svg>`,
    },
    {
        id: 'fluted-wood',
        label: 'خشب السنديان المضلع',
        backgroundSize: '16px 16px',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect x="0" y="0" width="2" height="16" fill="${A}" opacity="0.28"/><rect x="2" y="0" width="2" height="16" fill="${A}" opacity="0.14"/><rect x="4" y="0" width="2" height="16" fill="${A}" opacity="0.32"/><rect x="6" y="0" width="2" height="16" fill="${A}" opacity="0.16"/><rect x="8" y="0" width="2" height="16" fill="${A}" opacity="0.3"/><rect x="10" y="0" width="2" height="16" fill="${A}" opacity="0.15"/><rect x="12" y="0" width="2" height="16" fill="${A}" opacity="0.34"/><rect x="14" y="0" width="2" height="16" fill="${A}" opacity="0.17"/></svg>`,
    },
    {
        id: 'soft-microcement',
        label: 'الميكروسيمنت الناعم',
        backgroundSize: '72px 72px',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72"><ellipse cx="22" cy="28" rx="20" ry="14" fill="${A}" opacity="0.1"/><ellipse cx="52" cy="48" rx="16" ry="12" fill="${A}" opacity="0.08"/><path d="M0 36 Q24 32 48 38 T72 34" fill="none" stroke="${A}" stroke-width="0.75" opacity="0.16"/><path d="M4 52 Q30 48 56 54" fill="none" stroke="${A}" stroke-width="0.55" opacity="0.12"/></svg>`,
    },
    {
        id: 'abstract-calligraphy',
        label: 'الخط الديواني المجرّد',
        backgroundSize: '120px 80px',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80"><g fill="none" stroke="${A}" stroke-linecap="round" opacity="0.22"><path d="M8 62 Q38 8 68 48 Q88 68 112 28" stroke-width="1.4"/><path d="M24 72 Q48 38 78 68" stroke-width="0.9" opacity="0.65"/><path d="M50 14 Q72 42 96 18" stroke-width="0.75" opacity="0.55"/></g></svg>`,
    },
    {
        id: 'travertine-pores',
        label: 'حجر الترافرتين',
        backgroundSize: '40px 60px',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="60" viewBox="0 0 40 60"><ellipse cx="10" cy="14" rx="1.8" ry="4.2" fill="${A}" opacity="0.22"/><ellipse cx="26" cy="28" rx="1.5" ry="5" fill="${A}" opacity="0.18"/><ellipse cx="14" cy="44" rx="2" ry="4.5" fill="${A}" opacity="0.2"/><ellipse cx="32" cy="50" rx="1.6" ry="3.8" fill="${A}" opacity="0.17"/><ellipse cx="22" cy="8" rx="1.2" ry="2.8" fill="${A}" opacity="0.15"/></svg>`,
    },
    {
        id: 'micro-terrazzo',
        label: 'كسر الرخام المجهري',
        backgroundSize: '36px 36px',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="6" cy="8" r="0.55" fill="${A}" opacity="0.34"/><circle cx="18" cy="4" r="0.5" fill="${A}" opacity="0.28"/><circle cx="30" cy="12" r="0.6" fill="${A}" opacity="0.32"/><circle cx="10" cy="22" r="0.48" fill="${A}" opacity="0.26"/><circle cx="24" cy="26" r="0.52" fill="${A}" opacity="0.3"/><circle cx="32" cy="32" r="0.45" fill="${A}" opacity="0.24"/><circle cx="4" cy="30" r="0.5" fill="${A}" opacity="0.22"/></svg>`,
    },
    {
        id: 'slate-slabs',
        label: 'ألواح الصخر',
        backgroundSize: '48px 24px',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="24" viewBox="0 0 48 24"><path d="M0 6 H48 M0 12 H48 M0 18 H48" stroke="${A}" stroke-width="0.38" opacity="0.32"/><path d="M0 0 H48" stroke="${A}" stroke-width="0.22" opacity="0.16"/></svg>`,
    },
    {
        id: 'glass-mosaic',
        label: 'الفسيفساء الزجاجية',
        backgroundSize: '20px 20px',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><rect x="0" y="0" width="5" height="5" fill="${A}" opacity="0.14"/><rect x="5" y="0" width="5" height="5" fill="${A}" opacity="0.26"/><rect x="10" y="0" width="5" height="5" fill="${A}" opacity="0.18"/><rect x="15" y="0" width="5" height="5" fill="${A}" opacity="0.22"/><rect x="0" y="5" width="5" height="5" fill="${A}" opacity="0.24"/><rect x="5" y="5" width="5" height="5" fill="${A}" opacity="0.16"/><rect x="10" y="5" width="5" height="5" fill="${A}" opacity="0.28"/><rect x="15" y="5" width="5" height="5" fill="${A}" opacity="0.15"/><rect x="0" y="10" width="5" height="5" fill="${A}" opacity="0.2"/><rect x="5" y="10" width="5" height="5" fill="${A}" opacity="0.25"/><rect x="10" y="10" width="5" height="5" fill="${A}" opacity="0.17"/><rect x="15" y="10" width="5" height="5" fill="${A}" opacity="0.23"/><rect x="0" y="15" width="5" height="5" fill="${A}" opacity="0.18"/><rect x="5" y="15" width="5" height="5" fill="${A}" opacity="0.22"/><rect x="10" y="15" width="5" height="5" fill="${A}" opacity="0.27"/><rect x="15" y="15" width="5" height="5" fill="${A}" opacity="0.14"/></svg>`,
    },
    {
        id: 'nebula-fog',
        label: 'الضباب السديمي',
        backgroundSize: '160px 160px',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><circle cx="48" cy="56" r="46" fill="${A}" opacity="0.12"/><circle cx="118" cy="42" r="38" fill="${A}" opacity="0.09"/><circle cx="88" cy="118" r="52" fill="${A}" opacity="0.11"/><circle cx="28" cy="128" r="30" fill="${A}" opacity="0.08"/><circle cx="132" cy="96" r="24" fill="${A}" opacity="0.07"/></svg>`,
    },
    {
        id: 'crystal-lattice',
        label: 'شبكة الكريستال',
        backgroundSize: '40px 40px',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g fill="none" stroke="${A}" stroke-width="0.42" opacity="0.36"><path d="M0 20 L20 0 L40 20 L20 40 Z"/><path d="M20 0 V40 M0 20 H40"/><path d="M0 0 L40 40 M40 0 L0 40" opacity="0.45"/></g></svg>`,
    },
    {
        id: 'babylonian-vaults',
        label: 'أقواس بابل المعلقة',
        backgroundSize: '80px 48px',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="48" viewBox="0 0 80 48"><g fill="none" stroke="${A}" stroke-width="0.52" opacity="0.34"><path d="M4 44 Q20 6 36 44"/><path d="M24 44 Q40 10 56 44"/><path d="M44 44 Q60 8 76 44"/><path d="M0 44 H80" opacity="0.4"/></g></svg>`,
    },
    {
        id: 'premium-canvas',
        label: 'نسيج القنب الثقيل',
        backgroundSize: '20px 20px',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><path d="M0 5 H20 M0 10 H20 M0 15 H20 M5 0 V20 M10 0 V20 M15 0 V20" stroke="${A}" stroke-width="0.65" opacity="0.34"/><path d="M0 0 L20 20 M20 0 L0 20" stroke="${A}" stroke-width="0.45" opacity="0.22"/></svg>`,
    },
    {
        id: 'geological-fractures',
        label: 'التكسير الجيولوجي',
        backgroundSize: '96px 96px',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><g fill="none" stroke="${A}" stroke-width="0.46" stroke-linecap="round" stroke-linejoin="round" opacity="0.32"><path d="M8 82 L34 46 L26 18 L54 34 L72 6"/><path d="M84 88 L64 52 L78 26 L44 38 L28 58"/><path d="M48 88 L58 62 L42 48" opacity="0.55"/></g></svg>`,
    },
];

export const BACKGROUND_PRESET_MAP = Object.fromEntries(
    BACKGROUND_PRESETS.map((p) => [p.id, p]),
) as Record<BackgroundPresetId, BackgroundPresetDef>;

const LEGACY_PRESET_FALLBACK: Record<string, BackgroundPresetId> = {
    'islamic-star': 'moroccan-zellige',
    'paint-wash': 'moroccan-zellige',
};

export function normalizeBackgroundPreset(raw: unknown): BackgroundPresetId {
    if (typeof raw === 'string') {
        if (raw in BACKGROUND_PRESET_MAP) return raw as BackgroundPresetId;
        if (raw in LEGACY_PRESET_FALLBACK) return LEGACY_PRESET_FALLBACK[raw];
    }
    return 'moroccan-zellige';
}
