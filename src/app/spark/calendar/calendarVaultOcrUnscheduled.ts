import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { CalendarSourceModule } from '@/app/services/calendarBridge.types';
import { normalizeDateToYmd } from '@/app/services/calendar/bridge/core';
import { extractDateHintsFromVaultText } from '@/app/spark/engine/vaultAttachmentSparkScan';
import type { CalendarSparkSupplementalInput } from '@/app/spark/calendar/calendarSparkSupplementalScan';

export type VaultOcrUnscheduledCandidate = {
    module: CalendarSourceModule;
    entityId: string;
    moduleLabel: string;
    title: string;
    dateYmd: string;
    pathLabel: string;
    bridgeEventId: string;
};

function readEntityId(file: unknown): string {
    if (!file || typeof file !== 'object') return '';
    const id = (file as { id?: unknown }).id;
    return String(id ?? '').trim();
}

function resolveVaultDocDossierBinding(
    entityId: string,
    input: CalendarSparkSupplementalInput,
): { module: CalendarSourceModule; moduleLabel: string } | null {
    if (input.executionFiles?.some((file) => readEntityId(file) === entityId)) {
        return { module: 'execution', moduleLabel: 'تنفيذ' };
    }
    if (input.lawsuitFiles?.some((file) => readEntityId(file) === entityId)) {
        return { module: 'lawsuit', moduleLabel: 'دعوى' };
    }
    if (input.criminalCases?.some((file) => readEntityId(file) === entityId)) {
        return { module: 'criminal', moduleLabel: 'جزائي' };
    }
    if (input.urgentCases?.some((file) => readEntityId(file) === entityId)) {
        return { module: 'urgent', moduleLabel: 'مستعجل' };
    }
    if (input.threadingTransactions?.some((file) => readEntityId(file) === entityId)) {
        return { module: 'transaction', moduleLabel: 'معاملة' };
    }
    return null;
}

/** تواريخ مستخرجة من OCR خزنة مربوطة بإضبارة — مرشّحة لجدولة التقويم */
export function collectVaultOcrUnscheduledCandidates(
    input: CalendarSparkSupplementalInput,
    todayYmd: string,
    horizonDays: number,
): VaultOcrUnscheduledCandidate[] {
    const out: VaultOcrUnscheduledCandidate[] = [];
    const seen = new Set<string>();

    for (const doc of input.vaultDocs ?? []) {
        const entityId = String(doc.boundDossierId ?? '').trim();
        if (!entityId) continue;

        const binding = resolveVaultDocDossierBinding(entityId, input);
        if (!binding) continue;

        const text = String(doc.extractedText ?? doc.aiSummary ?? '').trim();
        if (text.length < 12) continue;

        const title = String(doc.title || doc.fileName || 'مرفق').trim() || 'مرفق';
        for (const hint of extractDateHintsFromVaultText(text)) {
            const dateYmd = normalizeDateToYmd(hint);
            if (!dateYmd || dateYmd < todayYmd) continue;

            const from = Date.parse(`${todayYmd}T12:00:00`);
            const to = Date.parse(`${dateYmd}T12:00:00`);
            const daysUntil = Math.ceil((to - from) / (24 * 60 * 60 * 1000));
            if (!Number.isFinite(daysUntil) || daysUntil > horizonDays) continue;

            const dedupeKey = `${binding.module}:${entityId}:${dateYmd}`;
            if (seen.has(dedupeKey)) continue;
            seen.add(dedupeKey);

            out.push({
                module: binding.module,
                entityId,
                moduleLabel: binding.moduleLabel,
                title,
                dateYmd,
                pathLabel: 'OCR خزنة',
                bridgeEventId: `field_vault_ocr:${doc.id}:${dateYmd}`,
            });
        }
    }

    return out;
}

export function isVaultOcrCandidate(doc: SmartVaultDoc): boolean {
    return Boolean(String(doc.boundDossierId ?? '').trim());
}
