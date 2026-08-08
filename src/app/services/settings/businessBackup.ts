import SecureStoreService from '@/app/services/SecureStoreService';
import { validateBusinessBackupImport } from '@/app/services/settings/businessBackupSecurity';
import { STORAGE_KEYS } from '@/app/utils/constants';

export type BusinessBackupCounts = {
    lawsuits: { items: number; undated: number };
    execution: { items: number; undated: number };
    notes: { items: number; undated: number };
    vault: { items: number; undated: number };
    urgent: { keys: number };
};

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
    vault: { items: 0, undated: 0 },
    urgent: { keys: 0 },
};

export const EMPTY_BACKUP_PREVIEW: BusinessBackupPreview = {
    isLoading: false,
    keys: 0,
    bytes: 0,
    counts: EMPTY_BACKUP_COUNTS,
};

function parseRange(from: string, to: string) {
    const fromDate = from ? new Date(`${from}T00:00:00`) : null;
    const toDate = to ? new Date(`${to}T23:59:59`) : null;
    return {
        from: fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : null,
        to: toDate && !Number.isNaN(toDate.getTime()) ? toDate : null,
    };
}

function extractDate(v: unknown): Date | null {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
    const obj = v as Record<string, unknown>;
    const candidates: unknown[] = [
        obj.createdAt,
        obj.updatedAt,
        obj.created_at,
        obj.updated_at,
        obj.date,
        obj.filingDate,
        obj.filing_date,
        obj.requestDate,
        obj.sessionDate,
        obj.nextSessionDate,
        obj.decisionDate,
    ];
    for (const c of candidates) {
        if (typeof c === 'number') {
            const d = new Date(c);
            if (!Number.isNaN(d.getTime())) return d;
        }
        if (typeof c === 'string' && c.trim()) {
            const d = new Date(c);
            if (!Number.isNaN(d.getTime())) return d;
        }
    }
    return null;
}

function filterByRange(items: unknown[], selection: BusinessBackupSelection) {
    const { from, to } = parseRange(selection.from, selection.to);
    if (!from && !to) return { filtered: items, undated: 0 };
    let undated = 0;
    const filtered = items.filter((it) => {
        const d = extractDate(it);
        if (!d) {
            undated += 1;
            return selection.includeUndated;
        }
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
    });
    return { filtered, undated };
}

async function readJson(key: string): Promise<unknown> {
    try {
        const v = await SecureStoreService.getItem(key);
        if (typeof v !== 'string' || !v.trim()) return null;
        return JSON.parse(v) as unknown;
    } catch {
        return null;
    }
}

function toBase64(buf: ArrayBuffer) {
    const bytes = new Uint8Array(buf);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

function fromBase64(b64: string) {
    const binary = atob(b64);
    const buf = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return buf;
}

async function derivePasswordKey(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey'],
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );
}

export async function encryptBusinessBackupText(plainText: string, password: string) {
    const saltBuf = new ArrayBuffer(16);
    const salt = new Uint8Array(saltBuf);
    crypto.getRandomValues(salt);
    const ivBuf = new ArrayBuffer(12);
    const iv = new Uint8Array(ivBuf);
    crypto.getRandomValues(iv);
    const iterations = 250_000;
    const key = await derivePasswordKey(password, salt, iterations);
    const cipher = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(plainText),
    );
    return {
        kind: 'hami-business-backup-encrypted' as const,
        version: 1 as const,
        createdAt: new Date().toISOString(),
        kdf: { name: 'PBKDF2' as const, hash: 'SHA-256' as const, iterations },
        salt: toBase64(salt.buffer),
        iv: toBase64(iv.buffer),
        ciphertext: toBase64(cipher),
    };
}

export async function decryptBusinessBackupText(
    encrypted: {
        kind?: unknown;
        version?: unknown;
        kdf?: unknown;
        salt?: unknown;
        iv?: unknown;
        ciphertext?: unknown;
    },
    password: string,
) {
    const saltB64 = typeof encrypted.salt === 'string' ? encrypted.salt : '';
    const ivB64 = typeof encrypted.iv === 'string' ? encrypted.iv : '';
    const cipherB64 = typeof encrypted.ciphertext === 'string' ? encrypted.ciphertext : '';
    const kdf = encrypted.kdf as { iterations?: unknown } | undefined;
    const iterations =
        typeof kdf?.iterations === 'number' && Number.isFinite(kdf.iterations) ? kdf.iterations : 250_000;
    if (!saltB64 || !ivB64 || !cipherB64) throw new Error('invalid encrypted backup');
    const salt = new Uint8Array(fromBase64(saltB64));
    const iv = new Uint8Array(fromBase64(ivB64));
    const cipher = fromBase64(cipherB64);
    const key = await derivePasswordKey(password, salt, iterations);
    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
    return new TextDecoder().decode(plainBuf);
}

export async function buildBusinessBackupPayload(selection: BusinessBackupSelection) {
    const items: Record<string, string> = {};
    const counts: BusinessBackupCounts = {
        lawsuits: { items: 0, undated: 0 },
        execution: { items: 0, undated: 0 },
        notes: { items: 0, undated: 0 },
        vault: { items: 0, undated: 0 },
        urgent: { keys: 0 },
    };

    const includeKeys: string[] = [];

    if (selection.includeLawsuits) includeKeys.push(STORAGE_KEYS.LAWYER_FILES);
    if (selection.includeExecution) includeKeys.push('executionFiles');
    if (selection.includeNotes) {
        includeKeys.push(STORAGE_KEYS.LAWYER_NOTES, 'globalNotes', 'global_notes', 'hami_notes_vault');
    }
    if (selection.includeVault) includeKeys.push('hami_docs_vault');

    const allKeys = await SecureStoreService.listKeys();
    if (selection.includeExecution) {
        allKeys
            .filter((k) => k.startsWith('execution_') && k !== 'executionFiles')
            .forEach((k) => includeKeys.push(k));
    }
    if (selection.includeNotes) {
        allKeys.filter((k) => k.startsWith('hami_notes_vault_')).forEach((k) => includeKeys.push(k));
    }
    if (selection.includeUrgent) {
        const urgentKeys = allKeys.filter((k) => k.startsWith('hami:urgentActions:v1:'));
        urgentKeys.forEach((k) => includeKeys.push(k));
        counts.urgent.keys = urgentKeys.length;
    }

    const uniqueKeys = Array.from(new Set(includeKeys));

    for (const k of uniqueKeys) {
        const raw = await SecureStoreService.getItem(k);
        if (typeof raw === 'string') items[k] = raw;
    }

    const parseArrayCount = async (key: string) => {
        const v = await readJson(key);
        if (!Array.isArray(v)) return { items: 0, undated: 0, raw: null as unknown[] | null };
        const { filtered, undated } = filterByRange(v, selection);
        return { items: filtered.length, undated, raw: filtered };
    };

    if (selection.includeLawsuits && items[STORAGE_KEYS.LAWYER_FILES]) {
        const parsed = await parseArrayCount(STORAGE_KEYS.LAWYER_FILES);
        counts.lawsuits.items = parsed.items;
        counts.lawsuits.undated = parsed.undated;
        items[STORAGE_KEYS.LAWYER_FILES] = JSON.stringify(parsed.raw ?? []);
    }

    if (selection.includeExecution && items.executionFiles) {
        const parsed = await parseArrayCount('executionFiles');
        counts.execution.items = parsed.items;
        counts.execution.undated = parsed.undated;
        items.executionFiles = JSON.stringify(parsed.raw ?? []);
    }

    if (selection.includeNotes && items[STORAGE_KEYS.LAWYER_NOTES]) {
        const parsed = await parseArrayCount(STORAGE_KEYS.LAWYER_NOTES);
        counts.notes.items = parsed.items;
        counts.notes.undated = parsed.undated;
        items[STORAGE_KEYS.LAWYER_NOTES] = JSON.stringify(parsed.raw ?? []);
    }

    if (selection.includeNotes && items.hami_notes_vault) {
        const parsed = await parseArrayCount('hami_notes_vault');
        counts.notes.items += parsed.items;
        counts.notes.undated += parsed.undated;
        items.hami_notes_vault = JSON.stringify(parsed.raw ?? []);
    }

    if (selection.includeVault && items.hami_docs_vault) {
        const parsed = await parseArrayCount('hami_docs_vault');
        counts.vault.items = parsed.items;
        counts.vault.undated = parsed.undated;
        items.hami_docs_vault = JSON.stringify(parsed.raw ?? []);
    }

    const payload = {
        kind: 'hami-business-backup',
        version: 2,
        createdAt: new Date().toISOString(),
        selection: {
            lawsuits: selection.includeLawsuits,
            execution: selection.includeExecution,
            notes: selection.includeNotes,
            vault: selection.includeVault,
            urgent: selection.includeUrgent,
        },
        range: {
            from: selection.from || null,
            to: selection.to || null,
            includeUndated: selection.includeUndated,
        },
        counts,
        items,
    };

    const text = JSON.stringify(payload);
    return {
        payload,
        text,
        bytes: new Blob([text]).size,
        keys: Object.keys(items).length,
        counts,
    };
}

export async function importBusinessBackupEntries(entries: Array<[string, string]>) {
    const validation = validateBusinessBackupImport(entries);
    if (validation.ok === false) {
        throw new Error(validation.reason);
    }

    const snapshot = new Map<string, string | null>();
    for (const [k] of entries) {
        if (typeof k !== 'string') continue;
        const prior = await SecureStoreService.getItem(k);
        snapshot.set(k, prior == null ? null : String(prior));
    }

    const written: string[] = [];
    try {
        for (const [k, v] of entries) {
            if (typeof k !== 'string' || typeof v !== 'string') continue;
            await SecureStoreService.setItem(k, v);
            written.push(k);
        }
        window.dispatchEvent(new Event('hami:data-imported'));
    } catch (err) {
        for (const k of written) {
            const prior = snapshot.get(k);
            try {
                if (prior == null) await SecureStoreService.deleteItem(k);
                else await SecureStoreService.setItem(k, prior);
            } catch {
                /* best-effort rollback */
            }
        }
        throw err;
    }
}

export function parseBusinessBackupFile(text: string): {
    version: 1 | 2;
    createdAt: string | null;
    selection: Record<string, unknown> | null;
    range: Record<string, unknown> | null;
    counts: Record<string, unknown> | null;
    keys: string[];
    entries: Array<[string, string]>;
} {
    const parsed = JSON.parse(text) as unknown;
    const obj = parsed as {
        kind?: unknown;
        version?: unknown;
        createdAt?: unknown;
        selection?: unknown;
        range?: unknown;
        counts?: unknown;
        items?: unknown;
    };
    if (
        obj?.kind !== 'hami-business-backup' ||
        (obj?.version !== 1 && obj?.version !== 2) ||
        !obj.items ||
        typeof obj.items !== 'object'
    ) {
        throw new Error('invalid backup');
    }
    const entriesAll = Object.entries(obj.items as Record<string, unknown>);
    const entries = entriesAll.filter(
        (e): e is [string, string] => typeof e[0] === 'string' && typeof e[1] === 'string',
    );
    return {
        version: obj.version as 1 | 2,
        createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : null,
        selection: obj.selection && typeof obj.selection === 'object' ? (obj.selection as Record<string, unknown>) : null,
        range: obj.range && typeof obj.range === 'object' ? (obj.range as Record<string, unknown>) : null,
        counts: obj.counts && typeof obj.counts === 'object' ? (obj.counts as Record<string, unknown>) : null,
        keys: entries.map((e) => e[0]).sort((a, b) => a.localeCompare(b)),
        entries,
    };
}
