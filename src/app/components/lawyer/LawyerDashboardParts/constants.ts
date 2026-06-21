export const CAIRO_FONT_STYLE = { fontFamily: 'Cairo, sans-serif' } as const;

export {
    ArchivePortalFallback as ARCHIVE_PORTAL_FALLBACK,
    CommunityScreenFallback as COMMUNITY_SCREEN_FALLBACK,
    LawyerLazyFallback as LAWYER_LAZY_FALLBACK,
    LawyerHomeAlertsFallback as LAWYER_HOME_ALERTS_FALLBACK,
    LawyerHomeHubFallback as LAWYER_HOME_HUB_FALLBACK,
    LawyerHomeDockFallback as LAWYER_HOME_DOCK_FALLBACK,
    NotificationPanelFallback as NOTIFICATION_PANEL_FALLBACK,
    LawyerProfileFallback as LAWYER_PROFILE_FALLBACK,
    GlobalSearchOverlayFallback as GLOBAL_SEARCH_OVERLAY_FALLBACK,
} from './LazyFallback';

export { LAWYER_SETTINGS_V2_DEFAULTS as LAWYER_SETTINGS_DEFAULTS } from '@/app/services/settings/defaults';
