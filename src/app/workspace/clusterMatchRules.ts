import { normalizeArabic } from '@/app/components/lawyer/LawyerShared';
import { effectiveCaseNumber, extractCaseRefsFromText, normalizeCaseKey } from './extractCaseRefs';
import { isClusterPinEligibleType } from './types';
import type { WorkspacePinType } from './types';
import type { ClusterScanRecord } from './types';
import type { ClusterRelatedLink } from './types';

const MIN_CLIENT_LEN = 4;
const MIN_CASE_LEN = 5;

function norm(value: string): string {
    return normalizeArabic(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

function clientNamesMatch(needle: string, recordClient: string, recordTitle: string): boolean {
    const n = norm(needle);
    if (n.length < MIN_CLIENT_LEN) return false;
    if (/\bمحامي\b/.test(n) && n.length < 14) return false;
    const hay = norm(`${recordClient} ${recordTitle}`);
    if (hay === n) return true;
    const idx = hay.indexOf(n);
    if (idx === -1) return false;
    const charBefore = idx > 0 ? hay[idx - 1] : ' ';
    const charAfter = idx + n.length < hay.length ? hay[idx + n.length] : ' ';
    return charBefore === ' ' && charAfter === ' ';
}

function collectCaseKeys(caseNumber: string, ...textParts: string[]): Set<string> {
    const keys = new Set<string>();
    const effective = effectiveCaseNumber(caseNumber, ...textParts);
    if (effective) {
        const k = normalizeCaseKey(effective);
        if (k.length >= MIN_CASE_LEN) keys.add(k);
    }
    for (const part of [caseNumber, ...textParts]) {
        for (const ref of extractCaseRefsFromText(part)) {
            const k = normalizeCaseKey(ref);
            if (k.length >= MIN_CASE_LEN) keys.add(k);
        }
        const direct = normalizeCaseKey(part);
        if (direct.length >= MIN_CASE_LEN) keys.add(direct);
    }
    return keys;
}

function caseKeysOverlap(pinKeys: Set<string>, recordCase: string, recordTitle: string): boolean {
    if (pinKeys.size === 0) return false;
    const recordKeys = collectCaseKeys(recordCase, recordTitle);
    for (const pk of pinKeys) {
        if (recordKeys.has(pk)) return true;
    }
    return false;
}

export type ClusterMatchReason = 'clientName' | 'caseNumber' | 'both';

/**
 * النسخة الأصلية للأماكن خارج الـ batched loop (تحسب pinKeys داخلياً).
 * داخل findCrossSectionLinks نستخدم النسخة المُحسَّنة clusterMatchReasonWithKeys
 * التي تتجنّب إعادة حساب pinKeys لكل record.
 */
export function clusterMatchReason(
    clientName: string,
    caseNumber: string,
    recordClient: string,
    recordCase: string,
    recordTitle: string,
    pinTitle = '',
): ClusterMatchReason | null {
    const pinKeys = collectCaseKeys(caseNumber, pinTitle);
    return clusterMatchReasonWithKeys(clientName, pinKeys, recordClient, recordCase, recordTitle);
}

/** نسخة دون حساب pinKeys (يُحسب مرّة واحدة لكل pin خارج الـ loop). */
export function clusterMatchReasonWithKeys(
    clientName: string,
    pinKeys: Set<string>,
    recordClient: string,
    recordCase: string,
    recordTitle: string,
): ClusterMatchReason | null {
    const clientHit = clientName ? clientNamesMatch(clientName, recordClient, recordTitle) : false;
    const caseHit = caseKeysOverlap(pinKeys, recordCase, recordTitle);

    if (clientHit && caseHit) return 'both';
    if (clientHit) return 'clientName';
    if (caseHit) return 'caseNumber';
    return null;
}

export function isCrossSectionLink(pinType: WorkspacePinType, recordType: WorkspacePinType): boolean {
    return pinType !== recordType;
}

export function dedupeClusterLinks(links: ClusterRelatedLink[], max = 6): ClusterRelatedLink[] {
    const byType = new Map<WorkspacePinType, ClusterRelatedLink>();
    for (const link of links) {
        const prev = byType.get(link.type);
        if (!prev) {
            byType.set(link.type, link);
            continue;
        }
        const score = (r: ClusterRelatedLink) =>
            r.matchReason === 'both' ? 3 : r.matchReason === 'caseNumber' ? 2 : 1;
        if (score(link) > score(prev)) byType.set(link.type, link);
    }
    return Array.from(byType.values()).slice(0, max);
}

export function isClusterLinkingEligibleType(type: WorkspacePinType): boolean {
    return isClusterPinEligibleType(type);
}

export function findCrossSectionLinks(
    pin: { type: WorkspacePinType; id: string; clientName: string; caseNumber: string; title?: string },
    index: ClusterScanRecord[],
): ClusterRelatedLink[] {
    const raw: ClusterRelatedLink[] = [];
    const seen = new Set<string>();

    const pinClient = pin.clientName;
    // pinKeys ثابتة طوال الـ loop — نحسبها مرة واحدة فقط
    // (قبلَ الإصلاح: كانت تُعاد لكل record → O(P × N × textCost))
    const pinKeys = collectCaseKeys(pin.caseNumber, pin.title ?? '');

    for (const record of index) {
        if (record.id === pin.id && record.type === pin.type) continue;
        if (!isCrossSectionLink(pin.type, record.type)) continue;
        const key = `${record.type}:${record.id}`;
        if (seen.has(key)) continue;

        const reason = clusterMatchReasonWithKeys(
            pinClient,
            pinKeys,
            record.clientName,
            record.caseNumber,
            record.title,
        );
        if (!reason) continue;
        seen.add(key);
        raw.push({ ...record, matchReason: reason });
    }

    raw.sort((a, b) => {
        const score = (r: ClusterRelatedLink) =>
            r.matchReason === 'both' ? 3 : r.matchReason === 'caseNumber' ? 2 : 1;
        return score(b) - score(a);
    });

    return dedupeClusterLinks(raw, 6);
}
