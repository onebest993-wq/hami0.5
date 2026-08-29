/** ترحيل حالة Zustand persist للنظام الجزائي — مُستخرج من criminalStore */
import type {
    JudicialDecision,
    SeveranceReason,
} from '@/app/types/criminal';
import type {
    CrimeType,
    CriminalCase,
    CriminalDossierStatus,
    InAbsentiaDetails,
    PhysicalLocation,
    TimelineEvent,
} from './criminalCaseModel';
import { DEFAULT_INVESTIGATION_DEFENDANT_STATUS } from '@/app/types/investigationDefendant';
import { createCriminalId as createId } from './criminalIdUtils';
import { normalizeCriminalCaseLocation, normalizeSocialInquiryReport } from './criminalCaseDraftFactory';
import { resolveMergedCaseIds } from './criminalCaseMergeUtils';
import { resolveOfficialCaseNumber } from './criminalCaseReferenceUtils';
import { normalizeGuarantorDetails } from './criminalGuarantorModel';
import { normalizeSeizedAssets } from './criminalSeizedAssetModel';
import { normalizeOurRepresentation } from './criminalProceduralPartyUtils';
import { repairUnknownDefendantCaseRecord, resolveDefendantFullName } from './criminalUnknownDefendant';
import { normalizeTrashBin } from './criminalCaseTrash';
import {
    migrateLegacyPathsToContainers,
    normalizeProceduralContainers,
} from './proceduralContainersEngine';
import { normalizeProceduralCanvasAudit } from './proceduralSandboxToolkit';
import { normalizeTrialSessions } from './trialSessionsEngine';
import { normalizeTrialDepositions } from './trialDepositionsEngine';
import {
    migrateLegacyCassationToProceeding,
} from './cassationEngine';
import {
    mergeJudicialDecisionsFromRequests,
    normalizeJudicialDecision,
} from './judicialDecisionsEngine';
import { migrateVerdictCardsOnCase } from './verdictCardsEngine';
import { normalizeInvestigationDefendantStatus } from './investigationDefendantPurge';
import {
    isInvestigationStoredStage,
    normalizeLegacyCriminalStage,
    resolveCaseStageFromRecord,
} from './criminalStageUtils';
import { isSeveranceReasonValue } from './caseSeveranceView';
import {
    ensureStageJourneyOnCase,
    normalizeDefendantPersonalFields,
    normalizeTrialChargeFieldsOnCase,
    resolveInvestigationCaseNumberSnapshot,
    sanitizeMergeTimelineEvents,
    sanitizeMergedCasesTexts,
} from './criminalStorePersistSupport';

import {
    normalizePersistFinalDecision,
    normalizePersistInvestigationLogs,
    normalizePersistLawyerRequests,
    normalizePersistLegalArticleHistory,
    normalizePersistOtherEvidenceItems,
    normalizePersistStatements,
    normalizePersistTimeline,
    stripLegacyPersistComplainant,
} from './criminalStorePersistMigrateNormalize';
import { migratePendingSeveranceContext } from './criminalStorePersistMigrateSeverance';
import { asRecord, nestedRecord, type UnknownRecord } from './criminalStorePersistMigrateUtils';
import {
    normalizeDraftDefendantRow,
    normalizePersistDefendantRow,
} from './criminalStorePersistMigrateDefendantRows';


export function migrateCriminalPersistState(persistedState: unknown): unknown {
    if (!persistedState || typeof persistedState !== 'object') return persistedState;
    const s = asRecord(persistedState);

    migratePendingSeveranceContext(s);

    const nextDraft =
        s.draft && typeof s.draft === 'object' ? { ...asRecord(s.draft) } : undefined;
    if (nextDraft) {
        const complainantsRaw = Array.isArray(nextDraft.complainants) ? nextDraft.complainants : [];
        const complainants = complainantsRaw.map(stripLegacyPersistComplainant);
        nextDraft.complainants = complainants;
        delete nextDraft.civilClaimantDetails;
        const draftBasics =
            nextDraft.basics && typeof nextDraft.basics === 'object' ? { ...asRecord(nextDraft.basics) } : {};
        const incoming = String(draftBasics.ourRepresentation ?? '').trim();
        const draftRole = String(draftBasics.role ?? '').trim();
        const normalized = normalizeOurRepresentation(incoming, draftRole);
        const draftStage = normalizeLegacyCriminalStage(
            String(draftBasics.stage ?? ''),
            String(draftBasics.crimeType ?? '') as CrimeType | '',
        );
        nextDraft.basics = { ...draftBasics, ourRepresentation: normalized, stage: draftStage };
        const plIncoming = String(nextDraft.physicalLocation ?? '').trim();
        const plValid =
            plIncoming === 'judge_desk' ||
            plIncoming === 'investigator_room' ||
            plIncoming === 'prosecution' ||
            plIncoming === 'police_station' ||
            plIncoming === 'archive' ||
            plIncoming === 'custom';
        if (!plValid) {
            nextDraft.physicalLocation = 'custom';
            nextDraft.physicalLocationCustomName = '';
        } else {
            nextDraft.physicalLocation = plIncoming;
            nextDraft.physicalLocationCustomName =
                typeof nextDraft.physicalLocationCustomName === 'string'
                    ? nextDraft.physicalLocationCustomName
                    : '';
        }
        nextDraft.isArticle3Offense = nextDraft.isArticle3Offense === true ? true : false;
        nextDraft.crimeDiscoveryDate =
            typeof nextDraft.crimeDiscoveryDate === 'string' ? String(nextDraft.crimeDiscoveryDate) : '';
        nextDraft.isMutualComplaint = nextDraft.isMutualComplaint === true ? true : false;
        nextDraft.statements = normalizePersistStatements(nextDraft.statements);
        nextDraft.otherEvidenceItems = normalizePersistOtherEvidenceItems(nextDraft.otherEvidenceItems);
        nextDraft.timelineEvents = normalizePersistTimeline(nextDraft.timelineEvents);
        nextDraft.investigationLogs = normalizePersistInvestigationLogs(nextDraft.investigationLogs);
        const draftContainers = nextDraft.proceduralContainers;
        const draftLegacyPaths = nextDraft.proceduralPaths;
        nextDraft.proceduralContainers = Array.isArray(draftContainers)
            ? normalizeProceduralContainers(draftContainers)
            : migrateLegacyPathsToContainers(draftLegacyPaths);
        delete nextDraft.proceduralPaths;
        nextDraft.lawyerRequests = normalizePersistLawyerRequests(nextDraft.lawyerRequests);
        nextDraft.trials = normalizeTrialSessions(nextDraft.trials);
        nextDraft.trialDepositions = normalizeTrialDepositions(nextDraft.trialDepositions);
        nextDraft.location = normalizeCriminalCaseLocation(nextDraft.location);
    }

    const nextCasesById =
        s.casesById && typeof s.casesById === 'object' ? { ...asRecord(s.casesById) } : undefined;
    if (nextCasesById) {
        Object.keys(nextCasesById).forEach((k) => {
            const cRaw = nextCasesById[k];
            if (!cRaw || typeof cRaw !== 'object') return;
            const c = asRecord(cRaw);
            const defendants = Array.isArray(c.defendants) ? c.defendants : [];
            const complainantsRaw = Array.isArray(c.complainants) ? c.complainants : [];
            const complainants = complainantsRaw.map(stripLegacyPersistComplainant);
            const legalArticleHistory = normalizePersistLegalArticleHistory(c);
            const finalDecision = normalizePersistFinalDecision(c);
            const { civilClaimantDetails: _ccd, ...caseRest } = c;
            const basics = nestedRecord(c, 'basics');
            const locationRec = nestedRecord(c, 'location');
            const cassationDetails = nestedRecord(c, 'cassationCaseDetails');
            nextCasesById[k] = {
                ...caseRest,
                location: normalizeCriminalCaseLocation(c.location),
                complainants,
                finalDecision,
                defendants: (() => {
                    const normalizedDefendants = defendants.map(normalizePersistDefendantRow);
                    const isSeveredChild = c.isSeveredChild === true;
                    const hasActiveDefendant = normalizedDefendants.some(
                        (d) => normalizeInvestigationDefendantStatus(d.investigationStatus) === 'active',
                    );
                    const hasClosure = Boolean(c.investigationDossierClosure);
                    if (isSeveredChild && normalizedDefendants.length > 0 && !hasActiveDefendant && !hasClosure) {
                        return normalizedDefendants.map((d) => ({
                            ...d,
                            investigationStatus: DEFAULT_INVESTIGATION_DEFENDANT_STATUS,
                        }));
                    }
                    return normalizedDefendants;
                })(),
                statements: normalizePersistStatements(c.statements),
                otherEvidenceItems: normalizePersistOtherEvidenceItems(c.otherEvidenceItems),
                timelineEvents: (() => {
                    const stage = String(basics?.stage ?? '').trim();
                    const events = normalizePersistTimeline(c.timelineEvents);
                    if (!isInvestigationStoredStage(stage)) return events;
                    return events.map((ev) => {
                        const { nextDate: _drop, ...rest } = ev as TimelineEvent & {
                            nextDate?: string;
                        };
                        return rest as TimelineEvent;
                    });
                })(),
                investigationLogs: normalizePersistInvestigationLogs(c.investigationLogs),
                proceduralContainers: (() => {
                    const raw = c.proceduralContainers;
                    if (Array.isArray(raw)) return normalizeProceduralContainers(raw);
                    return migrateLegacyPathsToContainers(c.proceduralPaths);
                })(),
                proceduralCanvasAudit: normalizeProceduralCanvasAudit(c.proceduralCanvasAudit),
                lawyerRequests: normalizePersistLawyerRequests(c.lawyerRequests),
                trials: normalizeTrialSessions(c.trials),
                trialDepositions: normalizeTrialDepositions(c.trialDepositions),
                ...normalizeTrialChargeFieldsOnCase(c as unknown as CriminalCase),
                trashBin: normalizeTrashBin(c.trashBin),
                isFrozen: typeof c.isFrozen === 'boolean' ? c.isFrozen : undefined,
                isPrejudicialPostponed:
                    typeof c.isPrejudicialPostponed === 'boolean' ? c.isPrejudicialPostponed : undefined,
                isDefaultJudgmentArchived:
                    typeof c.isDefaultJudgmentArchived === 'boolean'
                        ? c.isDefaultJudgmentArchived
                        : undefined,
                parentCaseId:
                    typeof c.parentCaseId === 'string' && String(c.parentCaseId).trim()
                        ? String(c.parentCaseId).trim()
                        : undefined,
                isSeveredChild: c.isSeveredChild === true,
                severanceReason: isSeveranceReasonValue(String(c.severanceReason ?? ''))
                    ? (c.severanceReason as SeveranceReason)
                    : undefined,
                severanceReasonDetail:
                    typeof c.severanceReasonDetail === 'string' && String(c.severanceReasonDetail).trim()
                        ? String(c.severanceReasonDetail).trim()
                        : undefined,
                severedAt:
                    typeof c.severedAt === 'string' && String(c.severedAt).trim()
                        ? String(c.severedAt).trim()
                        : undefined,
                severedChildCaseIds: Array.isArray(c.severedChildCaseIds)
                    ? c.severedChildCaseIds
                          .map((x: unknown) => String(x ?? '').trim())
                          .filter((x: string) => x.length > 0)
                    : undefined,
                verdictDate: typeof c.verdictDate === 'string' ? c.verdictDate : undefined,
                isSentToCassation:
                    typeof c.isSentToCassation === 'boolean' ? c.isSentToCassation : undefined,
                cassationCaseDetails:
                    c.cassationCaseDetails && typeof c.cassationCaseDetails === 'object'
                        ? {
                              cassationNumber: String(cassationDetails?.cassationNumber ?? ''),
                              sentDate: String(cassationDetails?.sentDate ?? ''),
                              panelName: String(cassationDetails?.panelName ?? ''),
                          }
                        : undefined,
                isArchived: typeof c.isArchived === 'boolean' ? c.isArchived : undefined,
                notes: typeof c.notes === 'string' ? c.notes : undefined,
                legalArticleHistory,
                basics: {
                    ...(c.basics as UnknownRecord),
                    stage: normalizeLegacyCriminalStage(
                        String(basics?.stage ?? ''),
                        String(basics?.crimeType ?? '') as CrimeType | '',
                    ),
                    legalArticle:
                        legalArticleHistory.length > 0
                            ? legalArticleHistory[legalArticleHistory.length - 1].article
                            : String(basics?.legalArticle ?? ''),
                    ourRepresentation: normalizeOurRepresentation(
                        String(basics?.ourRepresentation ?? ''),
                        String(basics?.role ?? ''),
                    ),
                },
                isPrivateRightWaived:
                    typeof c.isPrivateRightWaived === 'boolean' ? c.isPrivateRightWaived : undefined,
                waiverDate: typeof c.waiverDate === 'string' ? c.waiverDate : undefined,
                physicalLocation: ((): PhysicalLocation => {
                    const incoming = String(
                        c.physicalLocation ?? asRecord(c.physicalLocation)?.key ?? '',
                    ).trim();
                    const valid =
                        incoming === 'judge_desk' ||
                        incoming === 'investigator_room' ||
                        incoming === 'prosecution' ||
                        incoming === 'police_station' ||
                        incoming === 'archive' ||
                        incoming === 'custom';
                    if (valid) return incoming as PhysicalLocation;
                    const stage = String(basics?.stage ?? '').trim();
                    const isArchivedAny = Boolean(c.isArchived) || Boolean(String(c.mergedIntoCaseId ?? '').trim());
                    if (isArchivedAny) return 'archive';
                    if (isInvestigationStoredStage(stage)) {
                        const at = String(locationRec?.investigationPapersAt ?? '').trim();
                        if (at === 'مركز شرطة') return 'police_station';
                        return 'investigator_room';
                    }
                    return 'judge_desk';
                })(),
                physicalLocationCustomName:
                    typeof c.physicalLocationCustomName === 'string'
                        ? c.physicalLocationCustomName
                        : undefined,
                isArticle3Offense: c.isArticle3Offense === true ? true : undefined,
                crimeDiscoveryDate:
                    typeof c.crimeDiscoveryDate === 'string' ? String(c.crimeDiscoveryDate) : undefined,
                isMutualComplaint: c.isMutualComplaint === true ? true : false,
                isPublicProsecutionComplainant:
                    c.isPublicProsecutionComplainant === true ? true : undefined,
                articleIncludesPublicRight:
                    c.articleIncludesPublicRight === true ? true : undefined,
                dossierStatus: ((): CriminalDossierStatus | undefined => {
                    const raw = String(c.dossierStatus ?? '').trim();
                    if (raw === 'merged' || raw === 'active') return raw;
                    const mergedInto = String(c.mergedIntoCaseId ?? '').trim();
                    if (mergedInto) return 'merged';
                    return 'active';
                })(),
                mergedCasesTexts: Array.isArray(c.mergedCasesTexts)
                    ? c.mergedCasesTexts
                          .map((x: unknown) => String(x ?? '').trim())
                          .filter((x: string) => x.length > 0)
                    : undefined,
                mergedIntoCaseId:
                    typeof c.mergedIntoCaseId === 'string' && String(c.mergedIntoCaseId).trim()
                        ? String(c.mergedIntoCaseId).trim()
                        : undefined,
                mergedIntoCaseNumber:
                    typeof c.mergedIntoCaseNumber === 'string' &&
                    String(c.mergedIntoCaseNumber).trim()
                        ? String(c.mergedIntoCaseNumber).trim()
                        : undefined,
                mergedCaseIds: resolveMergedCaseIds(c as unknown as CriminalCase),
            };
            nextCasesById[k] = repairUnknownDefendantCaseRecord(
                nextCasesById[k] as unknown as CriminalCase,
            );
        });
    }

    if (nextDraft) {
        const draftDefendants = Array.isArray(nextDraft.defendants) ? nextDraft.defendants : [];
        nextDraft.defendants = draftDefendants.map(normalizeDraftDefendantRow);
    }

    let casesOut = nextCasesById ?? s.casesById;
    if (casesOut && typeof casesOut === 'object') {
        const map = { ...(casesOut as Record<string, CriminalCase>) };
        for (const [caseId, raw] of Object.entries(map)) {
            const c = raw as CriminalCase;
            let patched = { ...c };

            const mergedIds = resolveMergedCaseIds(c);
            if (mergedIds.length > 0) {
                const texts = sanitizeMergedCasesTexts(
                    Array.isArray(c.mergedCasesTexts) ? c.mergedCasesTexts : [],
                );
                for (const childId of mergedIds) {
                    const child = map[childId];
                    const num = resolveOfficialCaseNumber(child);
                    if (num !== '—' && !texts.includes(num)) texts.push(num);
                }
                if (texts.length) patched = { ...patched, mergedCasesTexts: texts };
                const events = Array.isArray(patched.timelineEvents) ? patched.timelineEvents : [];
                const cleanEvents = sanitizeMergeTimelineEvents(events, mergedIds, map);
                if (cleanEvents !== events) patched = { ...patched, timelineEvents: cleanEvents };
            }

            const mergedIntoId = String(c.mergedIntoCaseId ?? '').trim();
            if (mergedIntoId) {
                const parent = map[mergedIntoId];
                const parentNum = resolveOfficialCaseNumber(parent);
                patched = {
                    ...patched,
                    dossierStatus: 'merged' as const,
                    mergedIntoCaseNumber: String(c.mergedIntoCaseNumber ?? '').trim() || parentNum,
                };
            }

            patched = ensureStageJourneyOnCase(patched);
            patched = {
                ...patched,
                judicialDecisions: mergeJudicialDecisionsFromRequests(
                    (Array.isArray(patched.judicialDecisions)
                        ? patched.judicialDecisions
                              .map((d) => normalizeJudicialDecision(d))
                              .filter((x): x is JudicialDecision => Boolean(x))
                        : undefined) as JudicialDecision[] | undefined,
                    patched.lawyerRequests,
                ),
            };
            const migratedProceeding = migrateLegacyCassationToProceeding(patched);
            if (migratedProceeding) {
                patched = { ...patched, cassationProceeding: migratedProceeding };
            }
            if (Array.isArray(patched.defendants)) {
                patched = {
                    ...patched,
                    defendants: patched.defendants.map((d) => normalizeDefendantPersonalFields(d)),
                };
            }
            const stageResolved = resolveCaseStageFromRecord(patched);
            patched = { ...patched, caseStage: stageResolved };
            if (stageResolved === 'misdemeanor' || stageResolved === 'felony') {
                if (!patched.isInvestigationLocked) patched = { ...patched, isInvestigationLocked: true };
                const courtNum =
                    String(patched.courtCaseNumber ?? '').trim() ||
                    String(patched.location?.caseNumber ?? '').trim();
                if (courtNum) {
                    patched = {
                        ...patched,
                        courtCaseNumber: courtNum,
                        location: { ...patched.location, caseNumber: courtNum },
                    };
                }
                const invSnap =
                    String(patched.investigationCaseNumber ?? '').trim() ||
                    resolveInvestigationCaseNumberSnapshot(patched);
                if (invSnap && invSnap !== '—') {
                    patched = { ...patched, investigationCaseNumber: invSnap };
                }
            }

            map[caseId] = migrateVerdictCardsOnCase(patched);
        }
        casesOut = map;
    }

    return { ...s, draft: nextDraft ?? s.draft, casesById: casesOut };
}

