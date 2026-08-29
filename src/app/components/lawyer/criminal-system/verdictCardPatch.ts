import type {
    VerdictCard,
    VerdictCardDisplayRow,
    VerdictCorrectionAppealTrack,
    VerdictInterventionAppealTrack,
    VerdictOrdinaryAppealTrack,
} from './verdictCardTypes';

export type { VerdictCardDisplayRow };

export function sortVerdictCardsDesc(cards: VerdictCard[]): VerdictCard[] {
    return [...cards].sort((a, b) => {
        const ta = Date.parse(String(a.issuedAt ?? ''));
        const tb = Date.parse(String(b.issuedAt ?? ''));
        return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });
}

/** بطاقة مستقلة لكل متهم عند تعدد المعنيين — مع الإبقاء على معرّف البطاقة الأصلي للتحديث. */
export function expandVerdictCardsForDisplay(
    cards: VerdictCard[],
    resolveDefendantName: (defendantId: string) => string,
): VerdictCardDisplayRow[] {
    const out: VerdictCardDisplayRow[] = [];
    for (const card of sortVerdictCardsDesc(cards)) {
        const ids = Array.isArray(card.defendantIds)
            ? card.defendantIds.map((x) => String(x ?? '').trim()).filter(Boolean)
            : [];
        if (ids.length <= 1) {
            const onlyId = ids[0];
            out.push({
                ...card,
                sourceCardId: card.id,
                displayDefendantId: onlyId,
                displayDefendantName: onlyId ? resolveDefendantName(onlyId) : undefined,
                defendantIds: onlyId ? [onlyId] : ids,
            });
            continue;
        }
        for (const defendantId of ids) {
            out.push({
                ...card,
                id: `${card.id}::${defendantId}`,
                sourceCardId: card.id,
                displayDefendantId: defendantId,
                displayDefendantName: resolveDefendantName(defendantId),
                defendantIds: [defendantId],
            });
        }
    }
    return out;
}

export function patchVerdictCardInList(
    cards: VerdictCard[],
    cardId: string,
    patch: Partial<VerdictCard>,
): VerdictCard[] {
    const id = String(cardId ?? '').trim();
    if (!id) return cards;
    return cards.map((c) => (c.id === id ? { ...c, ...patch } : c));
}

export function mergeOrdinaryAppealTrack(
    current: VerdictOrdinaryAppealTrack | undefined,
    patch: Partial<VerdictOrdinaryAppealTrack>,
): VerdictOrdinaryAppealTrack {
    return { ...(current ?? {}), ...patch };
}

export function mergeInterventionAppealTrack(
    current: VerdictInterventionAppealTrack | undefined,
    patch: Partial<VerdictInterventionAppealTrack>,
): VerdictInterventionAppealTrack {
    return { ...(current ?? {}), ...patch };
}

export function mergeCorrectionAppealTrack(
    current: VerdictCorrectionAppealTrack | undefined,
    patch: Partial<VerdictCorrectionAppealTrack>,
): VerdictCorrectionAppealTrack {
    return { ...(current ?? {}), ...patch };
}
