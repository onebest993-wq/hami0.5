import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    X,
    Search,
    Sparkles,
} from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useLawyerSettings } from '@/app/context/LawyerSettingsContext';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import SecureStoreService from '@/app/services/SecureStoreService';
import { STORAGE_KEYS } from '@/app/utils/constants';
import {
    clearStoredBiometricCredential,
} from '@/app/services/security/webAuthnLock';
import {
    SETTINGS_NAV,
    migrateLawyerSettings,
    persistWallpaper,
    type AppSettingsState,
    type SettingsSectionId,
} from '@/app/services/settings';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { DataSection } from './DataSection';
import { AppearanceSection } from './AppearanceSection';
import { NotificationsSection } from './NotificationsSection';
import { SecuritySection } from './SecuritySection';
import { WorkflowSection } from './WorkflowSection';
import { AccountSection } from './AccountSection';
import { AdvancedSection } from './AdvancedSection';

export interface HamiSettingsProps {
    onClose: () => void;
    onLogout?: () => void;
    onOpenArchive?: () => void;
    onOpenProfile?: () => void;
    onOpenPrivacy?: () => void;
    onOpenSupport?: () => void;
}

export const HamiSettings = ({ onClose, onLogout, onOpenArchive, onOpenProfile, onOpenPrivacy, onOpenSupport }: HamiSettingsProps) => {
    const {
        settings,
        setSettings,
        currentTheme,
        currentShape,
        setCurrentTheme,
        setCurrentShape,
        resetToDefaults,
    } = useLawyerSettings();

    const [activeSection, setActiveSection] = useState<SettingsSectionId>('appearance');
    const [searchQuery, setSearchQuery] = useState('');
    const importSettingsInputRef = useRef<HTMLInputElement>(null);
    const importBusinessInputRef = useRef<HTMLInputElement>(null);
    const clearConfirmTimerRef = useRef<number | null>(null);
    const [clearArmed, setClearArmed] = useState(false);
    const [backupPanelOpen, setBackupPanelOpen] = useState(false);
    const [backupIncludeLawsuits, setBackupIncludeLawsuits] = useState(true);
    const [backupIncludeExecution, setBackupIncludeExecution] = useState(true);
    const [backupIncludeNotes, setBackupIncludeNotes] = useState(true);
    const [backupIncludeVault, setBackupIncludeVault] = useState(false);
    const [backupIncludeUrgent, setBackupIncludeUrgent] = useState(true);
    const [backupIncludeUndated, setBackupIncludeUndated] = useState(true);
    const [backupFrom, setBackupFrom] = useState('');
    const [backupTo, setBackupTo] = useState('');
    const [backupPreview, setBackupPreview] = useState<{
        isLoading: boolean;
        keys: number;
        bytes: number;
        counts: {
            lawsuits: { items: number; undated: number };
            execution: { items: number; undated: number };
            notes: { items: number; undated: number };
            vault: { items: number; undated: number };
            urgent: { keys: number };
        };
    }>({
        isLoading: false,
        keys: 0,
        bytes: 0,
        counts: {
            lawsuits: { items: 0, undated: 0 },
            execution: { items: 0, undated: 0 },
            notes: { items: 0, undated: 0 },
            vault: { items: 0, undated: 0 },
            urgent: { keys: 0 },
        },
    });
    const [pendingBusinessImport, setPendingBusinessImport] = useState<null | {
        fileName: string;
        version: 1 | 2;
        createdAt: string | null;
        selection: Record<string, unknown> | null;
        range: Record<string, unknown> | null;
        counts: Record<string, unknown> | null;
        keys: string[];
        entries: Array<[string, string]>;
    }>(null);

    const patchAppearance = (partial: Partial<AppSettingsState['appearance']>) => {
        setSettings((prev) => ({ ...prev, appearance: { ...prev.appearance, ...partial } }));
    };

    const patchNotifications = (partial: Partial<AppSettingsState['notifications']>) => {
        setSettings((prev) => ({ ...prev, notifications: { ...prev.notifications, ...partial } }));
    };

    const patchSecurity = (partial: Partial<AppSettingsState['security']>) => {
        setSettings((prev) => ({ ...prev, security: { ...prev.security, ...partial } }));
    };

    const patchWorkflow = (partial: Partial<AppSettingsState['workflow']>) => {
        setSettings((prev) => ({ ...prev, workflow: { ...prev.workflow, ...partial } }));
    };

    const patchData = (partial: Partial<AppSettingsState['data']>) => {
        setSettings((prev) => ({ ...prev, data: { ...prev.data, ...partial } }));
    };

    const patchPerformance = (partial: Partial<AppSettingsState['performance']>) => {
        setSettings((prev) => ({ ...prev, performance: { ...prev.performance, ...partial } }));
    };

    const filteredNav = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return SETTINGS_NAV;
        return SETTINGS_NAV.filter(
            (n) =>
                n.label.includes(q) ||
                n.labelEn.toLowerCase().includes(q) ||
                n.keywords.some((k) => k.includes(q)),
        );
    }, [searchQuery]);

    const exportSettings = () => {
        const text = JSON.stringify(settings, null, 2);
        try {
            const blob = new Blob([text], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `hami-settings-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            SmartToast.success('تم تصدير الإعدادات');
            return;
        } catch {
        }

        if (navigator.clipboard?.writeText) {
            void navigator.clipboard
                .writeText(text)
                .then(() => SmartToast.success('تم نسخ الإعدادات إلى الحافظة'))
                .catch(() => SmartToast.warning('تعذر تصدير الإعدادات على هذا الجهاز'));
            return;
        }
        SmartToast.warning('تعذر تصدير الإعدادات على هذا الجهاز');
    };

    const parseRange = () => {
        const from = backupFrom ? new Date(`${backupFrom}T00:00:00`) : null;
        const to = backupTo ? new Date(`${backupTo}T23:59:59`) : null;
        return { from: from && !Number.isNaN(from.getTime()) ? from : null, to: to && !Number.isNaN(to.getTime()) ? to : null };
    };

    const extractDate = (v: unknown): Date | null => {
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
    };

    const filterByRange = (items: unknown[]) => {
        const { from, to } = parseRange();
        if (!from && !to) return { filtered: items, undated: 0 };
        let undated = 0;
        const filtered = items.filter((it) => {
            const d = extractDate(it);
            if (!d) {
                undated += 1;
                return backupIncludeUndated;
            }
            if (from && d < from) return false;
            if (to && d > to) return false;
            return true;
        });
        return { filtered, undated };
    };

    const readJson = async (key: string): Promise<unknown> => {
        try {
            const v = await SecureStoreService.getItem(key);
            if (typeof v !== 'string' || !v.trim()) return null;
            return JSON.parse(v) as unknown;
        } catch {
            return null;
        }
    };

    const toBase64 = (buf: ArrayBuffer) => {
        const bytes = new Uint8Array(buf);
        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
        }
        return btoa(binary);
    };

    const fromBase64 = (b64: string) => {
        const binary = atob(b64);
        const buf = new ArrayBuffer(binary.length);
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return buf;
    };

    const derivePasswordKey = async (password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) => {
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
    };

    const encryptBusinessBackupText = async (plainText: string, password: string) => {
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
    };

    const decryptBusinessBackupText = async (
        encrypted: {
            kind?: unknown;
            version?: unknown;
            kdf?: unknown;
            salt?: unknown;
            iv?: unknown;
            ciphertext?: unknown;
        },
        password: string,
    ) => {
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
    };

    const buildBackupPayload = async () => {
        const items: Record<string, string> = {};
        const counts = {
            lawsuits: { items: 0, undated: 0 },
            execution: { items: 0, undated: 0 },
            notes: { items: 0, undated: 0 },
            vault: { items: 0, undated: 0 },
            urgent: { keys: 0 },
        };

        const includeKeys: string[] = [];

        if (backupIncludeLawsuits) {
            includeKeys.push(STORAGE_KEYS.LAWYER_FILES);
        }
        if (backupIncludeExecution) {
            includeKeys.push('executionFiles');
        }
        if (backupIncludeNotes) {
            includeKeys.push(STORAGE_KEYS.LAWYER_NOTES, 'globalNotes', 'global_notes', 'hami_notes_vault');
        }
        if (backupIncludeVault) {
            includeKeys.push('hami_docs_vault');
        }

        const allKeys = await SecureStoreService.listKeys();
        if (backupIncludeNotes) {
            allKeys
                .filter((k) => k.startsWith('hami_notes_vault_'))
                .forEach((k) => includeKeys.push(k));
        }
        if (backupIncludeUrgent) {
            const urgentKeys = allKeys.filter((k) => k.startsWith('hami:urgentActions:v1:'));
            urgentKeys.forEach((k) => includeKeys.push(k));
            counts.urgent.keys = urgentKeys.length;
        }

        const uniqueKeys = Array.from(new Set(includeKeys));

        for (const k of uniqueKeys) {
            const raw = await SecureStoreService.getItem(k);
            if (typeof raw === 'string') {
                items[k] = raw;
            }
        }

        const parseArrayCount = async (key: string) => {
            const v = await readJson(key);
            if (!Array.isArray(v)) return { items: 0, undated: 0, raw: null as unknown[] | null };
            const { filtered, undated } = filterByRange(v);
            return { items: filtered.length, undated, raw: filtered };
        };

        if (backupIncludeLawsuits && items[STORAGE_KEYS.LAWYER_FILES]) {
            const parsed = await parseArrayCount(STORAGE_KEYS.LAWYER_FILES);
            counts.lawsuits.items = parsed.items;
            counts.lawsuits.undated = parsed.undated;
            items[STORAGE_KEYS.LAWYER_FILES] = JSON.stringify(parsed.raw ?? []);
        }

        if (backupIncludeExecution && items.executionFiles) {
            const parsed = await parseArrayCount('executionFiles');
            counts.execution.items = parsed.items;
            counts.execution.undated = parsed.undated;
            items.executionFiles = JSON.stringify(parsed.raw ?? []);
        }

        if (backupIncludeNotes && items[STORAGE_KEYS.LAWYER_NOTES]) {
            const parsed = await parseArrayCount(STORAGE_KEYS.LAWYER_NOTES);
            counts.notes.items = parsed.items;
            counts.notes.undated = parsed.undated;
            items[STORAGE_KEYS.LAWYER_NOTES] = JSON.stringify(parsed.raw ?? []);
        }

        if (backupIncludeNotes && items.hami_notes_vault) {
            const parsed = await parseArrayCount('hami_notes_vault');
            counts.notes.items += parsed.items;
            counts.notes.undated += parsed.undated;
            items.hami_notes_vault = JSON.stringify(parsed.raw ?? []);
        }

        if (backupIncludeVault && items.hami_docs_vault) {
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
                lawsuits: backupIncludeLawsuits,
                execution: backupIncludeExecution,
                notes: backupIncludeNotes,
                vault: backupIncludeVault,
                urgent: backupIncludeUrgent,
            },
            range: {
                from: backupFrom || null,
                to: backupTo || null,
                includeUndated: backupIncludeUndated,
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
    };

    const refreshBackupPreview = async () => {
        setBackupPreview((p) => ({ ...p, isLoading: true }));
        try {
            const built = await buildBackupPayload();
            setBackupPreview({
                isLoading: false,
                keys: built.keys,
                bytes: built.bytes,
                counts: built.counts,
            });
            if (built.bytes > 30_000_000) {
                SmartToast.warning('حجم النسخة كبير جداً وقد يفشل التصدير على بعض الأجهزة');
            }
        } catch {
            setBackupPreview((p) => ({ ...p, isLoading: false }));
            SmartToast.warning('تعذر تجهيز معاينة النسخة');
        }
    };

    const toggleBackupPanel = () => {
        setBackupPanelOpen((prev) => {
            const next = !prev;
            if (next) void refreshBackupPreview();
            return next;
        });
    };

    const exportBusinessBackup = async () => {
        await refreshBackupPreview();
        try {
            const built = await buildBackupPayload();
            const plainText = JSON.stringify(built.payload, null, 2);
            const password = await SmartDialog.prompt(
                'كلمة مرور لحماية النسخة (اتركها فارغة للتصدير بدون حماية):',
                '',
            );
            const p = password?.trim() ?? '';
            if (p && p.length < 6) {
                SmartToast.warning('كلمة المرور قصيرة جداً');
                return;
            }
            const payload = p ? await encryptBusinessBackupText(plainText, p) : built.payload;
            const outText = JSON.stringify(payload, null, 2);
            const blob = new Blob([outText], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const date = new Date().toISOString().slice(0, 10);
            a.download = p ? `hami-business-backup-${date}.protected.json` : `hami-business-backup-${date}.json`;
            a.click();
            URL.revokeObjectURL(url);
            SmartToast.success('تم تصدير نسخة البيانات');
        } catch {
            SmartToast.warning('تعذر تصدير نسخة البيانات على هذا الجهاز');
        }
    };

    const importSettings = async (file: File | null | undefined) => {
        if (!file) return;
        if (file.size > 2_500_000) {
            SmartToast.warning('ملف الإعدادات كبير جداً');
            return;
        }
        try {
            const text = await file.text();
            const parsed = JSON.parse(text) as unknown;
            const migrated = migrateLawyerSettings(parsed);
            setSettings(migrated);
            setCurrentTheme(migrated.appearance.theme);
            setCurrentShape(migrated.appearance.shape);
            persistWallpaper(migrated.appearance.wallpaper);
            persistenceRepository.save('lawyer_settings', migrated);
            persistenceRepository.save('lawyer_theme', migrated.appearance.theme);
            persistenceRepository.save('lawyer_shape', migrated.appearance.shape);
            SmartToast.success('تم استيراد الإعدادات');
        } catch {
            SmartToast.warning('ملف الإعدادات غير صالح');
        } finally {
            if (importSettingsInputRef.current) importSettingsInputRef.current.value = '';
        }
    };

    const importBusinessBackup = async (entries: Array<[string, string]>) => {
        try {
            for (const [k, v] of entries) {
                if (typeof k !== 'string' || typeof v !== 'string') continue;
                await SecureStoreService.setItem(k, v);
            }
            window.dispatchEvent(new Event('hami:data-imported'));
            SmartToast.success('تم استيراد البيانات');
        } catch {
            SmartToast.warning('تعذر استيراد البيانات');
        }
    };

    const prepareBusinessImport = async (file: File | null | undefined) => {
        if (!file) return;
        if (file.size > 25_000_000) {
            SmartToast.warning('ملف النسخة كبير جداً');
            return;
        }
        try {
            const text = await file.text();
            let parsed = JSON.parse(text) as unknown;
            let obj = parsed as {
                kind?: unknown;
                version?: unknown;
                createdAt?: unknown;
                kdf?: unknown;
                salt?: unknown;
                iv?: unknown;
                ciphertext?: unknown;
                selection?: unknown;
                range?: unknown;
                counts?: unknown;
                items?: unknown;
            };
            if (obj?.kind === 'hami-business-backup-encrypted') {
                const password = await SmartDialog.prompt('أدخل كلمة المرور لفك حماية النسخة:', '');
                if (!password?.trim()) return;
                try {
                    const decryptedText = await decryptBusinessBackupText(obj, password.trim());
                    parsed = JSON.parse(decryptedText) as unknown;
                    obj = parsed as typeof obj;
                } catch {
                    SmartToast.warning('كلمة المرور غير صحيحة أو الملف تالف');
                    return;
                }
            }
            if (
                obj?.kind !== 'hami-business-backup' ||
                (obj?.version !== 1 && obj?.version !== 2) ||
                !obj.items ||
                typeof obj.items !== 'object'
            ) {
                SmartToast.warning('ملف النسخة غير صالح');
                return;
            }
            const entriesAll = Object.entries(obj.items as Record<string, unknown>);
            const entries = entriesAll.filter(
                (e): e is [string, string] => typeof e[0] === 'string' && typeof e[1] === 'string',
            );
            const keys = entries.map((e) => e[0]).sort((a, b) => a.localeCompare(b));
            const createdAt = typeof obj.createdAt === 'string' ? obj.createdAt : null;
            setPendingBusinessImport({
                fileName: file.name,
                version: obj.version as 1 | 2,
                createdAt,
                selection: obj.selection && typeof obj.selection === 'object' ? (obj.selection as Record<string, unknown>) : null,
                range: obj.range && typeof obj.range === 'object' ? (obj.range as Record<string, unknown>) : null,
                counts: obj.counts && typeof obj.counts === 'object' ? (obj.counts as Record<string, unknown>) : null,
                keys,
                entries,
            });
        } catch {
            SmartToast.warning('ملف النسخة غير صالح');
        } finally {
            if (importBusinessInputRef.current) importBusinessInputRef.current.value = '';
        }
    };

    const armClear = () => {
        setClearArmed(true);
        if (clearConfirmTimerRef.current) window.clearTimeout(clearConfirmTimerRef.current);
        clearConfirmTimerRef.current = window.setTimeout(() => setClearArmed(false), 6_000);
    };

    const clearLocalData = async () => {
        try {
            persistenceRepository.clear();
            clearStoredBiometricCredential();
            persistWallpaper(undefined);
            try {
                const prefixes = ['hami_', 'hami:', 'lawyer_', 'execution_', 'lawsuit_', 'client_', 'notes_', 'cache_'];
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const k = localStorage.key(i);
                    if (!k) continue;
                    if (k === 'lawyer_wallpaper' || prefixes.some((p) => k.startsWith(p))) {
                        localStorage.removeItem(k);
                    }
                }
            } catch {
            }
            resetToDefaults();
            window.dispatchEvent(new Event('hami:data-cleared'));
            SmartToast.success('تم مسح البيانات المحلية');
        } catch {
            SmartToast.warning('تعذر مسح البيانات المحلية');
        } finally {
            setClearArmed(false);
        }
    };

    const renderSection = () => {
        switch (activeSection) {
            case 'appearance':
                return (
                    <AppearanceSection
                        settings={settings}
                        currentTheme={currentTheme}
                        currentShape={currentShape}
                        setCurrentTheme={setCurrentTheme}
                        setCurrentShape={setCurrentShape}
                        patchAppearance={patchAppearance}
                    />
                );

            case 'notifications':
                return <NotificationsSection settings={settings} patchNotifications={patchNotifications} />;

            case 'security':
                return <SecuritySection settings={settings} patchSecurity={patchSecurity} />;

            case 'workflow':
                return <WorkflowSection settings={settings} patchWorkflow={patchWorkflow} />;

            case 'data':
                return (
                    <DataSection
                        settings={settings}
                        patchData={patchData}
                        exportSettings={exportSettings}
                        importSettingsInputRef={importSettingsInputRef}
                        importSettings={importSettings}
                        importBusinessInputRef={importBusinessInputRef}
                        prepareBusinessImport={prepareBusinessImport}
                        backupPanelOpen={backupPanelOpen}
                        toggleBackupPanel={toggleBackupPanel}
                        backupIncludeLawsuits={backupIncludeLawsuits}
                        setBackupIncludeLawsuits={setBackupIncludeLawsuits}
                        backupIncludeExecution={backupIncludeExecution}
                        setBackupIncludeExecution={setBackupIncludeExecution}
                        backupIncludeNotes={backupIncludeNotes}
                        setBackupIncludeNotes={setBackupIncludeNotes}
                        backupIncludeVault={backupIncludeVault}
                        setBackupIncludeVault={setBackupIncludeVault}
                        backupIncludeUrgent={backupIncludeUrgent}
                        setBackupIncludeUrgent={setBackupIncludeUrgent}
                        backupIncludeUndated={backupIncludeUndated}
                        setBackupIncludeUndated={setBackupIncludeUndated}
                        backupFrom={backupFrom}
                        setBackupFrom={setBackupFrom}
                        backupTo={backupTo}
                        setBackupTo={setBackupTo}
                        backupPreview={backupPreview}
                        refreshBackupPreview={refreshBackupPreview}
                        exportBusinessBackup={exportBusinessBackup}
                        pendingBusinessImport={pendingBusinessImport}
                        setPendingBusinessImport={setPendingBusinessImport}
                        importBusinessBackup={importBusinessBackup}
                        onOpenArchive={onOpenArchive}
                        onClose={onClose}
                        clearArmed={clearArmed}
                        armClear={armClear}
                        clearLocalData={clearLocalData}
                    />
                );

            case 'account':
                return (
                    <AccountSection
                        onClose={onClose}
                        onLogout={onLogout}
                        onOpenProfile={onOpenProfile}
                        onOpenPrivacy={onOpenPrivacy}
                        onOpenSupport={onOpenSupport}
                    />
                );

            case 'advanced':
                return <AdvancedSection settings={settings} patchPerformance={patchPerformance} resetToDefaults={resetToDefaults} />;

            default:
                return null;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-[#0B1021] flex flex-col overflow-hidden font-sans"
            dir="rtl"
        >
            <div className="shrink-0 px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-4 bg-[#0B1021]/95 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Sparkles className="text-[#E6C673]" size={22} />
                            مركز الإعدادات
                        </h1>
                        <p className="text-xs text-white/50">تخصيص التطبيق والمكتب</p>
                    </div>
                    <button type="button" onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10" aria-label="إغلاق">
                        <X size={20} />
                    </button>
                </div>
                <div className="relative group mb-4">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ابحث في الإعدادات..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-12 pl-4 text-white placeholder-white/30 focus:border-[#E6C673] outline-none text-sm"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {filteredNav.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setActiveSection(item.id)}
                            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold border ${
                                activeSection === item.id
                                    ? 'bg-[#E6C673] text-[#0B1021] border-[#E6C673]'
                                    : 'bg-white/5 text-white/60 border-white/10'
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-[max(5rem,env(safe-area-inset-bottom))] scrollbar-hide">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeSection}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                    >
                        {renderSection()}
                    </motion.div>
                </AnimatePresence>
                <p className="text-center text-[10px] text-white/20 mt-10 mb-4 font-mono">Hami Legal • v2</p>
            </div>        </motion.div>
    );
};
