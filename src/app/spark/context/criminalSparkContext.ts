import type { VerdictCard } from '@/app/components/lawyer/criminal-system/verdictCardsEngine';
import type { SparkJurisdiction } from '@/app/spark/types';
import { resolveCriminalMandatoryCassationFromRecord } from '@/app/spark/context/resolveCriminalMandatoryCassation';

export type CriminalSparkContext = {
    dossierKey: string;
    caseId: string;
    jurisdiction: Extract<SparkJurisdiction, 'criminal'>;
    isArchived: boolean;
    shouldShowArticle3DeadlineBanner: boolean;
    article3ElapsedDays: number | null;
    shouldShowMandatoryCassationBanner?: boolean;
    verdictCards: VerdictCard[];
};

function latestAbsentiaCard(cards: VerdictCard[]): VerdictCard | null {
    for (let i = cards.length - 1; i >= 0; i -= 1) {
        const card = cards[i];
        if (card?.presenceType === 'غيابي' && !card.absentiaTreatedAsInPerson) return card;
    }
    return null;
}

export function buildCriminalSparkContext(params: {
    caseId: string;
    caseNumber?: string;
    isArchived?: boolean;
    shouldShowArticle3DeadlineBanner?: boolean;
    article3ElapsedDays?: number | null;
    shouldShowMandatoryCassationBanner?: boolean;
    verdictCards?: VerdictCard[];
}): CriminalSparkContext {
    const caseId = String(params.caseId);
    const caseNumber = String(params.caseNumber ?? '').trim();
    const dossierKey = caseNumber ? `criminal:${caseNumber}` : `criminal:${caseId}`;

    return {
        dossierKey,
        caseId,
        jurisdiction: 'criminal',
        isArchived: Boolean(params.isArchived),
        shouldShowArticle3DeadlineBanner: Boolean(params.shouldShowArticle3DeadlineBanner),
        article3ElapsedDays: params.article3ElapsedDays ?? null,
        shouldShowMandatoryCassationBanner: Boolean(params.shouldShowMandatoryCassationBanner),
        verdictCards: params.verdictCards ?? [],
    };
}

export function buildCriminalSparkContextFromArchiveRecord(
    record: Record<string, unknown>,
): CriminalSparkContext | null {
    const caseId = String(record.id ?? '').trim();
    if (!caseId) return null;

    const basics =
        record.basics && typeof record.basics === 'object'
            ? (record.basics as Record<string, unknown>)
            : {};
    const caseNumber = String(basics.caseNumber ?? basics.dossierNumber ?? record.caseNumber ?? '').trim();
    const isArticle3Offense = basics.isArticle3Offense === true || record.isArticle3Offense === true;
    const crimeDiscoveryDate = String(basics.crimeDiscoveryDate ?? record.crimeDiscoveryDate ?? '').trim();
    let article3ElapsedDays: number | null = null;
    if (isArticle3Offense) {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(crimeDiscoveryDate);
        if (m) {
            const startMs = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
            const now = new Date();
            const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
            if (todayMs >= startMs) {
                article3ElapsedDays = Math.floor((todayMs - startMs) / (24 * 60 * 60 * 1000));
            }
        }
    }

    const verdictCards = Array.isArray(record.verdictCards)
        ? (record.verdictCards as VerdictCard[])
        : [];

    return buildCriminalSparkContext({
        caseId,
        caseNumber,
        isArchived: String(record.lifecycle ?? record.status ?? '').includes('archived'),
        shouldShowArticle3DeadlineBanner:
            isArticle3Offense && typeof article3ElapsedDays === 'number' && article3ElapsedDays > 90,
        article3ElapsedDays,
        shouldShowMandatoryCassationBanner: resolveCriminalMandatoryCassationFromRecord(record),
        verdictCards,
    });
}

export { latestAbsentiaCard };
