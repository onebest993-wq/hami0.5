// @ts-nocheck
/** ترحيل حالة Zustand persist للنظام الجزائي — مُستخرج من criminalStore */
import type {
    CrimeType,
    CriminalCase,
    CriminalCaseStage,
    CriminalDefendant,
    CriminalDossierStatus,
    InAbsentiaDetails,
    InvestigationLog,
    JudicialDecision,
    LawyerRequest,
    LegalArticleChange,
    OtherEvidenceItem,
    PhysicalLocation,
    ProceduralNode,
    SeveranceReason,
    StageConclusion,
    Statement,
    TimelineEvent,
} from '@/app/types/criminal';
import type { JourneyNode } from '@/app/types/criminal';
import { DEFAULT_INVESTIGATION_DEFENDANT_STATUS } from '@/app/types/investigationDefendant';
import { createCriminalId as createId } from './criminalIdUtils';
import { makeInitialDraft, normalizeCriminalCaseLocation, normalizeSocialInquiryReport } from './criminalCaseDraftFactory';
import { normalizeOurRepresentation } from './criminalProceduralPartyUtils';
import { coerceDefendantFullName, repairUnknownDefendantCaseRecord, resolveDefendantFullName } from './criminalUnknownDefendant';
import { normalizeTrashBin } from './criminalCaseTrash';
import { sanitizeContentHighlights } from './statementContentHighlights';
import {
    migrateLegacyPathsToContainers,
    normalizeProceduralContainers,
} from './proceduralContainersEngine';
import { normalizeProceduralCanvasAudit } from './proceduralSandboxToolkit';
import { normalizeOrderEnforcementTracking } from './orderEnforcementEngine';
import { isLawyerRequestFinalStatus } from './lawyerRequestStatusMachine';
import { isStageExpirationReason } from './stageExpirationReasons';
import { normalizeTrialSessions } from './trialSessionsEngine';
import { normalizeTrialDepositions } from './trialDepositionsEngine';
import {
    normalizeChargeModifications,
    resolveCurrentAccusationArticleFromCase,
    resolveReferralArticleFromCase,
} from './trialChargeEngine';
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
    normalizeTimelineCategoryForDisplay,
    resolveCaseStageFromRecord,
    resolveTimelineEventTitle,
    isTimelineNextDateInvalid,
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

export function migrateCriminalPersistState(persistedState: unknown): unknown {
                if (!persistedState || typeof persistedState !== 'object') return persistedState as any;
                const s = persistedState as any;

                if (s.pendingSeveranceContext?.formDraft) {
                    s.draft = makeInitialDraft();
                }
                if (s.pendingSeveranceContext) {
                    const ctx = s.pendingSeveranceContext;
                    const normDef = (d: unknown) => {
                        if (!d || typeof d !== 'object') return d;
                        const row = d as Record<string, unknown>;
                        return {
                            ...row,
                            fullName: resolveDefendantFullName(row as CriminalDefendant),
                        };
                    };
                    if (Array.isArray(ctx.defendantSnapshots)) {
                        ctx.defendantSnapshots = ctx.defendantSnapshots.map((d) =>
                            normDef(d),
                        ) as CriminalDefendant[];
                    }
                    if (ctx.formDraft && Array.isArray(ctx.formDraft.defendants)) {
                        ctx.formDraft = {
                            ...ctx.formDraft,
                            defendants: ctx.formDraft.defendants.map((d) =>
                                normDef(d),
                            ) as CriminalDefendant[],
                        };
                    }
                    if (!ctx.lockedCaseStage && ctx.formDraft?.basics?.stage) {
                        ctx.lockedCaseStage = normalizeLegacyCriminalStage(
                            String(ctx.formDraft.basics.stage),
                            ctx.formDraft.basics?.crimeType,
                        ) || 'مرحلة التحقيق';
                    }
                    if (ctx.lockedCaseStage && ctx.formDraft?.basics) {
                        ctx.formDraft = {
                            ...ctx.formDraft,
                            basics: {
                                ...ctx.formDraft.basics,
                                stage: ctx.lockedCaseStage,
                            },
                        };
                    }
                }

                const normalizeStatements = (arr: unknown): Statement[] => {
                    if (!Array.isArray(arr)) return [];
                    return arr.map((it) => {
                        if (!it || typeof it !== 'object') {
                            return {
                                id: createId(),
                                date: new Date().toISOString().slice(0, 10),
                                giverType: 'informant',
                                giverName: '',
                                content: String(it ?? ''),
                            };
                        }
                        const o = it as any;
                        if (typeof o.date === 'string' && typeof o.giverType === 'string') {
                            const giverType = o.giverType as Statement['giverType'];
                            const witnessNameRaw =
                                typeof o.witnessName === 'string'
                                    ? String(o.witnessName).trim()
                                    : giverType === 'witness'
                                      ? String(o.giverName ?? '').trim()
                                      : '';
                            const content = String(o.content ?? '').trim();
                            return {
                                ...(o as Statement),
                                giverType,
                                content,
                                witnessName: witnessNameRaw || undefined,
                                witnessDetails:
                                    typeof o.witnessDetails === 'string' && String(o.witnessDetails).trim()
                                        ? String(o.witnessDetails).trim()
                                        : undefined,
                                giverName:
                                    giverType === 'witness' && witnessNameRaw
                                        ? witnessNameRaw
                                        : String(o.giverName ?? '').trim(),
                                isJudiciallyRatified: o.isJudiciallyRatified === true ? true : undefined,
                                statementRecordingPlace:
                                    o.statementRecordingPlace === 'investigation_officer' ||
                                    o.statementRecordingPlace === 'judicial_investigator'
                                        ? o.statementRecordingPlace
                                        : undefined,
                                contentHighlights: (() => {
                                    const hl = sanitizeContentHighlights(o.contentHighlights, content.length);
                                    return hl.length ? hl : undefined;
                                })(),
                                witnessPartySide:
                                    o.witnessPartySide === 'complainant' || o.witnessPartySide === 'defendant'
                                        ? o.witnessPartySide
                                        : o.witnessKind === 'prosecution'
                                          ? 'complainant'
                                          : o.witnessKind === 'defense'
                                            ? 'defendant'
                                            : undefined,
                                witnessPartyIds: Array.isArray(o.witnessPartyIds)
                                    ? o.witnessPartyIds.map((id: unknown) => String(id).trim()).filter(Boolean)
                                    : undefined,
                            };
                        }
                        const isRatified = o.certified === true || o.isJudiciallyRatified === true;
                        return {
                            id: String(o.id ?? createId()),
                            date: String(o.recordedAt ?? o.date ?? new Date().toISOString().slice(0, 10)),
                            giverType: 'informant',
                            giverName: String(o.ownerName ?? o.giverName ?? ''),
                            content: String(o.text ?? o.content ?? ''),
                            notes: typeof o.notes === 'string' ? o.notes : isRatified ? 'مُصدّقة' : undefined,
                            isJudiciallyRatified: isRatified ? true : undefined,
                        };
                    });
                };

                const normalizeTimeline = (arr: unknown): TimelineEvent[] => {
                    if (!Array.isArray(arr)) return [];
                    const mapped = arr.map((it) => {
                        if (!it || typeof it !== 'object') return it as any;
                        const o = it as any;
                        const legacyId = typeof o.relatedDefendantId === 'string' ? o.relatedDefendantId.trim() : '';
                        const rawIds = Array.isArray(o.defendantIds) ? o.defendantIds : legacyId ? [legacyId] : [];
                        const ids = Array.isArray(rawIds)
                            ? rawIds.map((x: unknown) => String(x ?? '').trim()).filter((x: string) => x.length > 0)
                            : [];
                        const rawCategory = typeof o.category === 'string' ? o.category : '';
                        const category = normalizeTimelineCategoryForDisplay(rawCategory);
                        const eventDate = String(o.date ?? '').trim();
                        const rawNext = String(o.nextDate ?? '').trim();
                        const nextDate =
                            rawNext && eventDate && !isTimelineNextDateInvalid(eventDate, rawNext) ? rawNext : undefined;
                        const rawTitle = String(o.title ?? '').trim();
                        const rawDesc = String(o.description ?? o.details ?? '').trim();
                        return {
                            ...o,
                            category,
                            title: resolveTimelineEventTitle(category, rawTitle),
                            description: rawDesc,
                            nextDate,
                            defendantIds: ids.length ? Array.from(new Set(ids)) : undefined,
                            appealedDecision: typeof o.appealedDecision === 'string' ? o.appealedDecision : undefined,
                            postponementReason:
                                typeof o.postponementReason === 'string' ? o.postponementReason : undefined,
                            guarantorDetails: normalizeGuarantorDetails(o.guarantorDetails),
                            extensionDays: typeof o.extensionDays === 'number' ? o.extensionDays : undefined,
                            socialWorkerPresent:
                                typeof o.socialWorkerPresent === 'boolean' ? o.socialWorkerPresent : undefined,
                            suspendedExecution: typeof o.suspendedExecution === 'boolean' ? o.suspendedExecution : undefined,
                            probationYears: typeof o.probationYears === 'number' ? o.probationYears : undefined,
                            transferredToStage: typeof o.transferredToStage === 'string' ? o.transferredToStage : undefined,
                            notifiedDate: typeof o.notifiedDate === 'string' ? o.notifiedDate : undefined,
                            notificationMethod: typeof o.notificationMethod === 'string' ? o.notificationMethod : undefined,
                            summonsStatus:
                                o.summonsStatus === 'served_valid' ||
                                o.summonsStatus === 'not_served_invalid' ||
                                o.summonsStatus === 'served_to_official'
                                    ? o.summonsStatus
                                    : undefined,
                            summonsDate: typeof o.summonsDate === 'string' ? o.summonsDate : undefined,
                            summonsDocumentRef:
                                typeof o.summonsDocumentRef === 'string' ? o.summonsDocumentRef : undefined,
                            targetDefendantId: (() => {
                                if (o.targetDefendantId === null) return null;
                                const tid = String(o.targetDefendantId ?? '').trim();
                                return tid || undefined;
                            })(),
                        } as TimelineEvent;
                    });
                    return mapped.filter((ev) => !isCorruptTimelineEvent(ev));
                };

                const normalizeInvestigationLogs = (arr: unknown): InvestigationLog[] => {
                    if (!Array.isArray(arr)) return [];
                    return arr.map((it) => {
                        if (!it || typeof it !== 'object') {
                            return {
                                id: createId(),
                                date: new Date().toISOString().slice(0, 10),
                                category: 'other',
                                title: String(it ?? ''),
                                details: '',
                                status: 'awaiting_response',
                            };
                        }
                        const o = it as any;
                        const catRaw = String(o.category ?? 'other');
                        const cat = catRaw === 'lawyer_request' ? 'other' : catRaw;
                        const statusRaw = String(o.status ?? 'awaiting_response');
                        const status =
                            statusRaw === 'completed' || statusRaw === 'response_received'
                                ? 'response_received'
                                : statusRaw === 'returned_for_revision'
                                  ? 'returned_for_revision'
                                  : statusRaw === 'pending' || statusRaw === 'awaiting_response'
                                    ? 'awaiting_response'
                                    : 'awaiting_response';
                        const rawIds = Array.isArray(o.defendantIds) ? o.defendantIds : [];
                        const ids = Array.isArray(rawIds)
                            ? rawIds.map((x: unknown) => String(x ?? '').trim()).filter((x: string) => x.length > 0)
                            : [];
                        return {
                            id: String(o.id ?? createId()),
                            date: String(o.date ?? new Date().toISOString().slice(0, 10)),
                            category: [
                                'official_letter',
                                'forensic_report',
                                'site_inspection',
                                'exhibit_seizure',
                                'other',
                            ].includes(cat)
                                ? (cat as InvestigationLog['category'])
                                : 'other',
                            title: String(o.title ?? ''),
                            details: String(o.details ?? ''),
                            status: status as InvestigationLog['status'],
                            attachmentRef: typeof o.attachmentRef === 'string' ? o.attachmentRef : undefined,
                            defendantIds: ids.length ? Array.from(new Set(ids)) : undefined,
                            seizureRecordNumber:
                                typeof o.seizureRecordNumber === 'string' ? o.seizureRecordNumber : undefined,
                            forensicLetterRef:
                                typeof o.forensicLetterRef === 'string' ? o.forensicLetterRef : undefined,
                            linkedPartyId:
                                typeof o.linkedPartyId === 'string'
                                    ? String(o.linkedPartyId).trim() || undefined
                                    : ids[0],
                            exhibitDescription:
                                typeof o.exhibitDescription === 'string' ? o.exhibitDescription : undefined,
                            exhibitQuantity:
                                typeof o.exhibitQuantity === 'string' ? o.exhibitQuantity : undefined,
                            exhibitLifecycle:
                                o.exhibitLifecycle === 'seized_at_station' ||
                                o.exhibitLifecycle === 'sent_to_lab' ||
                                o.exhibitLifecycle === 'lab_result_received'
                                    ? o.exhibitLifecycle
                                    : cat === 'exhibit_seizure'
                                      ? 'seized_at_station'
                                      : undefined,
                            responseReceivedAt:
                                typeof o.responseReceivedAt === 'string' ? o.responseReceivedAt : undefined,
                            responseNotes: typeof o.responseNotes === 'string' ? o.responseNotes : undefined,
                        };
                    });
                };

                const normalizeOtherEvidenceItems = (arr: unknown): OtherEvidenceItem[] => {
                    if (!Array.isArray(arr)) return [];
                    return arr
                        .map((it) => {
                            if (!it || typeof it !== 'object') return null;
                            const o = it as any;
                            const evidenceType = String(o.evidenceType ?? '').trim();
                            if (!evidenceType) return null;
                            const isLinkedToDossier = o.isLinkedToDossier === true;
                            const attachmentDateRaw = String(o.attachmentDate ?? '').trim();
                            return {
                                id: String(o.id ?? createId()),
                                evidenceType,
                                isLinkedToDossier,
                                attachmentDate: isLinkedToDossier && attachmentDateRaw ? attachmentDateRaw : undefined,
                                notes: String(o.notes ?? '').trim(),
                                createdAt: String(o.createdAt ?? attachmentDateRaw ?? '').trim() || undefined,
                                proceduralNodeId:
                                    typeof o.proceduralNodeId === 'string' && String(o.proceduralNodeId).trim()
                                        ? String(o.proceduralNodeId).trim()
                                        : undefined,
                            } as OtherEvidenceItem;
                        })
                        .filter(Boolean) as OtherEvidenceItem[];
                };

                const normalizeLawyerRequests = (arr: unknown): LawyerRequest[] => {
                    if (!Array.isArray(arr)) return [];
                    return arr.map((it) => {
                        if (!it || typeof it !== 'object') {
                            return {
                                id: createId(),
                                requestDate: new Date().toISOString().slice(0, 10),
                                type: '',
                                lawyerNote: String(it ?? ''),
                                status: 'pending',
                            };
                        }
                        const o = it as any;
                        const statusRaw = String(o.status ?? 'pending');
                        const status: LawyerRequest['status'] =
                            statusRaw === 'approved' || statusRaw === 'rejected' || statusRaw === 'executed'
                                ? statusRaw
                                : 'pending';
                        const rawIds = Array.isArray(o.defendantIds) ? o.defendantIds : [];
                        const ids = Array.isArray(rawIds)
                            ? rawIds.map((x: unknown) => String(x ?? '').trim()).filter((x: string) => x.length > 0)
                            : [];
                        const judgeMargin =
                            typeof o.judgeMargin === 'string' && o.judgeMargin.trim()
                                ? o.judgeMargin.trim()
                                : undefined;
                        const decisionDate =
                            typeof o.decisionDate === 'string' && o.decisionDate.trim()
                                ? o.decisionDate.trim()
                                : undefined;
                        const hasRecordedFinalDecision =
                            isLawyerRequestFinalStatus(status) &&
                            Boolean(judgeMargin) &&
                            Boolean(decisionDate);
                        const isLocked =
                            o.isLocked === true ||
                            o.decisionArchived === true ||
                            hasRecordedFinalDecision;
                        return {
                            id: String(o.id ?? createId()),
                            requestDate: String(o.requestDate ?? new Date().toISOString().slice(0, 10)),
                            type: String(o.type ?? ''),
                            lawyerNote: String(o.lawyerNote ?? ''),
                            status,
                            judgeMargin,
                            decisionDate,
                            defendantIds: ids.length ? Array.from(new Set(ids)) : undefined,
                            isLocked,
                            decisionArchived:
                                o.decisionArchived === true || hasRecordedFinalDecision ? true : undefined,
                            proceduralTemplate:
                                typeof o.proceduralTemplate === 'string' ? o.proceduralTemplate : undefined,
                            isAppealable: o.isAppealable === true ? true : undefined,
                            detentionStartDate:
                                typeof o.detentionStartDate === 'string' && o.detentionStartDate.trim()
                                    ? o.detentionStartDate.trim()
                                    : undefined,
                            detentionEndDate:
                                typeof o.detentionEndDate === 'string' && o.detentionEndDate.trim()
                                    ? o.detentionEndDate.trim()
                                    : undefined,
                            legalArticleBasis:
                                typeof o.legalArticleBasis === 'string' && o.legalArticleBasis.trim()
                                    ? o.legalArticleBasis.trim()
                                    : undefined,
                            orderEnforcement: normalizeOrderEnforcementTracking(o.orderEnforcement),
                            margins: (() => {
                                if (!Array.isArray(o.margins)) return undefined;
                                const rows = o.margins
                                    .map((m: unknown) => {
                                        if (!m || typeof m !== 'object') return null;
                                        const row = m as Record<string, unknown>;
                                        const text = String(row.text ?? '').trim();
                                        if (!text) return null;
                                        return {
                                            id: String(row.id ?? createId()),
                                            date: String(row.date ?? new Date().toISOString().slice(0, 10)),
                                            text,
                                        };
                                    })
                                    .filter(Boolean) as { id: string; date: string; text: string }[];
                                return rows.length ? rows : undefined;
                            })(),
                            attachments: (() => {
                                if (!Array.isArray(o.attachments)) return undefined;
                                const rows = o.attachments
                                    .map((a: unknown) => {
                                        if (!a || typeof a !== 'object') return null;
                                        const row = a as Record<string, unknown>;
                                        const name = String(row.name ?? '').trim();
                                        if (!name) return null;
                                        return { id: String(row.id ?? createId()), name };
                                    })
                                    .filter(Boolean) as { id: string; name: string }[];
                                return rows.length ? rows : undefined;
                            })(),
                            isStarred: o.isStarred === true ? true : undefined,
                        };
                    });
                };

                const normalizeLegalArticleHistory = (caseObj: any): LegalArticleChange[] => {
                    const history = caseObj?.legalArticleHistory;
                    if (Array.isArray(history)) {
                        return history
                            .map((h: any) => ({
                                id: String(h?.id ?? createId()),
                                article: String(h?.article ?? ''),
                                changedAtDate: String(h?.changedAtDate ?? new Date().toISOString().slice(0, 10)),
                                changedBy:
                                    h?.changedBy === 'police' || h?.changedBy === 'investigation_judge' || h?.changedBy === 'trial_court'
                                        ? h.changedBy
                                        : 'trial_court',
                            }))
                            .filter((h: any) => String(h.article ?? '').trim().length > 0);
                    }
                    const legacy = String(caseObj?.basics?.legalArticle ?? '').trim();
                    if (!legacy) return [];
                    return [
                        {
                            id: createId(),
                            article: legacy,
                            changedAtDate: new Date().toISOString().slice(0, 10),
                            changedBy: 'trial_court',
                        },
                    ];
                };

                const normalizeFinalDecision = (caseObj: any): StageConclusion | undefined => {
                    const fd = caseObj?.finalDecision;
                    if (!fd || typeof fd !== 'object') return undefined;
                    const stageType = String((fd as any).stageType ?? '');
                    const decisionType = String((fd as any).decisionType ?? '');
                    const defendantStatusAtDecision = String((fd as any).defendantStatusAtDecision ?? '');
                    if (
                        !['investigation', 'misdemeanor', 'felony', 'juvenile', 'cassation'].includes(stageType) ||
                        ![
                            'referral',
                            'closing',
                            'temporary_closing',
                            'conviction',
                            'juvenile_deliver_guardian',
                            'juvenile_behavioral_surveillance',
                            'juvenile_reform_boys',
                            'juvenile_youth_school',
                            'juvenile_fine',
                            'juvenile_severance_referral',
                            'acquittal',
                            'release',
                            'expiration',
                            'cassation_confirm',
                            'cassation_quash_remand',
                            'cassation_quash_reduce',
                            'cassation_quash_acquit_release',
                            'return_investigation_deficiency',
                            'misdemeanor_to_felony_jurisdiction',
                            'felony_to_misdemeanor_jurisdiction',
                            'trial_cassation_appeal',
                            'cassation_quash_investigation',
                            'cassation_quash_trial_misdemeanor',
                            'cassation_quash_trial_felony',
                            'case_split_fugitive_referral',
                            'temporary_release_insufficient_evidence',
                            'postpone_article_183',
                            'default_judgment_issue',
                            'default_judgment_opposition',
                        ].includes(decisionType) ||
                        !['detained', 'bailed', 'fugitive'].includes(defendantStatusAtDecision)
                    ) {
                        return undefined;
                    }
                    return {
                        id: String((fd as any).id ?? createId()),
                        stageType: stageType as any,
                        decisionType: decisionType as any,
                        date: String((fd as any).date ?? ''),
                        details: String((fd as any).details ?? ''),
                        defendantStatusAtDecision: defendantStatusAtDecision as any,
                        defendantIds: Array.isArray((fd as any).defendantIds)
                            ? (fd as any).defendantIds.map((x: any) => String(x ?? '').trim()).filter((x: string) => x.length > 0)
                            : undefined,
                        punishmentType:
                            (fd as any).punishmentType === 'death' ||
                            (fd as any).punishmentType === 'life' ||
                            (fd as any).punishmentType === 'other'
                                ? (fd as any).punishmentType
                                : undefined,
                        expirationReason: isStageExpirationReason(String((fd as any).expirationReason ?? ''))
                            ? (fd as any).expirationReason
                            : undefined,
                    };
                };

                const stripLegacyComplainant = (c: any) => {
                    const { isCivilClaimant: _legacy, ...rest } = c && typeof c === 'object' ? c : {};
                    return {
                        ...rest,
                        isJuvenile: typeof c?.isJuvenile === 'boolean' ? c.isJuvenile : false,
                        isUnderSeven: typeof (c as any)?.isUnderSeven === 'boolean' ? (c as any).isUnderSeven : false,
                        birthDate: typeof c?.birthDate === 'string' ? c.birthDate : '',
                        guardianName: typeof c?.guardianName === 'string' ? c.guardianName : '',
                        guardianRelationship: typeof c?.guardianRelationship === 'string' ? c.guardianRelationship : '',
                    };
                };

                const nextDraft = s.draft && typeof s.draft === 'object' ? { ...s.draft } : undefined;
                if (nextDraft) {
                    const complainantsRaw = Array.isArray((nextDraft as any).complainants) ? (nextDraft as any).complainants : [];
                    const complainants = complainantsRaw.map(stripLegacyComplainant);
                    (nextDraft as any).complainants = complainants;
                    delete (nextDraft as any).civilClaimantDetails;
                    const draftBasics = (nextDraft as any).basics && typeof (nextDraft as any).basics === 'object' ? { ...(nextDraft as any).basics } : {};
                    const incoming = String(draftBasics.ourRepresentation ?? '').trim();
                    const draftRole = String(draftBasics.role ?? '').trim();
                    const normalized = normalizeOurRepresentation(incoming, draftRole);
                    const draftStage = normalizeLegacyCriminalStage(
                        String(draftBasics.stage ?? ''),
                        String(draftBasics.crimeType ?? '') as CrimeType | '',
                    );
                    (nextDraft as any).basics = { ...draftBasics, ourRepresentation: normalized, stage: draftStage };
                    const plIncoming = String((nextDraft as any).physicalLocation ?? '').trim();
                    const plValid =
                        plIncoming === 'judge_desk' ||
                        plIncoming === 'investigator_room' ||
                        plIncoming === 'prosecution' ||
                        plIncoming === 'police_station' ||
                        plIncoming === 'archive' ||
                        plIncoming === 'custom';
                    if (!plValid) {
                        (nextDraft as any).physicalLocation = 'custom';
                        (nextDraft as any).physicalLocationCustomName = '';
                    } else {
                        (nextDraft as any).physicalLocation = plIncoming;
                        (nextDraft as any).physicalLocationCustomName =
                            typeof (nextDraft as any).physicalLocationCustomName === 'string'
                                ? (nextDraft as any).physicalLocationCustomName
                                : '';
                    }
                    (nextDraft as any).isArticle3Offense = (nextDraft as any).isArticle3Offense === true ? true : false;
                    (nextDraft as any).crimeDiscoveryDate =
                        typeof (nextDraft as any).crimeDiscoveryDate === 'string' ? String((nextDraft as any).crimeDiscoveryDate) : '';
                    (nextDraft as any).isMutualComplaint = (nextDraft as any).isMutualComplaint === true ? true : false;
                    nextDraft.statements = normalizeStatements(nextDraft.statements);
                    (nextDraft as any).otherEvidenceItems = normalizeOtherEvidenceItems(
                        (nextDraft as any).otherEvidenceItems,
                    );
                    nextDraft.timelineEvents = normalizeTimeline(nextDraft.timelineEvents);
                    nextDraft.investigationLogs = normalizeInvestigationLogs((nextDraft as any).investigationLogs);
                    const draftContainers = (nextDraft as any).proceduralContainers;
                    const draftLegacyPaths = (nextDraft as any).proceduralPaths;
                    nextDraft.proceduralContainers = Array.isArray(draftContainers)
                        ? normalizeProceduralContainers(draftContainers)
                        : migrateLegacyPathsToContainers(draftLegacyPaths);
                    delete (nextDraft as any).proceduralPaths;
                    nextDraft.lawyerRequests = normalizeLawyerRequests((nextDraft as any).lawyerRequests);
                    nextDraft.trials = normalizeTrialSessions((nextDraft as any).trials);
                    nextDraft.trialDepositions = normalizeTrialDepositions((nextDraft as any).trialDepositions);
                    nextDraft.location = normalizeCriminalCaseLocation(nextDraft.location);
                }

                const nextCasesById = s.casesById && typeof s.casesById === 'object' ? { ...s.casesById } : undefined;
                if (nextCasesById) {
                    Object.keys(nextCasesById).forEach((k) => {
                        const c = nextCasesById[k];
                        if (!c || typeof c !== 'object') return;
                        const defendants = Array.isArray((c as any).defendants) ? (c as any).defendants : [];
                        const complainantsRaw = Array.isArray((c as any).complainants) ? (c as any).complainants : [];
                        const complainants = complainantsRaw.map(stripLegacyComplainant);
                        const legalArticleHistory = normalizeLegalArticleHistory(c);
                        const finalDecision = normalizeFinalDecision(c);
                        const { civilClaimantDetails: _ccd, ...caseRest } = c as Record<string, unknown>;
                        nextCasesById[k] = {
                            ...caseRest,
                            location: normalizeCriminalCaseLocation((c as any).location),
                            complainants,
                            finalDecision,
                            defendants: (() => {
                                const normalizedDefendants = defendants.map((d: any) => ({
                                    ...d,
                                    fullName: resolveDefendantFullName(d),
                                    address: typeof d?.address === 'string' ? d.address : '',
                                    isJuvenile: typeof d?.isJuvenile === 'boolean' ? d.isJuvenile : false,
                                    isUnderSeven:
                                        typeof (d as any)?.isUnderSeven === 'boolean' ? (d as any).isUnderSeven : false,
                                    birthDate: typeof d?.birthDate === 'string' ? d.birthDate : '',
                                    guardianName: typeof d?.guardianName === 'string' ? d.guardianName : '',
                                    guardianRelationship: typeof d?.guardianRelationship === 'string' ? d.guardianRelationship : '',
                                    socialInquiryReport: normalizeSocialInquiryReport(d?.socialInquiryReport),
                                    totalDetentionDays: Number.isFinite(Number(d?.totalDetentionDays)) ? Number(d.totalDetentionDays) : 0,
                                    hasFelonyCourtPermit: d?.hasFelonyCourtPermit === true ? true : false,
                                    guarantorDetails: normalizeGuarantorDetails(d?.guarantorDetails),
                                    inAbsentiaDetails:
                                        d?.inAbsentiaDetails && typeof d.inAbsentiaDetails === 'object'
                                            ? (() => {
                                                  const det = d.inAbsentiaDetails as any;
                                                  const verdictDate = String(det.verdictDate ?? '').trim();
                                                  const notifiedDate = typeof det.notifiedDate === 'string' ? det.notifiedDate : '';
                                                  const objectionDeadline =
                                                      notifiedDate.trim() && typeof det.objectionDeadline === 'string'
                                                          ? String(det.objectionDeadline)
                                                          : '';
                                                  return {
                                                      verdictDate,
                                                      objectionDeadline,
                                                      isObjectionFiled: det.isObjectionFiled === true,
                                                      notifiedDate: notifiedDate.trim() ? notifiedDate : undefined,
                                                      notificationMethod:
                                                          typeof det.notificationMethod === 'string' && String(det.notificationMethod).trim()
                                                              ? String(det.notificationMethod)
                                                              : undefined,
                                                  } as InAbsentiaDetails;
                                              })()
                                            : undefined,
                                    detentionExpiryDate: typeof d?.detentionExpiryDate === 'string' ? d.detentionExpiryDate : '',
                                    detentionHistoryLog: Array.isArray(d?.detentionHistoryLog)
                                        ? d.detentionHistoryLog
                                              .map((h: any) => ({
                                                  id: String(h?.id ?? createId()),
                                                  location: String(h?.location ?? ''),
                                                  startDate: String(h?.startDate ?? ''),
                                                  endDate: typeof h?.endDate === 'string' ? h.endDate : undefined,
                                              }))
                                              .filter((h: any) => String(h.startDate ?? '').trim().length > 0)
                                        : [],
                                    seizedAssets: normalizeSeizedAssets((d as any)?.seizedAssets),
                                }));
                                const isSeveredChild = (c as any).isSeveredChild === true;
                                const hasActiveDefendant = normalizedDefendants.some(
                                    (d: any) => normalizeInvestigationDefendantStatus(d?.investigationStatus) === 'active',
                                );
                                const hasClosure = Boolean((c as any).investigationDossierClosure);
                                if (isSeveredChild && normalizedDefendants.length > 0 && !hasActiveDefendant && !hasClosure) {
                                    return normalizedDefendants.map((d: any) => ({
                                        ...d,
                                        investigationStatus: DEFAULT_INVESTIGATION_DEFENDANT_STATUS,
                                    }));
                                }
                                return normalizedDefendants;
                            })(),
                            statements: normalizeStatements((c as any).statements),
                            otherEvidenceItems: normalizeOtherEvidenceItems((c as any).otherEvidenceItems),
                            timelineEvents: (() => {
                                const stage = String((c as any).basics?.stage ?? '').trim();
                                const events = normalizeTimeline((c as any).timelineEvents);
                                if (!isInvestigationStoredStage(stage)) return events;
                                return events.map((ev) => {
                                    const { nextDate: _drop, ...rest } = ev as TimelineEvent & {
                                        nextDate?: string;
                                    };
                                    return rest as TimelineEvent;
                                });
                            })(),
                            investigationLogs: normalizeInvestigationLogs((c as any).investigationLogs),
                            proceduralContainers: (() => {
                                const raw = (c as any).proceduralContainers;
                                if (Array.isArray(raw)) return normalizeProceduralContainers(raw);
                                return migrateLegacyPathsToContainers((c as any).proceduralPaths);
                            })(),
                            proceduralCanvasAudit: normalizeProceduralCanvasAudit((c as any).proceduralCanvasAudit),
                            lawyerRequests: normalizeLawyerRequests((c as any).lawyerRequests),
                            trials: normalizeTrialSessions((c as any).trials),
                            trialDepositions: normalizeTrialDepositions((c as any).trialDepositions),
                            ...normalizeTrialChargeFieldsOnCase(c as CriminalCase),
                            trashBin: normalizeTrashBin((c as any).trashBin),
                            isFrozen: typeof (c as any).isFrozen === 'boolean' ? (c as any).isFrozen : undefined,
                            isPrejudicialPostponed:
                                typeof (c as any).isPrejudicialPostponed === 'boolean'
                                    ? (c as any).isPrejudicialPostponed
                                    : undefined,
                            isDefaultJudgmentArchived:
                                typeof (c as any).isDefaultJudgmentArchived === 'boolean'
                                    ? (c as any).isDefaultJudgmentArchived
                                    : undefined,
                            parentCaseId:
                                typeof (c as any).parentCaseId === 'string' && String((c as any).parentCaseId).trim()
                                    ? String((c as any).parentCaseId).trim()
                                    : undefined,
                            isSeveredChild: (c as any).isSeveredChild === true,
                            severanceReason: isSeveranceReasonValue(String((c as any).severanceReason ?? ''))
                                ? ((c as any).severanceReason as SeveranceReason)
                                : undefined,
                            severanceReasonDetail:
                                typeof (c as any).severanceReasonDetail === 'string' &&
                                String((c as any).severanceReasonDetail).trim()
                                    ? String((c as any).severanceReasonDetail).trim()
                                    : undefined,
                            severedAt:
                                typeof (c as any).severedAt === 'string' && String((c as any).severedAt).trim()
                                    ? String((c as any).severedAt).trim()
                                    : undefined,
                            severedChildCaseIds: Array.isArray((c as any).severedChildCaseIds)
                                ? (c as any).severedChildCaseIds
                                      .map((x: unknown) => String(x ?? '').trim())
                                      .filter((x: string) => x.length > 0)
                                : undefined,
                            verdictDate: typeof (c as any).verdictDate === 'string' ? (c as any).verdictDate : undefined,
                            isSentToCassation:
                                typeof (c as any).isSentToCassation === 'boolean' ? (c as any).isSentToCassation : undefined,
                            cassationCaseDetails:
                                (c as any).cassationCaseDetails && typeof (c as any).cassationCaseDetails === 'object'
                                    ? {
                                          cassationNumber: String((c as any).cassationCaseDetails.cassationNumber ?? ''),
                                          sentDate: String((c as any).cassationCaseDetails.sentDate ?? ''),
                                          panelName: String((c as any).cassationCaseDetails.panelName ?? ''),
                                      }
                                    : undefined,
                            isArchived: typeof (c as any).isArchived === 'boolean' ? (c as any).isArchived : undefined,
                            notes: typeof (c as any).notes === 'string' ? (c as any).notes : undefined,
                            legalArticleHistory,
                            basics: {
                                ...(c as any).basics,
                                stage: normalizeLegacyCriminalStage(
                                    String((c as any).basics?.stage ?? ''),
                                    String((c as any).basics?.crimeType ?? '') as CrimeType | '',
                                ),
                                legalArticle:
                                    legalArticleHistory.length > 0
                                        ? legalArticleHistory[legalArticleHistory.length - 1].article
                                        : String((c as any).basics?.legalArticle ?? ''),
                                ourRepresentation: normalizeOurRepresentation(
                                    String((c as any).basics?.ourRepresentation ?? ''),
                                    String((c as any).basics?.role ?? ''),
                                ),
                            },
                            isPrivateRightWaived:
                                typeof (c as any).isPrivateRightWaived === 'boolean' ? (c as any).isPrivateRightWaived : undefined,
                            waiverDate: typeof (c as any).waiverDate === 'string' ? (c as any).waiverDate : undefined,
                            physicalLocation: ((): PhysicalLocation => {
                                const incoming = String((c as any).physicalLocation ?? (c as any).physicalLocation?.key ?? '').trim();
                                const valid =
                                    incoming === 'judge_desk' ||
                                    incoming === 'investigator_room' ||
                                    incoming === 'prosecution' ||
                                    incoming === 'police_station' ||
                                    incoming === 'archive' ||
                                    incoming === 'custom';
                                if (valid) return incoming as PhysicalLocation;
                                const stage = String((c as any).basics?.stage ?? '').trim();
                                const isArchivedAny = Boolean((c as any).isArchived) || Boolean(String((c as any).mergedIntoCaseId ?? '').trim());
                                if (isArchivedAny) return 'archive';
                                if (isInvestigationStoredStage(stage)) {
                                    const at = String((c as any).location?.investigationPapersAt ?? '').trim();
                                    if (at === 'مركز شرطة') return 'police_station';
                                    return 'investigator_room';
                                }
                                return 'judge_desk';
                            })(),
                            physicalLocationCustomName:
                                typeof (c as any).physicalLocationCustomName === 'string'
                                    ? (c as any).physicalLocationCustomName
                                    : undefined,
                            isArticle3Offense: (c as any).isArticle3Offense === true ? true : undefined,
                            crimeDiscoveryDate:
                                typeof (c as any).crimeDiscoveryDate === 'string' ? String((c as any).crimeDiscoveryDate) : undefined,
                            isMutualComplaint: (c as any).isMutualComplaint === true ? true : false,
                            isPublicProsecutionComplainant:
                                (c as any).isPublicProsecutionComplainant === true ? true : undefined,
                            articleIncludesPublicRight:
                                (c as any).articleIncludesPublicRight === true ? true : undefined,
                            dossierStatus: ((): CriminalDossierStatus | undefined => {
                                const raw = String((c as any).dossierStatus ?? '').trim();
                                if (raw === 'merged' || raw === 'active') return raw;
                                const mergedInto = String((c as any).mergedIntoCaseId ?? '').trim();
                                if (mergedInto) return 'merged';
                                return 'active';
                            })(),
                            mergedCasesTexts: Array.isArray((c as any).mergedCasesTexts)
                                ? (c as any).mergedCasesTexts
                                      .map((x: unknown) => String(x ?? '').trim())
                                      .filter((x: string) => x.length > 0)
                                : undefined,
                            mergedIntoCaseId:
                                typeof (c as any).mergedIntoCaseId === 'string' && String((c as any).mergedIntoCaseId).trim()
                                    ? String((c as any).mergedIntoCaseId).trim()
                                    : undefined,
                            mergedIntoCaseNumber:
                                typeof (c as any).mergedIntoCaseNumber === 'string' &&
                                String((c as any).mergedIntoCaseNumber).trim()
                                    ? String((c as any).mergedIntoCaseNumber).trim()
                                    : undefined,
                            mergedCaseIds: resolveMergedCaseIds(c as CriminalCase),
                        };
                        nextCasesById[k] = repairUnknownDefendantCaseRecord(nextCasesById[k] as CriminalCase);
                    });
                }

                if (nextDraft) {
                    const draftDefendants = Array.isArray((nextDraft as any).defendants) ? (nextDraft as any).defendants : [];
                    (nextDraft as any).defendants = draftDefendants.map((d: any) => ({
                        ...d,
                        address: typeof d?.address === 'string' ? d.address : '',
                        isJuvenile: typeof d?.isJuvenile === 'boolean' ? d.isJuvenile : false,
                        isUnderSeven: typeof (d as any)?.isUnderSeven === 'boolean' ? (d as any).isUnderSeven : false,
                        birthDate: typeof d?.birthDate === 'string' ? d.birthDate : '',
                        guardianName: typeof d?.guardianName === 'string' ? d.guardianName : '',
                        guardianRelationship: typeof d?.guardianRelationship === 'string' ? d.guardianRelationship : '',
                        socialInquiryReport: normalizeSocialInquiryReport(d?.socialInquiryReport),
                        totalDetentionDays: Number.isFinite(Number(d?.totalDetentionDays)) ? Number(d.totalDetentionDays) : 0,
                        hasFelonyCourtPermit: d?.hasFelonyCourtPermit === true ? true : false,
                        guarantorDetails: normalizeGuarantorDetails(d?.guarantorDetails),
                        detentionExpiryDate: typeof d?.detentionExpiryDate === 'string' ? d.detentionExpiryDate : '',
                        detentionHistoryLog: Array.isArray(d?.detentionHistoryLog)
                            ? d.detentionHistoryLog
                                  .map((h: any) => ({
                                      id: String(h?.id ?? createId()),
                                      location: String(h?.location ?? ''),
                                      startDate: String(h?.startDate ?? ''),
                                      endDate: typeof h?.endDate === 'string' ? h.endDate : undefined,
                                  }))
                                  .filter((h: any) => String(h.startDate ?? '').trim().length > 0)
                            : [],
                        seizedAssets: normalizeSeizedAssets((d as any)?.seizedAssets),
                    }));
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
