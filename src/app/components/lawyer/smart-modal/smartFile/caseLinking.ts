import type { CaseLinkRecord, CaseStage, FileData, TimelineEvent } from '../../LawyerShared';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { findFileById, normalizeFileId } from './incidentalCaseLinking';
import type { ConsolidationCandidate } from './caseConsolidationLinking';
import { listConsolidationCandidates } from './caseConsolidationLinking';
import { buildInitialStagesFromFile } from './stageInit';

export type CaseLinkMeta = {
    linkDate: string;
    reason?: string;
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
            : `تم ربط الدعوى رقم ${peerCaseNo}`,
        meta.reason ? `السبب: ${meta.reason}` : '',
    ].filter(Boolean);
    return {
        id: `case_link_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'milestone',
        date: meta.linkDate || getLocalTodayYmd(),
        title: external ? `🔗 ربط مرجعي — ${peerCaseNo}` : `🔗 ربط دعوى — ${peerCaseNo}`,
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

export function listCaseLinkCandidates(files: FileData[], currentFileId: unknown): ConsolidationCandidate[] {
    const currentId = normalizeFileId(currentFileId);
    if (currentId === null) return [];
    return listConsolidationCandidates(files, currentId).filter((candidate) => {
        const file = findFileById(files, candidate.id);
        if (!file) return true;
        const links = readCaseLinks(file as unknown as Record<string, unknown>);
        return !links.some(
            (l) => !l.isExternal && normalizeFileId(l.peerFileId) === currentId,
        );
    });
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

export function linkExistingLawsuitFiles(
    primary: FileData,
    secondary: FileData,
    meta: CaseLinkMeta,
): { updatedPrimary: FileData; updatedSecondary: FileData } {
    const linkId = `link_${Date.now()}`;
    const primaryCaseNo = String(primary.caseNo ?? '').trim() || `#${primary.id}`;
    const secondaryCaseNo = String(secondary.caseNo ?? '').trim() || `#${secondary.id}`;

    const primaryRecord: CaseLinkRecord = {
        id: linkId,
        peerFileId: Number(secondary.id),
        peerCaseNo: secondaryCaseNo,
        linkDate: meta.linkDate,
        reason: meta.reason,
        isExternal: false,
    };
    const secondaryRecord: CaseLinkRecord = {
        id: `${linkId}_peer`,
        peerFileId: Number(primary.id),
        peerCaseNo: primaryCaseNo,
        linkDate: meta.linkDate,
        reason: meta.reason,
        isExternal: false,
    };

    let updatedPrimary = appendCaseLinks(primary, [primaryRecord]);
    let updatedSecondary = appendCaseLinks(secondary, [secondaryRecord]);
    updatedPrimary = patchStageWithLinkEvent(
        updatedPrimary,
        buildLinkTimelineEvent(secondaryCaseNo, meta, false),
    );
    updatedSecondary = patchStageWithLinkEvent(
        updatedSecondary,
        buildLinkTimelineEvent(primaryCaseNo, meta, false),
    );

    return { updatedPrimary, updatedSecondary };
}

export function resolveCaseLinkPeerNav(
    activeFile: FileData | null | undefined,
    files: FileData[],
): { first: FileData; second: FileData } | null {
    if (!activeFile) return null;
    const internalLink = readCaseLinks(activeFile as unknown as Record<string, unknown>).find(
        (l) => !l.isExternal && l.peerFileId,
    );
    if (!internalLink?.peerFileId) return null;
    const peer = files.find((f) => normalizeFileId(f.id) === normalizeFileId(internalLink.peerFileId));
    if (!peer) return null;
    return activeFile.id < peer.id
        ? { first: activeFile, second: peer }
        : { first: peer, second: activeFile };
}
