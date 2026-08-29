/** ترحيل pendingSeveranceContext أثناء persist migrate */
import type { CriminalDefendant, CrimeType } from './criminalCaseModel';
import { makeInitialDraft } from './criminalCaseDraftFactory';
import { resolveDefendantFullName } from './criminalUnknownDefendant';
import { normalizeLegacyCriminalStage } from './criminalStageUtils';

export function migratePendingSeveranceContext(s: Record<string, unknown>): void {
    const pendingRaw = s.pendingSeveranceContext;
    const pending =
        pendingRaw && typeof pendingRaw === 'object' ? (pendingRaw as Record<string, unknown>) : null;
    if (pending?.formDraft) {
        s.draft = makeInitialDraft();
    }
    if (!pending) return;

    const ctx = pending;
    const normDef = (d: unknown) => {
        if (!d || typeof d !== 'object') return d;
        const row = d as Record<string, unknown>;
        return {
            ...row,
            fullName: resolveDefendantFullName(row as CriminalDefendant),
        };
    };

    if (Array.isArray(ctx.defendantSnapshots)) {
        ctx.defendantSnapshots = ctx.defendantSnapshots.map((d: unknown) =>
            normDef(d),
        ) as CriminalDefendant[];
    }
    const formDraft = ctx.formDraft as Record<string, unknown> | undefined;
    if (formDraft && Array.isArray(formDraft.defendants)) {
        ctx.formDraft = {
            ...formDraft,
            defendants: formDraft.defendants.map((d: unknown) => normDef(d)) as CriminalDefendant[],
        };
    }
    if (!ctx.lockedCaseStage && formDraft?.basics) {
        const basics = formDraft.basics as Record<string, unknown>;
        ctx.lockedCaseStage =
            normalizeLegacyCriminalStage(String(basics.stage ?? ''), basics.crimeType as CrimeType | '' | undefined) || 'مرحلة التحقيق';
    }
    if (ctx.lockedCaseStage && formDraft?.basics) {
        const basics = formDraft.basics as Record<string, unknown>;
        ctx.formDraft = {
            ...formDraft,
            basics: {
                ...basics,
                stage: ctx.lockedCaseStage,
            },
        };
    }
}
