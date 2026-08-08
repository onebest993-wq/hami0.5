/** أنواع مستقلة — لا تستورد من schemas الأقسام الأصلية */

export const WORKSPACE_PIN_TYPES = [
    'hub',
    'lawsuit',
    'criminal',
    'execution',
    'transaction',
    'threading',
    'urgent',
    'notepad',
    'task',
] as const;
export type WorkspacePinType = (typeof WORKSPACE_PIN_TYPES)[number];

/** كل الأقسام المعرّفة — بما فيها التنفيذ — تدعم التثبيت والربط العنقودي */
export function isClusterPinEligibleType(type: WorkspacePinType): boolean {
    return (WORKSPACE_PIN_TYPES as readonly string[]).includes(type);
}

export type WorkspacePinnedItem = {
    id: string;
    type: WorkspacePinType;
    title: string;
    clientName: string;
    caseNumber: string;
    routePath: string;
};

export type ClusterScanRecord = {
    id: string;
    type: WorkspacePinType;
    title: string;
    clientName: string;
    caseNumber: string;
    routePath: string;
};

export type ClusterRelatedLink = ClusterScanRecord & {
    matchReason: 'clientName' | 'caseNumber' | 'both';
};

export type ClusterPinView = {
    pin: WorkspacePinnedItem;
    related: ClusterRelatedLink[];
};

export type CalendarRadarEvent = {
    id: string;
    title: string;
    /** للوصولية — تاريخ + وقت */
    whenLabel: string;
    /** اليوم / غداً / تاريخ / انتهى */
    dateLabel: string;
    /** وقت بغداد */
    timeLabel: string;
    /** شارة القسم: تقويم، دعوى، مهمة… */
    sourceModuleLabel: string;
    /** محكمة أو مكان */
    sourcePlace?: string;
    /** مصدر + مكان — للوصولية */
    sourceHint?: string;
    clientName?: string;
    caseNo?: string;
    routePath: string;
    /** للإزالة من الرادار عند وجود تنبيه مهمة ميدانية مُحقونة */
    sourceEntityId?: string;
};
