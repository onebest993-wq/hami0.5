export type NotificationTab = 'forum' | 'system';

export type TimeBucket = 'today' | 'yesterday' | 'older';

export interface NotificationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    onNavigate: (path: string, payload: Record<string, unknown>) => void;
    /** يُزاد عند كل فتح لإعادة تبويب المنتدى الافتراضي */
    panelSessionKey?: number;
    /** يبقي الشجرة mounted بعد الإغلاق — إخفاء CSS فقط */
    keepAlive?: boolean;
}
