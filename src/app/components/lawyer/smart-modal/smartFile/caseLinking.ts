import type { CaseLinkRecord, CaseStage, FileData, TimelineEvent } from '../../LawyerShared';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { resolveLawsuitJurisdiction } from '@/app/domain/lawsuit/lawsuitJurisdiction';
import { findFileById, normalizeFileId } from './incidentalCaseLinking';
import type { ConsolidationCandidate } from './caseConsolidationLinking';
import { resolveActiveStageName } from './caseConsolidationLinking';
import { buildInitialStagesFromFile } from './stageInit';

export type CaseLinkMeta = {
    linkDate: string;
    reason?: string;
};

export type CaseLinkPeerNav = {
    /** الإضبارة الأصلية — تحرير كامل */
    origin: FileData;
    /** الدعوى المربوطة — للاطلاع فقط */
    peer: FileData;
};

/** مرشّح ربط — أي إضبارة (مدنية/أحوال/جزائية)، نشطة أو مؤرشفة، بأي مرحلة طعن. */
export type CaseLinkCandidate = ConsolidationCandidate & {
    key: string;
    dossierKind: 'lawsuit' | 'criminal';
    lawsuitFileId?: number;
    criminalId?: string;
    kindLabel?: string;
};

export type CaseLinkPeerSelection = {
    dossierKind: 'lawsuit' | 'criminal';
    lawsuitFileId?: number;
    criminalId?: string;
    caseNo: string;
};

function resolveStages(file: FileData): CaseStage[] {
    if (Array.isArray(file.stages) && file.stages.length > 0) return file.stages;
    return buildInitialStagesFromFile(file as unknown as Record<string, unknown>);
}

function resolveActiveStageIndex(file: FileData, stages: CaseStage[]): number {
    const idx = file.activeStageIndex;
    if (typeof idx === 'number' && idx >= 0 && idx < stages.length) return idx;
    return stages.length - 1;
}

function appendCaseLinks(file: FileData, records: CaseLinkRecord[]): FileData {
    const existing = Array.isArray(file.caseLinks) ? file.caseLinks : [];
    return { ...file, caseLinks: [...existing, ...records] };
}

function buildLinkTimelineEvent(peerCaseNo: string, meta: CaseLinkMeta, external: boolean): TimelineEvent {
    const detailLines = [
        external
            ? `تم ربط الدعوى المرقمة ${peerCaseNo} (مرجع خارج المخزن)`
            : `تم ربط الإضبارة رقم ${peerCaseNo} للاطلاع — دون تعديل ملف المخزن`,
        meta.reason ? `السبب: ${meta.reason}` : '',
    ].filter(Boolean);
    return {
        id: `case_link_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'milestone',
        date: meta.linkDate || getLocalTodayYmd(),
        title: external ? `🔗 ربط مرجعي — ${peerCaseNo}` : `🔗 ربط إضبارة — ${peerCaseNo}`,
        details: detailLines.join('\n'),
        isNew: true,
        tags: ['#ربط_دعوى'],
    };
}

function patchStageWithLinkEvent(file: FileData, event: TimelineEvent): FileData {
    const stages = [...resolveStages(file)];
    const idx = resolveActiveStageIndex(file, stages);
    const stage = { ...stages[idx] };
    stage.timeline = [...(stage.timeline ?? []), event];
    stages[idx] = stage;
    return { ...file, stages, activeStageIndex: idx };
}

export function readCaseLinks(file: Record<string, unknown> | null | undefined): CaseLinkRecord[] {
    const raw = file?.caseLinks;
    if (!Array.isArray(raw)) return [];
    return raw.filter(
        (item): item is CaseLinkRecord =>
            Boolean(item) &&
            typeof item === 'object' &&
            typeof (item as CaseLinkRecord).id === 'string' &&
            typeof (item as CaseLinkRecord).peerCaseNo === 'string',
    );
}

function isOutboundInternalCaseLink(
    link: CaseLinkRecord,
    selfId: number,
): boolean {
    if (link.isExternal) return false;
    const originId = normalizeFileId(link.originFileId ?? selfId);
    if (originId !== selfId) return false;
    if (link.peerDossierKind === 'criminal' && link.peerCriminalId) return true;
    return link.peerFileId != null;
}

function readOutboundInternalCaseLink(file: FileData | Record<string, unknown>): CaseLinkRecord | undefined {
    const selfId = normalizeFileId((file as FileData).id);
    if (selfId === null) return undefined;
    return readCaseLinks(file).find((link) => isOutboundInternalCaseLink(link, selfId));
}

/**
 * ربط صادر من هذه الإضبارة نحو peer — يتطلب originFileId يطابق الإضبارة الحالية.
 */
export function resolveOutboundCaseLink(
    file: FileData | Record<string, unknown>,
): CaseLinkRecord | undefined {
    return readOutboundInternalCaseLink(file);
}

export function isLawsuitVaultArchived(status?: string | null): boolean {
    const normalized = String(status ?? 'active').trim();
    return normalized === 'archived' || normalized === 'archived_stage';
}

function resolveStrictOutboundFromDossier(
    dossier: FileData | Record<string, unknown>,
    parentData?: Record<string, unknown> | null,
): CaseLinkRecord | undefined {
    const selfId = normalizeFileId((dossier as FileData).id);
    if (selfId === null) return undefined;

    const fromDossier = readOutboundInternalCaseLink(dossier);
    if (fromDossier) return fromDossier;

    if (parentData && normalizeFileId(parentData.id) === selfId) {
        return readOutboundInternalCaseLink(parentData);
    }
    return undefined;
}

function resolveCaseLinkKindLabel(file: FileData): string {
    const jurisdiction = resolveLawsuitJurisdiction(file);
    return jurisdiction === 'personal' ? 'أحوال' : 'مدني';
}

function isCaseLinkEligibleFile(f: FileData): boolean {
    if (f.status === 'deleted') return false;
    if (f.consolidationMergedInto) return false;
    if (f.type === 'execution') return false;
    return f.type === 'lawsuit' || f.type === 'transaction' || !f.type;
}

/** يمنع الربط مع الإضبارة نفسها أو ملفات محذوفة/تنفيذ فقط. */
export function rejectCaseLinkPair(primary: FileData, secondary?: FileData): string | null {
    if (!isCaseLinkEligibleFile(primary)) {
        return 'الإضبارة الحالية غير مؤهّلة للربط';
    }
    if (secondary && !isCaseLinkEligibleFile(secondary)) {
        return 'الإضبارة المختارة غير مؤهّلة للربط';
    }
    if (secondary && normalizeFileId(primary.id) === normalizeFileId(secondary.id)) {
        return 'لا يمكن ربط الإضبارة مع نفسها';
    }
    return null;
}

function readLinkedCriminalIds(file: FileData | Record<string, unknown>): Set<string> {
    const ids = new Set<string>();
    for (const link of readCaseLinks(file)) {
        if (link.isExternal) continue;
        const criminalId = String(link.peerCriminalId ?? '').trim();
        if (criminalId) ids.add(criminalId);
    }
    return ids;
}

function isLawsuitPeerLinkedFromAnyOrigin(files: FileData[], candidateId: number): boolean {
    for (const f of files) {
        for (const link of readCaseLinks(f)) {
            if (link.isExternal) continue;
            if (normalizeFileId(link.peerFileId) === candidateId) return true;
        }
    }
    return false;
}

function isCriminalPeerLinkedFromAnyOrigin(files: FileData[], criminalId: string): boolean {
    const id = String(criminalId ?? '').trim();
    if (!id) return false;
    for (const f of files) {
        for (const link of readCaseLinks(f)) {
            if (link.isExternal) continue;
            if (String(link.peerCriminalId ?? '').trim() === id) return true;
        }
    }
    return false;
}

function lawsuitCaseLinkCandidate(f: FileData, id: number): CaseLinkCandidate {
    const stageLabel =
        resolveActiveStageName(f) ||
        String(f.currentStage ?? '').trim() ||
        undefined;
    const caseNo = String(f.caseNo ?? '').trim() || `#${id}`;
    return {
        key: `lawsuit:${id}`,
        id,
        dossierKind: 'lawsuit',
        lawsuitFileId: id,
        caseNo,
        status: String(f.status ?? 'active'),
        court: typeof f.court === 'string' ? f.court : undefined,
        clientName: f.parties?.find((p) => p.isClient)?.name?.trim() || undefined,
        stageLabel,
        kindLabel: resolveCaseLinkKindLabel(f),
    };
}

/**
 * مرشّحو الربط — بلا قيد اختصاص أو أرشفة أو درجة تقاضٍ (عكس التوحيد).
 * يُدمَج مع مرشّحي الجزائي عبر buildCriminalCaseLinkCandidates في الواجهة.
 */
export function listCaseLinkCandidates(files: FileData[], currentFileId: unknown): CaseLinkCandidate[] {
    const currentId = normalizeFileId(currentFileId);
    if (currentId === null) return [];

    const currentFile = findFileById(files, currentId);
    if (!currentFile || !isCaseLinkEligibleFile(currentFile)) return [];

    const linkedPeerIds = new Set<number>();
    for (const link of readCaseLinks(currentFile as unknown as Record<string, unknown>)) {
        if (link.isExternal) continue;
        const peerId = normalizeFileId(link.peerFileId);
        if (peerId !== null) linkedPeerIds.add(peerId);
    }

    const seenIds = new Set<number>();
    const candidates: CaseLinkCandidate[] = [];

    for (const f of files) {
        const id = normalizeFileId(f.id);
        if (id === null || id === currentId || seenIds.has(id)) continue;
        if (!isCaseLinkEligibleFile(f)) continue;
        if (linkedPeerIds.has(id)) continue;
        if (isLawsuitPeerLinkedFromAnyOrigin(files, id)) continue;

        seenIds.add(id);
        candidates.push(lawsuitCaseLinkCandidate(f, id));
    }

    return candidates.sort((a, b) => {
        const rank = (status: string) => {
            if (status === 'archived' || status === 'archived_stage') return 1;
            if (status === 'paused') return 2;
            return 0;
        };
        const byStatus = rank(a.status) - rank(b.status);
        if (byStatus !== 0) return byStatus;
        return a.caseNo.localeCompare(b.caseNo, 'ar');
    });
}

export function mergeCaseLinkCandidates(
    lawsuitCandidates: CaseLinkCandidate[],
    criminalCandidates: CaseLinkCandidate[],
): CaseLinkCandidate[] {
    return [...lawsuitCandidates, ...criminalCandidates].sort((a, b) =>
        a.caseNo.localeCompare(b.caseNo, 'ar'),
    );
}

export function readLinkedCriminalIdsFromDossier(
    dossier: FileData | Record<string, unknown>,
): Set<string> {
    return readLinkedCriminalIds(dossier);
}

export function isCriminalCaseLinkTaken(files: FileData[], criminalId: string): boolean {
    return isCriminalPeerLinkedFromAnyOrigin(files, criminalId);
}

/**
 * زر الاطلاع/فك الربط — على الإضبارة الطالبة فقط.
 * الإضبارة المربوطة في المخزن لا ترى أي أثر للربط.
 */
export function resolveCaseLinkBrowseUi(
    dossier: FileData | Record<string, unknown>,
    parentData: Record<string, unknown> | null | undefined,
    files: FileData[],
): CaseLinkRecord | undefined {
    const selfId = normalizeFileId((dossier as FileData).id);
    if (selfId === null) return undefined;

    if (findCaseLinkOriginForPeer(selfId, files)) {
        return undefined;
    }

    const outbound = resolveStrictOutboundFromDossier(dossier, parentData);
    if (!outbound) return undefined;

    if (outbound.peerDossierKind === 'criminal' && outbound.peerCriminalId) {
        return outbound;
    }

    if (!outbound.peerFileId) return undefined;

    const peer = findFileById(files, outbound.peerFileId);
    if (!peer) return undefined;

    return outbound;
}

/** إزالة أي أثر ربط داخلي عن طريق الخطأ على إضبارة المخزن المربوطة. */
export function scrubPeerCaseLinkPollution(file: FileData, files: FileData[]): FileData {
    const selfId = normalizeFileId(file.id);
    if (selfId === null) return file;
    if (!findCaseLinkOriginForPeer(selfId, files)) return file;

    const links = readCaseLinks(file);
    const externalOnly = links.filter((link) => link.isExternal);
    if (externalOnly.length === links.length) return file;
    return { ...file, caseLinks: externalOnly };
}

/** الإضبارة التي أنشأت الربط (قابلة للتحرير). */
export function resolveCaseLinkOriginId(file: FileData | Record<string, unknown>): number | null {
    const outbound = readOutboundInternalCaseLink(file);
    if (!outbound) return null;
    return normalizeFileId(outbound.originFileId ?? (file as FileData).id);
}

/** إضبارة أصلية تربط إلى peerFileId — الدعوى المربوطة في المخزن لا تُعدَّل. */
export function findCaseLinkOriginForPeer(
    peerFileId: unknown,
    files: FileData[],
): FileData | null {
    const peerId = normalizeFileId(peerFileId);
    if (peerId === null) return null;

    for (const candidate of files) {
        const originId = normalizeFileId(candidate.id);
        if (originId === null || originId === peerId) continue;
        for (const link of readCaseLinks(candidate)) {
            if (link.isExternal) continue;
            if (normalizeFileId(link.peerFileId) !== peerId) continue;
            const declaredOrigin = normalizeFileId(link.originFileId ?? originId);
            if (declaredOrigin === originId) return candidate;
        }
    }
    return null;
}

/** الإضبارة التي طلبت الربط — تحرير كامل (ليست للاطلاع). */
export function isCaseLinkOriginDossier(file: FileData | Record<string, unknown>): boolean {
    return readOutboundInternalCaseLink(file) != null;
}

/** نسخة معزولة للاطلاع — لا تُكتب على ملف المخزن. */
export function cloneFileForCaseLinkBrowse(file: FileData): FileData {
    if (typeof structuredClone === 'function') {
        return structuredClone(file);
    }
    return JSON.parse(JSON.stringify(file)) as FileData;
}

function sanitizeOriginCaseLinks(file: FileData): FileData {
    const selfId = normalizeFileId(file.id);
    if (selfId === null) return file;
    const links = readCaseLinks(file).filter((link) => {
        if (link.id.endsWith('_peer')) return false;
        if (!link.isExternal) {
            const originId = normalizeFileId(link.originFileId ?? selfId);
            if (originId !== selfId) return false;
        }
        return true;
    });
    return { ...file, caseLinks: links };
}

export function addExternalCaseLink(file: FileData, peerCaseNo: string, meta: CaseLinkMeta): FileData {
    const record: CaseLinkRecord = {
        id: `link_ext_${Date.now()}`,
        peerCaseNo: peerCaseNo.trim(),
        linkDate: meta.linkDate,
        reason: meta.reason,
        isExternal: true,
    };
    const withLinks = appendCaseLinks(file, [record]);
    return patchStageWithLinkEvent(withLinks, buildLinkTimelineEvent(peerCaseNo.trim(), meta, true));
}

/**
 * ربط إضبارة مدنية/أحوال موجودة — يُحدَّث ملف الإضبارة الأصلية فقط.
 */
export function linkExistingLawsuitFiles(
    primary: FileData,
    secondary: FileData,
    meta: CaseLinkMeta,
): { updatedPrimary: FileData } {
    const rejection = rejectCaseLinkPair(primary, secondary);
    if (rejection) {
        throw new Error(rejection);
    }
    const linkId = `link_${Date.now()}`;
    const primaryId = Number(primary.id);
    const secondaryCaseNo = String(secondary.caseNo ?? '').trim() || `#${secondary.id}`;

    const primaryRecord: CaseLinkRecord = {
        id: linkId,
        peerFileId: Number(secondary.id),
        peerCaseNo: secondaryCaseNo,
        linkDate: meta.linkDate,
        reason: meta.reason,
        isExternal: false,
        originFileId: primaryId,
        peerDossierKind: 'lawsuit',
    };

    let updatedPrimary = sanitizeOriginCaseLinks(appendCaseLinks(primary, [primaryRecord]));
    updatedPrimary = patchStageWithLinkEvent(
        updatedPrimary,
        buildLinkTimelineEvent(secondaryCaseNo, meta, false),
    );

    return { updatedPrimary };
}

/** ربط إضبارة جزائية — يُسجَّل على الإضبارة الأصلية فقط. */
export function linkCriminalPeerToOrigin(
    primary: FileData,
    peer: { criminalId: string; caseNo: string },
    meta: CaseLinkMeta,
): { updatedPrimary: FileData } {
    const rejection = rejectCaseLinkPair(primary);
    if (rejection) {
        throw new Error(rejection);
    }
    const criminalId = String(peer.criminalId ?? '').trim();
    if (!criminalId) {
        throw new Error('تعذّر تحديد الإضبارة الجزائية');
    }

    const linkId = `link_crim_${Date.now()}`;
    const primaryId = Number(primary.id);
    const caseNo = String(peer.caseNo ?? '').trim() || `#${criminalId}`;

    const primaryRecord: CaseLinkRecord = {
        id: linkId,
        peerCaseNo: caseNo,
        linkDate: meta.linkDate,
        reason: meta.reason,
        isExternal: false,
        originFileId: primaryId,
        peerDossierKind: 'criminal',
        peerCriminalId: criminalId,
    };

    let updatedPrimary = sanitizeOriginCaseLinks(appendCaseLinks(primary, [primaryRecord]));
    updatedPrimary = patchStageWithLinkEvent(
        updatedPrimary,
        buildLinkTimelineEvent(caseNo, meta, false),
    );

    return { updatedPrimary };
}

function buildUnlinkTimelineEvent(peerCaseNo: string): TimelineEvent {
    return {
        id: `case_unlink_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'milestone',
        date: getLocalTodayYmd(),
        title: `🔗 فك ربط — ${peerCaseNo}`,
        details: `تم فك ربط الإضبارة رقم ${peerCaseNo} — ملف المخزن لم يُعدَّل`,
        isNew: true,
        tags: ['#فك_ربط_دعوى'],
    };
}

/** يزيل ربطاً داخلياً من الإضبارة الأصلية فقط. */
export function removeInternalCaseLinkFromOrigin(
    origin: FileData,
    peerFileId: unknown,
    peerCriminalId?: string | null,
): FileData | null {
    const selfId = normalizeFileId(origin.id);
    if (selfId === null) return null;

    const outbound = resolveOutboundCaseLink(origin);
    if (!outbound) return null;

    const criminalId = String(peerCriminalId ?? '').trim();
    const peerId = normalizeFileId(peerFileId);

    const matchesCriminal =
        criminalId &&
        outbound.peerDossierKind === 'criminal' &&
        String(outbound.peerCriminalId ?? '').trim() === criminalId;
    const matchesLawsuit = peerId !== null && normalizeFileId(outbound.peerFileId) === peerId;

    if (!matchesCriminal && !matchesLawsuit) return null;

    const peerCaseNo = String(outbound.peerCaseNo ?? '').trim() || `#${peerId ?? criminalId}`;
    const remainingLinks = readCaseLinks(origin).filter((link) => {
        if (link.isExternal) return true;
        if (matchesCriminal) {
            return String(link.peerCriminalId ?? '').trim() !== criminalId;
        }
        return normalizeFileId(link.peerFileId) !== peerId;
    });

    let updated = sanitizeOriginCaseLinks({ ...origin, caseLinks: remainingLinks });
    updated = patchStageWithLinkEvent(updated, buildUnlinkTimelineEvent(peerCaseNo));
    return updated;
}

export function resolveCaseLinkPeerNav(
    activeFile: FileData | null | undefined,
    files: FileData[],
): CaseLinkPeerNav | null {
    if (!activeFile) return null;
    const activeId = normalizeFileId(activeFile.id);
    if (activeId === null) return null;

    const outbound = readOutboundInternalCaseLink(activeFile);
    if (outbound?.peerFileId) {
        const peer = findFileById(files, outbound.peerFileId);
        if (peer) return { origin: activeFile, peer };
    }

    const origin = findCaseLinkOriginForPeer(activeId, files);
    if (origin) return { origin, peer: activeFile };

    return null;
}
