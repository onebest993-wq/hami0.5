/**
 * Persist migrate — legal article / final decision / complainant normalizers
 */
import type { LegalArticleChange, StageConclusion } from './criminalCaseModel';
import { createCriminalId as createId } from './criminalIdUtils';
import { isStageExpirationReason } from './stageExpirationReasons';
import { asRecord, nestedRecord } from './criminalStorePersistMigrateUtils';

export function normalizePersistLegalArticleHistory(caseObj: unknown): LegalArticleChange[] {
    const rec = caseObj && typeof caseObj === 'object' ? asRecord(caseObj) : null;
    const history = rec?.legalArticleHistory;
    if (Array.isArray(history)) {
        return history
            .map((h: unknown) => {
                const row = h && typeof h === 'object' ? asRecord(h) : asRecord({});
                return {
                    id: String(row.id ?? createId()),
                    article: String(row.article ?? ''),
                    changedAtDate: String(row.changedAtDate ?? new Date().toISOString().slice(0, 10)),
                    changedBy:
                        row.changedBy === 'police' ||
                        row.changedBy === 'investigation_judge' ||
                        row.changedBy === 'trial_court'
                            ? row.changedBy
                            : 'trial_court',
                };
            })
            .filter((h) => String(h.article ?? '').trim().length > 0);
    }
    const basics = rec ? nestedRecord(rec, 'basics') : undefined;
    const legacy = String(basics?.legalArticle ?? '').trim();
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

export function normalizePersistFinalDecision(caseObj: unknown): StageConclusion | undefined {
    const rec = caseObj && typeof caseObj === 'object' ? asRecord(caseObj) : null;
    const fdRaw = rec?.finalDecision;
    if (!fdRaw || typeof fdRaw !== 'object') return undefined;
    const fd = asRecord(fdRaw);
    const stageType = String(fd.stageType ?? '');
    const decisionType = String(fd.decisionType ?? '');
    const defendantStatusAtDecision = String(fd.defendantStatusAtDecision ?? '');
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
        id: String(fd.id ?? createId()),
        stageType: stageType as StageConclusion['stageType'],
        decisionType: decisionType as StageConclusion['decisionType'],
        date: String(fd.date ?? ''),
        details: String(fd.details ?? ''),
        defendantStatusAtDecision: defendantStatusAtDecision as StageConclusion['defendantStatusAtDecision'],
        defendantIds: Array.isArray(fd.defendantIds)
            ? fd.defendantIds.map((x: unknown) => String(x ?? '').trim()).filter((x: string) => x.length > 0)
            : undefined,
        punishmentType:
            fd.punishmentType === 'death' ||
            fd.punishmentType === 'life' ||
            fd.punishmentType === 'other'
                ? fd.punishmentType
                : undefined,
        expirationReason: isStageExpirationReason(String(fd.expirationReason ?? ''))
            ? (fd.expirationReason as StageConclusion['expirationReason'])
            : undefined,
    };
}

export function stripLegacyPersistComplainant(c: unknown) {
    const src = c && typeof c === 'object' ? asRecord(c) : {};
    const { isCivilClaimant: _legacy, ...rest } = src;
    const row = c && typeof c === 'object' ? asRecord(c) : null;
    return {
        ...rest,
        isJuvenile: typeof row?.isJuvenile === 'boolean' ? row.isJuvenile : false,
        isUnderSeven: typeof row?.isUnderSeven === 'boolean' ? row.isUnderSeven : false,
        birthDate: typeof row?.birthDate === 'string' ? row.birthDate : '',
        guardianName: typeof row?.guardianName === 'string' ? row.guardianName : '',
        guardianRelationship: typeof row?.guardianRelationship === 'string' ? row.guardianRelationship : '',
    };
}

