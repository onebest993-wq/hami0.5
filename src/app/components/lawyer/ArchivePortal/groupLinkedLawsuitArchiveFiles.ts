/**
 * تجميع إضابير المخزن المترابطة (طعن مستقل / caseLinks)
 * داخل القائمة المعروضة فقط — دون إنشاء علاقات وهمية.
 */
export type LinkedArchiveGroupUnit<T extends { id?: unknown }> =
    | { kind: 'single'; id: string; file: T }
    | { kind: 'cluster'; id: string; files: T[] };

function fileIdKey(id: unknown): string {
    return String(id ?? '').trim();
}

function idsMatch(a: unknown, b: unknown): boolean {
    const left = fileIdKey(a);
    const right = fileIdKey(b);
    if (!left || !right) return false;
    if (left === right) return true;
    const nLeft = Number(left);
    const nRight = Number(right);
    return Number.isFinite(nLeft) && Number.isFinite(nRight) && nLeft === nRight;
}

function readPeerIds(file: Record<string, unknown>): string[] {
    const out: string[] = [];
    const link = file.independentChallengeLink;
    if (link && typeof link === 'object' && !Array.isArray(link)) {
        const sourceId = fileIdKey((link as { sourceFileId?: unknown }).sourceFileId);
        if (sourceId) out.push(sourceId);
    }
    const caseLinks = file.caseLinks;
    if (Array.isArray(caseLinks)) {
        for (const row of caseLinks) {
            if (!row || typeof row !== 'object') continue;
            const peer = fileIdKey((row as { peerFileId?: unknown }).peerFileId);
            if (peer) out.push(peer);
            const origin = fileIdKey((row as { originFileId?: unknown }).originFileId);
            if (origin) out.push(origin);
        }
    }
    return out;
}

/**
 * وحدات عرض: مفرد أو عنقود مترابط (≥2).
 * يحافظ على ترتيب الظهور الأول لكل مكوّن متصل.
 */
export function groupLinkedLawsuitArchiveFiles<T extends { id?: unknown }>(
    files: T[],
): LinkedArchiveGroupUnit<T>[] {
    if (!Array.isArray(files) || files.length === 0) return [];

    const byId = new Map<string, T>();
    const order: string[] = [];
    for (const file of files) {
        const id = fileIdKey(file.id);
        if (!id || byId.has(id)) continue;
        byId.set(id, file);
        order.push(id);
    }

    const adj = new Map<string, Set<string>>();
    const ensure = (id: string) => {
        if (!adj.has(id)) adj.set(id, new Set());
    };
    for (const id of order) ensure(id);

    for (const id of order) {
        const file = byId.get(id)!;
        const peers = readPeerIds(file as unknown as Record<string, unknown>);
        for (const peerRaw of peers) {
            const peer = order.find((candidate) => idsMatch(candidate, peerRaw));
            if (!peer || peer === id) continue;
            ensure(peer);
            adj.get(id)!.add(peer);
            adj.get(peer)!.add(id);
        }
    }

    const seen = new Set<string>();
    const units: LinkedArchiveGroupUnit<T>[] = [];

    for (const start of order) {
        if (seen.has(start)) continue;
        const stack = [start];
        const component: string[] = [];
        seen.add(start);
        while (stack.length > 0) {
            const cur = stack.pop()!;
            component.push(cur);
            for (const next of adj.get(cur) ?? []) {
                if (seen.has(next)) continue;
                seen.add(next);
                stack.push(next);
            }
        }
        component.sort((a, b) => order.indexOf(a) - order.indexOf(b));
        if (component.length === 1) {
            units.push({ kind: 'single', id: component[0]!, file: byId.get(component[0]!)! });
            continue;
        }
        units.push({
            kind: 'cluster',
            id: `linked:${component.join('+')}`,
            files: component.map((id) => byId.get(id)!),
        });
    }

    return units;
}

/** عدد أعمدة داخل الحاوية حسب عدد الإضابير */
export function resolveLinkedClusterInnerColumns(memberCount: number, hostColumns: number): number {
    const n = Math.max(1, memberCount);
    const host = Math.max(1, hostColumns);
    if (n <= 1) return 1;
    if (n === 2) return Math.min(2, host);
    return Math.min(n, host, 3);
}

export type LinkedDossierClusterRole = 'base' | 'independent' | 'linked';

function readIndependentSourceId(file: Record<string, unknown>): string {
    const link = file.independentChallengeLink;
    if (!link || typeof link !== 'object' || Array.isArray(link)) return '';
    return fileIdKey((link as { sourceFileId?: unknown }).sourceFileId);
}

/**
 * دور الإضبارة داخل عنقود مترابط:
 * - base: الإضبارة الأساس التي يُشير إليها طعن مستقل
 * - independent: إضبارة الطعن المنشقّة
 * - linked: ترابط عام (caseLinks) بلا دور أساس/منشق واضح
 */
export function resolveLinkedDossierClusterRole<T extends { id?: unknown }>(
    file: T,
    clusterFiles: T[],
): LinkedDossierClusterRole {
    const raw = file as unknown as Record<string, unknown>;
    const selfId = fileIdKey(file.id);
    if (!selfId) return 'linked';

    if (readIndependentSourceId(raw)) return 'independent';

    const isBase = clusterFiles.some((peer) => {
        if (idsMatch(peer.id, selfId)) return false;
        const sourceId = readIndependentSourceId(peer as unknown as Record<string, unknown>);
        return Boolean(sourceId) && idsMatch(sourceId, selfId);
    });
    if (isBase) return 'base';
    return 'linked';
}

export function linkedDossierClusterRoleLabel(role: LinkedDossierClusterRole): string {
    if (role === 'base') return 'الأساس';
    if (role === 'independent') return 'طعن مستقل';
    return 'مترابطة';
}
