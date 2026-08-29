import {
    isCreditorOtherPartyOptionAccessible,
} from './creditorOtherPartyMirrorVisibility';
import type {
    CatalogEntry,
    OtherPartyCatalogInput,
    OtherPartyExecutorTabBadge,
    OtherPartyRequestBadge,
    OtherPartyRequestOutcome,
} from './otherPartyEffectiveRequestsTypes';
import { hintForEntry, resolveExecutorOutcomeShort } from './otherPartyEffectiveRequestsResolve';
import {
    buildBreakInventoryCatalog,
    buildCreditorPersonalCoerciveCatalog,
    buildEncroachmentCatalog,
    buildEvictionCatalog,
    buildGuarantorCatalog,
    buildSeizureCatalog,
    buildSpecificDeliveryCatalog,
} from './otherPartyEffectiveRequestsCatalogBuilders';

export function buildOtherPartyRequestCatalog(input: OtherPartyCatalogInput): CatalogEntry[] {
    const opts = {
        activeDebtorKey: input.activeDebtorKey,
        primaryDebtorKey: input.primaryDebtorKey,
    };
    const seen = new Set<string>();
    const merged: CatalogEntry[] = [];

    const pushUnique = (entries: CatalogEntry[]) => {
        for (const entry of entries) {
            if (seen.has(entry.id)) continue;
            seen.add(entry.id);
            merged.push(entry);
        }
    };

    pushUnique(buildCreditorPersonalCoerciveCatalog(input.flags, opts));
    pushUnique(buildSeizureCatalog(input));
    pushUnique(buildGuarantorCatalog(input.flags, input.guarantorCtx));
    pushUnique(buildBreakInventoryCatalog(input.flags));
    pushUnique(buildEvictionCatalog(input.claimType, input.flags));
    pushUnique(buildEncroachmentCatalog(input.flags));
    pushUnique(buildSpecificDeliveryCatalog(input.flags));

    return merged;
}

const EMPLOYEE_EXCLUDED_OPTION_IDS = new Set([
    'pc-arrest_warrant_investigation',
    'pc-executive_dossier_presentation',
    'pc-executive_detention_judge',
]);

/** وكيل المدين — قائمة كاملة كما يراها الدائن + إكمال النواقص (موظف → كفيل، إحضار، …) */
function buildDebtorAgentManualTrackCatalog(input: OtherPartyCatalogInput): CatalogEntry[] {
    const noopResolve = () => null;
    const base = buildOtherPartyRequestCatalog(input);
    const byId = new Map(base.map((e) => [e.id, e]));
    const employee = Boolean(
        input.guarantorCtx.activeDebtorIsEmployee ?? input.flags.activeDebtorIsEmployee
    );
    const deceased = Boolean(
        input.activeDebtorIsDeceased ?? input.guarantorCtx.activeDebtorIsDeceased
    );

    const ensure = (entry: CatalogEntry) => {
        if (!byId.has(entry.id)) byId.set(entry.id, entry);
    };

    if (!deceased && !input.flags.hideAllGuarantorPresence) {
        ensure({
            id: 'gu-request',
            label: 'طلب الكفيل',
            shortLabel: 'طلب الكفيل',
            hintAr: hintForEntry('gu-request', 'طلب الكفيل'),
            resolve: noopResolve,
        });
    }

    if (employee && !input.flags.suppressHiddenPersonalCoerciveRequests) {
        ensure({
            id: 'pc-forced_bring_in',
            label: 'إحضار جبري',
            shortLabel: 'إحضار جبري',
            hintAr: hintForEntry('pc-forced_bring_in', 'إحضار جبري'),
            resolve: noopResolve,
        });
        ensure({
            id: 'pc-travel_ban',
            label: 'منع سفر',
            shortLabel: 'منع سفر',
            hintAr: hintForEntry('pc-travel_ban', 'منع سفر'),
            resolve: noopResolve,
        });
        ensure({
            id: 'sz-debtor-salary',
            label: 'طلب حجز راتب',
            shortLabel: 'حجز راتب',
            hintAr: hintForEntry('sz-debtor-salary', 'طلب حجز راتب'),
            resolve: noopResolve,
        });
    }

    let entries = [...byId.values()];
    if (employee) {
        entries = entries.filter((e) => !EMPLOYEE_EXCLUDED_OPTION_IDS.has(e.id));
    }
    return entries;
}

const OUTCOME_SORT: Record<OtherPartyRequestOutcome, number> = {
    effective: 0,
    pending: 1,
    alternative: 2,
    rejected: 3,
    available: 4,
    none: 5,
};

export function resolveOtherPartyRequestOptionBadges(
    input: OtherPartyCatalogInput & { decisions: Record<string, unknown>[] },
): OtherPartyRequestBadge[] {
    const manualTrack = Boolean(input.debtorAgentManualTrack);
    const catalog = manualTrack
        ? buildDebtorAgentManualTrackCatalog(input)
        : buildOtherPartyRequestCatalog(input);
    const badges: OtherPartyRequestBadge[] = [];
    const mirror = input.mirrorWorkflow;

    for (const entry of catalog) {
        const row = manualTrack ? null : entry.resolve(input.decisions);
        const { outcome, statusShort, hasRequest } = manualTrack
            ? { outcome: 'available' as const, statusShort: 'متاح', hasRequest: false }
            : resolveExecutorOutcomeShort(row);

        if (mirror && !manualTrack) {
            const accessible = isCreditorOtherPartyOptionAccessible({
                entryId: entry.id,
                hasRequest,
                mirrorWorkflow: mirror,
                flags: input.flags,
                guarantorCtx: input.guarantorCtx,
            });
            if (!accessible) continue;
        }

        badges.push({
            id: entry.id,
            label: entry.label,
            shortLabel: entry.shortLabel,
            hintAr: entry.hintAr,
            outcome: hasRequest ? outcome : 'available',
            statusShort: hasRequest ? statusShort : 'متاح',
            decisionId: row ? String((row as { id?: string }).id || '').trim() || null : null,
            hasRequest,
        });
    }

    return badges.sort((a, b) => {
        const o = OUTCOME_SORT[a.outcome] - OUTCOME_SORT[b.outcome];
        if (o !== 0) return o;
        return a.shortLabel.localeCompare(b.shortLabel, 'ar');
    });
}

/** شارة اختصار على تبويب «تحركات الطرف الآخر» — موافقة المنفذ أو غيرها */
export function resolveOtherPartyExecutorTabBadge(
    badges: OtherPartyRequestBadge[],
): OtherPartyExecutorTabBadge | null {
    const submitted = badges.filter((b) => b.hasRequest);
    if (submitted.length === 0) return null;

    if (submitted.some((b) => b.outcome === 'pending')) {
        return { label: 'قيد البت', tone: 'amber' };
    }
    if (submitted.some((b) => b.outcome === 'rejected')) {
        return { label: 'مرفوض', tone: 'rose' };
    }
    if (submitted.some((b) => b.outcome === 'alternative')) {
        return { label: 'بديل', tone: 'violet' };
    }
    if (submitted.every((b) => b.outcome === 'effective')) {
        return { label: 'موافق', tone: 'emerald' };
    }
    return { label: 'مختلط', tone: 'slate' };
}

export function resolveOtherPartyEffectiveRequestBadges(
    input: OtherPartyCatalogInput & {
        decisions: Record<string, unknown>[];
        effectiveOnly?: boolean;
    },
): OtherPartyRequestBadge[] {
    const all = resolveOtherPartyRequestOptionBadges(input);
    if (!input.effectiveOnly) return all.filter((b) => b.hasRequest);
    return all.filter((b) => b.outcome === 'effective');
}
