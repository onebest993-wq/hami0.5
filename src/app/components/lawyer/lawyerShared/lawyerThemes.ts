export const THEMES = {
    gold: { name: 'الذهبي الملكي', primary: '#D4BC82', secondary: '#B8A066', bg: '#0B1021' },
    navy: { name: 'الكحلي الرسمي', primary: '#6B9FD4', secondary: '#4A7BB8', bg: '#0C1524' },
    crimson: { name: 'الأحمر القرمزي', primary: '#C98888', secondary: '#A86A6A', bg: '#1A1012' },
    emerald: { name: 'الأخضر الزمردي', primary: '#6BBF9F', secondary: '#4A9A7A', bg: '#0A1512' },
    black: { name: 'الأسود الفاحم', primary: '#A8ADB5', secondary: '#6B7280', bg: '#080808' },
    silver: { name: 'الفضي المعدني', primary: '#C5CDD8', secondary: '#8B95A5', bg: '#151922' },
    sky: { name: 'الأزرق السماوي', primary: '#7EB8D4', secondary: '#5A9AB8', bg: '#0B1820' },
    brown: { name: 'البني الجلدي', primary: '#C4A075', secondary: '#A08055', bg: '#181008' },
    purple: { name: 'البنفسجي الداكن', primary: '#B08AD4', secondary: '#8B6BB8', bg: '#120D18' },
    bronze: { name: 'البرونزي العتيق', primary: '#C4956A', secondary: '#A07550', bg: '#1A140C' },
    wine: { name: 'العنابي الحالك', primary: '#B86A7A', secondary: '#944E5E', bg: '#140810' },
    matcha: { name: 'أخضر الماتشا المطفأ', primary: '#A8C4A0', secondary: '#86A882', bg: '#0F1510' },
    teal: { name: 'الأزرق البترولي العميق', primary: '#5A9A96', secondary: '#3D7875', bg: '#061014' },
    greige: { name: 'بيج الكشمير', primary: '#C8BFB4', secondary: '#A89E92', bg: '#1C1A18' },
    obsidian: { name: 'رمادي الأوبسيديان', primary: '#8896AA', secondary: '#6A7588', bg: '#101318' },
    coral: { name: 'المرجاني الكهربائي الناعم', primary: '#F08A78', secondary: '#D07060', bg: '#18100E' },
    plum: { name: 'البرقوقي الداكن', primary: '#A088B8', secondary: '#806898', bg: '#0E0812' },
    brass: { name: 'النحاس المعتق', primary: '#C4A068', secondary: '#9A8048', bg: '#141008' },
    chalk: { name: 'الأبيض الطباشيري', primary: '#E8E4DE', secondary: '#C8C4BC', bg: '#1A1918' },
    ice: { name: 'الأزرق الثلجي', primary: '#B0D0E8', secondary: '#88B0CC', bg: '#0A1218' },
};

export const SHAPES = {
    square: 'rounded-none',
    rounded: 'rounded-xl',
    pill: 'rounded-2xl',
    circle: 'rounded-[3rem]',
};

export type ThemeKey = keyof typeof THEMES;
export type ShapeKey = keyof typeof SHAPES;

export const useThemeStyles = (activeTheme: ThemeKey, activeShape: ShapeKey) => {
    // التحقق من أن المفاتيح صالحة
    const themeKey = Object.keys(THEMES).includes(activeTheme) ? activeTheme : 'gold';
    const shapeKey = Object.keys(SHAPES).includes(activeShape) ? activeShape : 'pill';
    
    const theme = THEMES[themeKey];
    const shapeClass = SHAPES[shapeKey];
    
    return {
        theme,
        shapeClass,
        glass: `bg-[${theme.bg}]/60 backdrop-blur-md border border-[${theme.primary}]/20`,
    };
};
