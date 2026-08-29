export type BusinessBackupCounts = {
    lawsuits: { items: number; undated: number };
    execution: { items: number; undated: number };
    notes: { items: number; undated: number };
    vault: { items: number; undated: number; localFiles: number; localBytes: number };
    urgent: { keys: number };
};

export type BusinessBackupVaultBlob = {
    authorId: string;
    docId: string;
    mimeType: string;
    size: number;
    sha256: string;
    data: string;
};

export const MAX_BACKUP_VAULT_BLOB_COUNT = 250;
export const MAX_BACKUP_VAULT_BINARY_BYTES = 12_000_000;

export type BusinessBackupPreview = {
    isLoading: boolean;
    keys: number;
    bytes: number;
    counts: BusinessBackupCounts;
};

export type PendingBusinessImport = {
    fileName: string;
    version: 1 | 2;
    createdAt: string | null;
    selection: Record<string, unknown> | null;
    range: Record<string, unknown> | null;
    counts: Record<string, unknown> | null;
    keys: string[];
    entries: Array<[string, string]>;
    vaultBlobs: BusinessBackupVaultBlob[];
};

export type BusinessBackupSelection = {
    includeLawsuits: boolean;
    includeExecution: boolean;
    includeNotes: boolean;
    includeVault: boolean;
    includeUrgent: boolean;
    includeUndated: boolean;
    from: string;
    to: string;
};

export const EMPTY_BACKUP_COUNTS: BusinessBackupCounts = {
    lawsuits: { items: 0, undated: 0 },
    execution: { items: 0, undated: 0 },
    notes: { items: 0, undated: 0 },
    vault: { items: 0, undated: 0, localFiles: 0, localBytes: 0 },
    urgent: { keys: 0 },
};

export const EMPTY_BACKUP_PREVIEW: BusinessBackupPreview = {
    isLoading: false,
    keys: 0,
    bytes: 0,
    counts: EMPTY_BACKUP_COUNTS,
};
