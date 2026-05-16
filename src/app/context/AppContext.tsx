import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

// --- 🎨 THEME CONSTANTS ---
export const THEME = {
    gold: '#E6C673',
    dark: '#05060D',
    cardBg: '#1A1E2E',
    glass: 'rgba(26, 30, 46, 0.8)'
};

// --- 📐 GRID LAW DEFINITIONS ---
export type WidgetType = 'work_module' | 'market_module' | 'stats_module';
export type ViewMode = 'compact' | 'expanded';

export interface GridWidget {
    id: string;
    type: WidgetType;
    mode: ViewMode;
}

// --- 🧱 LEGACY TYPES (For ConsultationsFeed) ---
export interface Consultation {
    id: number;
    name: string;
    content: string;
    time: string;
    isLawyer: boolean;
    offers: any[];
}

interface AppContextType {
    // Theme
    accentColor: string;
    themeConfig: {
        mode: 'dark' | 'light' | 'auto';
        accentColor: string;
        cardColor: string;
        glowColor: string;
        shape: 'square' | 'rounded' | 'pill' | 'circle';
        backgroundImage: string | null;
        overlayOpacity: number;
        fontSize?: 'sm' | 'md' | 'lg'; // Added optional fontSize
    };
    
    // Grid State
    widgets: GridWidget[];
    reorderWidgets: (newOrder: GridWidget[]) => void;
    toggleWidgetMode: (id: string) => void;
    
    // Edit State
    isEditMode: boolean;
    setEditMode: (v: boolean) => void;

    // --- LEGACY SUPPORT (Fixing ConsultationsFeed Crash) ---
    consultations: Consultation[];
    addConsultation: (content: string, isLawyer: boolean, name: string, isAnonymous: boolean) => void;
    addOffer: (postId: number, offer: any) => void;
    
    // Legacy Placeholders to prevent other crashes
    identity: any; setIdentity: any;
    walletBalance: any; courtStats: any;
    lawyerStatus: any; setLawyerStatus: any;
    addTransaction: any;
    dashboardWidgets: any[]; setDashboardWidgets: any;
    toggleEditMode: any; updateTheme: any; extractColorsFromImage: any;
}

// Initial Grid Setup
const INITIAL_WIDGETS: GridWidget[] = [
    { id: 'main_work', type: 'work_module', mode: 'expanded' },
    { id: 'market_tracker', type: 'market_module', mode: 'compact' },
    { id: 'daily_stats', type: 'stats_module', mode: 'compact' },
];

const MOCK_CONSULTATIONS = [
    { id: 1, name: 'أحمد العلي', content: 'لدي استفسار بخصوص حضانة الأطفال بعد الطلاق..', time: 'منذ 10د', isLawyer: false, offers: [] },
    { id: 2, name: 'مستخدم مجهول', content: 'هل يحق للمؤجر إخلائي بدون إنذار؟', time: 'منذ ساعة', isLawyer: false, offers: [{ lawyerName: 'المحامي (أنت)', price: 50 }] },
];

const AppContext = createContext<AppContextType>({} as any);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
    // Grid State
    const [widgets, setWidgets] = useState<GridWidget[]>(INITIAL_WIDGETS);
    const [isEditMode, setIsEditMode] = useState(false);

    // Legacy Data State
    const [consultations, setConsultations] = useState<Consultation[]>(MOCK_CONSULTATIONS);

    // Theme State
    const [themeConfig, setThemeConfig] = useState({
        mode: 'dark' as const,
        accentColor: THEME.gold,
        cardColor: 'rgba(26, 30, 46, 0.6)',
        glowColor: THEME.gold,
        shape: 'rounded' as const,
        backgroundImage: null,
        overlayOpacity: 0.7,
        fontSize: 'md' as const
    });

    const reorderWidgets = useCallback((newOrder: GridWidget[]) => setWidgets(newOrder), []);

    const toggleWidgetMode = useCallback((id: string) => {
        setWidgets(prev => prev.map(w => 
            w.id === id ? { ...w, mode: w.mode === 'compact' ? 'expanded' : 'compact' } : w
        ));
    }, []);

    const addConsultation = useCallback((content: string, isLawyer: boolean, name: string, isAnonymous: boolean) => {
        setConsultations(prev => {
            const newPost: Consultation = {
                id: Date.now(),
                name: isAnonymous ? 'مستخدم مجهول' : name,
                content,
                time: 'الآن',
                isLawyer,
                offers: []
            };
            return [newPost, ...prev];
        });
    }, []);

    const addOffer = useCallback((postId: number, offer: any) => {
        setConsultations(prev => prev.map(post => 
            post.id === postId ? { ...post, offers: [...post.offers, offer] } : post
        ));
    }, []);

    const updateTheme = useCallback((updates: any) => setThemeConfig(prev => ({ ...prev, ...updates })), []);

    const toggleEditMode = useCallback(() => setIsEditMode(v => !v), []);

    const contextValue = useMemo(
        () => ({
            accentColor: themeConfig.accentColor,
            themeConfig,

            widgets,
            reorderWidgets,
            toggleWidgetMode,
            isEditMode,
            setEditMode: setIsEditMode,

            consultations,
            addConsultation,
            addOffer,

            identity: 'lawyer',
            setIdentity: () => {},
            walletBalance: '$0',
            courtStats: {},
            lawyerStatus: 'online',
            setLawyerStatus: () => {},
            addTransaction: () => {},
            dashboardWidgets: [] as any[],
            setDashboardWidgets: () => {},
            toggleEditMode,
            updateTheme,
            extractColorsFromImage: () => {}
        }),
        [
            themeConfig,
            widgets,
            reorderWidgets,
            toggleWidgetMode,
            isEditMode,
            consultations,
            addConsultation,
            addOffer,
            toggleEditMode,
            updateTheme,
        ]
    );

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppTheme = () => useContext(AppContext);
export const useApp = () => useContext(AppContext);

// Helper function needed by SharedComponents
export const getShapeClass = (shape: string, type: 'card' | 'btn' = 'card') => {
    switch (shape) {
        case 'square': return 'rounded-none';
        case 'rounded': return type === 'btn' ? 'rounded-lg' : 'rounded-2xl';
        case 'pill': return type === 'btn' ? 'rounded-full' : 'rounded-[32px]';
        case 'circle': return type === 'btn' ? 'rounded-full' : 'rounded-[40px]';
        default: return 'rounded-2xl';
    }
};

// Helper for Styles (Restored)
export const useThemeStyles = () => {
    const { themeConfig } = useAppTheme();
    return {
        text: { color: themeConfig.accentColor },
        border: { borderColor: themeConfig.accentColor },
        glow: { boxShadow: `0 0 20px ${themeConfig.glowColor}40` },
        bgCard: { backgroundColor: themeConfig.cardColor, backdropFilter: 'blur(12px)' },
        fontSizeClass: themeConfig.fontSize === 'lg' ? 'text-lg' : themeConfig.fontSize === 'sm' ? 'text-xs' : 'text-sm'
    };
};
