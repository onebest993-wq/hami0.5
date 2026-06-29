import { makeEmptyDefendant } from './criminalDefendantFactory';
import { createCriminalId } from './criminalIdUtils';
import type {
    CriminalCaseDraft,
    CriminalCaseLocation,
    CriminalComplainant,
    InvestigationPapersAt,
    SocialInquiryReport,
    SocialInquiryWorkflowStatus,
} from './criminalCaseModel';
import { sanitizeCaseReferenceField } from './criminalCaseReferenceUtils';
import { isValidSocialInquiryWorkflowStatus } from './criminalStageUtils';

export function makeEmptyComplainant(): CriminalComplainant {
    return {
        id: createCriminalId(),
        fullName: '',
        address: '',
        phone: '',
        isJuvenile: false,
        isUnderSeven: false,
        birthDate: '',
        guardianName: '',
        guardianRelationship: '',
    };
}

/** يُطبَّق عند حفظ الإضبارة من مسودّة الإنشاء — لا يغيّر سلوك الدعوى المتقابلة في لوحة الإضبارة. */
export function finalizeDraftComplainantsCounterComplaint(
    complainants: CriminalComplainant[],
    defendantIds: string[],
): CriminalComplainant[] {
    const validDef = new Set(defendantIds.map((id) => String(id ?? '').trim()).filter(Boolean));
    const complainantIdSet = new Set(complainants.map((c) => c.id));
    const validParty = new Set([...validDef, ...complainantIdSet]);

    const accusedComplainantIds = new Set<string>();

    const mapped = complainants.map((c) => {
        const raw = c.counterComplaintTargetDefendantIds;
        if (raw === undefined) {
            const { counterComplaintTargetDefendantIds: _drop, ...rest } = c;
            return { ...rest, isCrossComplaint: false };
        }
        const filtered = (Array.isArray(raw) ? raw : [])
            .map((id) => String(id ?? '').trim())
            .filter((id) => validParty.has(id));
        if (!filtered.length) {
            const { counterComplaintTargetDefendantIds: _drop, ...rest } = c;
            return { ...rest, isCrossComplaint: false };
        }
        for (const tid of filtered) {
            if (tid !== c.id && complainantIdSet.has(tid)) {
                accusedComplainantIds.add(tid);
            }
        }
        return {
            ...c,
            isCrossComplaint: true,
            counterComplaintTargetDefendantIds: filtered,
        };
    });

    return mapped.map((c) =>
        accusedComplainantIds.has(c.id) ? { ...c, isCrossComplaint: true } : c,
    );
}

export function makeEmptyLocation(): CriminalCaseLocation {
    return {
        investigationCourtName: '',
        investigationPapersAt: '',
        policeStationName: '',
        baseRegisterNumberAndDate: '',
        investigationOfficeName: '',
        investigationDossierNumber: '',
        courtName: '',
        caseNumber: '',
        publicProsecutionNumber: '',
        trialJudgeName: '',
        nextHearingDate: '',
    };
}

export function normalizeCriminalCaseLocation(raw: unknown): CriminalCaseLocation {
    const base = makeEmptyLocation();
    if (!raw || typeof raw !== 'object') return base;
    const r = raw as Partial<CriminalCaseLocation>;
    return {
        investigationCourtName: String(r.investigationCourtName ?? ''),
        investigationPapersAt: (r.investigationPapersAt ?? '') as InvestigationPapersAt,
        policeStationName: String(r.policeStationName ?? ''),
        baseRegisterNumberAndDate: sanitizeCaseReferenceField(r.baseRegisterNumberAndDate),
        investigationOfficeName: String(r.investigationOfficeName ?? ''),
        investigationDossierNumber: sanitizeCaseReferenceField(r.investigationDossierNumber),
        courtName: String(r.courtName ?? ''),
        caseNumber: sanitizeCaseReferenceField(r.caseNumber),
        publicProsecutionNumber: String(r.publicProsecutionNumber ?? ''),
        trialJudgeName: String(r.trialJudgeName ?? ''),
        nextHearingDate: String(r.nextHearingDate ?? ''),
    };
}

export function makeInitialDraft(): CriminalCaseDraft {
    return {
        basics: {
            role: '',
            ourRepresentation: '',
            stage: '',
            legalArticle: '',
            crimeType: '',
        },
        location: makeEmptyLocation(),
        complainants: [makeEmptyComplainant()],
        unknownDefendant: false,
        defendants: [makeEmptyDefendant()],
        statements: [],
        otherEvidenceItems: [],
        timelineEvents: [],
        investigationLogs: [],
        proceduralContainers: [],
        proceduralCanvasAudit: [],
        lawyerRequests: [],
        trials: [],
        trialDepositions: [],
        physicalLocation: 'custom',
        physicalLocationCustomName: '',
        isArticle3Offense: false,
        crimeDiscoveryDate: '',
        isMutualComplaint: false,
        isPublicProsecutionComplainant: false,
        articleIncludesPublicRight: false,
    };
}

export function normalizeSocialInquiryReport(raw: unknown): SocialInquiryReport | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const r = raw as Record<string, unknown>;
    const isAttached = r.isAttached === true;
    const wsRaw = String(r.workflowStatus ?? '').trim();
    const workflowStatus: SocialInquiryWorkflowStatus = isValidSocialInquiryWorkflowStatus(wsRaw)
        ? wsRaw
        : isAttached
          ? 'submitted'
          : 'not_requested';
    const receivedDate = typeof r.receivedDate === 'string' ? String(r.receivedDate) : '';
    const investigatorName = typeof r.investigatorName === 'string' ? String(r.investigatorName) : '';
    const recommendations = typeof r.recommendations === 'string' ? String(r.recommendations) : '';
    return {
        workflowStatus,
        isAttached: workflowStatus === 'submitted' || isAttached,
        receivedDate: receivedDate.trim() ? receivedDate : undefined,
        investigatorName: investigatorName.trim() ? investigatorName : undefined,
        recommendations: recommendations.trim() ? recommendations : undefined,
    };
}
