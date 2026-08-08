import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type {
    SparkCoherenceContextBundle,
    SparkCoherenceFinding,
} from '@/app/spark/coherence/types';
import {
    extractDateHintsFromVaultText,
    vaultDocNeedsTextExtraction,
} from '@/app/spark/engine/vaultAttachmentSparkScan';
import { findUnregisteredVaultDateHints } from '@/app/spark/engine/repositoryBoundDossierSparkScan';

function normalizeDateToken(raw: string): string {
    return raw.replace(/\s+/g, ' ').trim().toLowerCase();
}

function buildRegisteredSet(bundle: SparkCoherenceContextBundle): Set<string> {
    const registered = new Set<string>();
    for (const ymd of bundle.registeredDates ?? []) {
        const v = String(ymd ?? '').trim();
        if (v) registered.add(normalizeDateToken(v));
    }
    for (const d of bundle.dates) {
        registered.add(normalizeDateToken(d.ymd));
    }
    return registered;
}

/** يدمج نصوص/تواريخ المرفقات المستخرجة في حزمة التماسك */
export function applyVaultDocsToCoherenceBundle(
    bundle: SparkCoherenceContextBundle,
    docs: SmartVaultDoc[],
): SparkCoherenceContextBundle {
    if (!docs.length) return bundle;

    const texts = [...bundle.texts];
    const dates = [...bundle.dates];

    for (const doc of docs) {
        const text = String(doc.extractedText ?? doc.aiSummary ?? '').trim();
        if (text.length >= 24) {
            texts.push({
                id: `vault:${doc.id}`,
                role: doc.title || doc.fileName || 'مرفق خزنة',
                content: text.slice(0, 4000),
                source: 'vault_extract',
            });
            for (const hint of extractDateHintsFromVaultText(text)) {
                const m = hint.match(/^(\d{4}-\d{2}-\d{2})/);
                if (!m) continue;
                dates.push({
                    id: `vault-date:${doc.id}:${m[1]}`,
                    label: 'تاريخ في مرفق',
                    ymd: m[1],
                    role: 'other',
                    source: `vault:${doc.id}`,
                });
            }
        }
    }

    return {
        ...bundle,
        texts,
        dates,
        registeredDates: bundle.dates.map((d) => d.ymd).concat(dates.map((d) => d.ymd)),
    };
}

/** قواعد تماسك خاصة بمرفقات OCR المربوطة بالإضبارة */
export function runVaultCoherenceFindings(
    docs: SmartVaultDoc[],
    bundle: SparkCoherenceContextBundle,
    options?: { dossierLabel?: string },
): SparkCoherenceFinding[] {
    const dossierLabel = options?.dossierLabel ?? 'إضبارة التنفيذ';
    const findings: SparkCoherenceFinding[] = [];
    if (!docs.length) return findings;

    const registered = buildRegisteredSet(bundle);

    const pending = docs.filter((d) => vaultDocNeedsTextExtraction(d));
    if (pending.length > 0) {
        const label =
            pending.length === 1
                ? `«${pending[0]!.title || pending[0]!.fileName || 'مرفق'}»`
                : `${pending.length} مرفقات`;
        findings.push({
            id: 'vault:pending-extraction',
            category: 'text',
            severity: 'warning',
            observation: `${label} مربوطة بالإضبارة بلا نص مستخرج — فعّل استخراج الخزنة لمقارنة المحتوى مع السجل.`,
            evidence: pending.slice(0, 3).map((d) => d.title || d.fileName || d.id),
            actionId: 'open_vault_doc',
            actionLabel: 'مراجعة المرفقات',
            targetFileId: pending[0]?.id,
        });
    }

    for (const doc of docs) {
        const text = String(doc.extractedText ?? doc.aiSummary ?? '').trim();
        if (text.length < 12) continue;

        const hints = extractDateHintsFromVaultText(text);
        const missing = findUnregisteredVaultDateHints(hints, registered);
        if (missing.length === 0) continue;

        const title = doc.title || doc.fileName || 'مرفق';
        findings.push({
            id: `vault:unregistered-dates:${doc.id}`,
            category: 'text',
            severity: 'warning',
            observation: `المرفق «${title}» يذكر تواريخ (${missing.slice(0, 2).join(' · ')}) غير مسجّلة في ${dossierLabel}.`,
            evidence: missing.slice(0, 3),
            actionId: 'open_vault_doc',
            actionLabel: 'مراجعة المرفق',
            targetFileId: doc.id,
        });

        for (const hint of missing) {
            registered.add(normalizeDateToken(hint));
        }
    }

    return findings;
}
