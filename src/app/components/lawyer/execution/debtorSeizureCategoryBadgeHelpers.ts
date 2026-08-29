import React from 'react';
import SecureStoreService from '@/app/services/SecureStoreService';
import type { LucideProps } from '@/app/components/ui/lucideIcons';
import type {
    RealEstateSeizureAsset,
    SeizedAsset,
    StandaloneExecutionMark,
    ThirdPartySeizure,
    ThirdPartySeizureAsset,
} from '@/app/types/execution';
import {
    getExecutorDecisionRowById,
    isExecutorRowEffectivelyApproved,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    isSeizureAssetEnforceableForBadge,
    isSeizureDecisionRowFullyRegistered,
} from '@/app/components/lawyer/ExecutionDashboard/helpers/seizureUtils';

export type CategoryKey = 'realEstate' | 'movable' | 'thirdParty' | 'marks';

export type Category = {
    key: CategoryKey;
    label: string;
    borderClass: string;
    bgClass: string;
    textClass: string;
    Icon: React.ComponentType<LucideProps>;
    items: string[];
};

export function normalizeLine(v: unknown): string {
    return String(v ?? '').trim();
}

export function buildRealEstateLabel(a: RealEstateSeizureAsset): string {
    const v = normalizeLine(a.propertyNoAndDistrict);
    return v || 'عقار';
}

export function buildMovableLabel(a: SeizedAsset): string {
    const det = (a.details || {}) as Record<string, unknown>;
    const movableType = normalizeLine(det.movableAssetType);
    const vehicleDesc = normalizeLine(det.vehicleDescription);
    const plate = normalizeLine(det.vehiclePlate);
    const fallback = normalizeLine(a.description);
    const base = movableType || vehicleDesc || fallback || 'منقول';
    return plate ? `${base} — ${plate}` : base;
}

export function buildThirdPartyLabel(a: ThirdPartySeizureAsset): string {
    const name = normalizeLine(a.thirdPartyName);
    const amt = typeof a.expectedAmountIqd === 'number' && a.expectedAmountIqd > 0 ? a.expectedAmountIqd : null;
    return amt ? `${name || 'لدى الغير'} — ${amt.toLocaleString('ar-IQ')} د.ع` : name || 'لدى الغير';
}

export function isActiveThirdPartySeizure(
    s: ThirdPartySeizure,
    decisionsExecutionId?: string,
): boolean {
    const status = String(s?.status || '').trim();
    const reply = String(s?.replyStatus || '').trim();
    if (status === 'funds_received') return false;
    if (status === 'replied' && reply === 'denied') return false;
    return isRegistryRowEnforceable(s.decisionRowId, decisionsExecutionId);
}

export function buildThirdPartySeizureUiLabel(s: ThirdPartySeizure): string {
    const name = normalizeLine(s.thirdPartyName) || 'لدى الغير';
    const amt =
        typeof s.requestedAmountIqd === 'number' &&
        Number.isFinite(s.requestedAmountIqd) &&
        s.requestedAmountIqd > 0
            ? Math.trunc(s.requestedAmountIqd)
            : null;
    return amt ? `${name} — ${amt.toLocaleString('ar-IQ')} د.ع` : name;
}

export function buildMarkLabel(a: StandaloneExecutionMark): string {
    const kind = normalizeLine(a.markType);
    const target = normalizeLine(a.targetEntity);
    return target ? `${kind} — ${target}` : kind || 'تعميم';
}

function isRegistryRowEnforceable(
    decisionRowId: string | undefined,
    decisionsExecutionId: string | undefined,
): boolean {
    const did = String(decisionRowId ?? '').trim();
    if (!did) return true;
    const exId = String(decisionsExecutionId ?? '').trim();
    if (!exId) return false;
    const row = getExecutorDecisionRowById(exId, did) as Record<string, unknown> | null;
    if (!row) return false;
    if (!isExecutorRowEffectivelyApproved(row)) return false;
    return isSeizureDecisionRowFullyRegistered(row);
}

export function isActiveSeizedAsset(a: SeizedAsset, decisionsExecutionId?: string): boolean {
    return isSeizureAssetEnforceableForBadge(a, decisionsExecutionId);
}

export function isActiveRealEstate(a: RealEstateSeizureAsset, decisionsExecutionId?: string): boolean {
    if (a.record_locked) return false;
    if (a.status !== 'seized') return false;
    if (
        String(a.propertyNumber ?? '').trim() === '—' &&
        /بانتظار/i.test(String(a.deedNotes ?? ''))
    ) {
        return false;
    }
    return isRegistryRowEnforceable(a.decisionRowId, decisionsExecutionId);
}

export function isActiveThirdParty(a: ThirdPartySeizureAsset, decisionsExecutionId?: string): boolean {
    if (a.record_locked) return false;
    if (a.status !== 'waiting' && a.status !== 'received') return false;
    if (/بانتظار\s*الإكمال/i.test(String(a.thirdPartyName ?? ''))) return false;
    return isRegistryRowEnforceable(a.decisionRowId, decisionsExecutionId);
}

export function isActiveStandaloneMark(a: StandaloneExecutionMark): boolean {
    if (a.record_locked) return false;
    if (a.status !== 'active') return false;
    return true;
}

function storageKeyHidden(executionId: string) {
    return `hami_debtor_seizure_cat_hidden_${executionId}`;
}

export function loadHidden(executionId: string): CategoryKey[] {
    try {
        const raw = SecureStoreService.getItemSync(storageKeyHidden(executionId));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed)
            ? parsed.filter((x): x is CategoryKey =>
                  x === 'realEstate' || x === 'movable' || x === 'thirdParty' || x === 'marks',
              )
            : [];
    } catch {
        return [];
    }
}

export function saveHidden(executionId: string, keys: CategoryKey[]) {
    try {
        SecureStoreService.setItemSync(storageKeyHidden(executionId), JSON.stringify(keys));
    } catch {
        /* ignore */
    }
}
