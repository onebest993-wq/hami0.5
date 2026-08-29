/** مجالات الإضابير المحلية — جاهزة للمزامنة السحابية لاحقاً */
export type DossierDomain = 'lawsuit' | 'execution';

/** مجالات النسخ الاحتياطي — إضابير + بيانات المحامي الحساسة */
export type BackupDomain =
    | DossierDomain
    | 'notes'
    | 'community'
    | 'vault'
    | 'repository'
    | 'calendar'
    | 'tasks'
    | 'transactions';

export type DossierSnapshotMeta = {
    domain: BackupDomain;
    revision: number;
    savedAt: string;
    itemCount: number;
};

export type DossierCloudSyncOp = {
    id: string;
    domain: DossierDomain;
    op: 'upsert_collection' | 'delete_item';
    payloadRef?: string;
    createdAt: string;
    /** للمزامنة السحابية المستقبلية */
    status: 'pending' | 'synced' | 'failed';
};

export const DOSSIER_SYNC_QUEUE_KEY = 'hami:dossier-sync-queue:v1';
