/** أنواع مستقلة — لا تستورد من schemas الأقسام الأصلية */

export const WORKSPACE_PIN_TYPES = [
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
    whenLabel: string;
    clientName?: string;
    caseNo?: string;
    routePath: string;
};
