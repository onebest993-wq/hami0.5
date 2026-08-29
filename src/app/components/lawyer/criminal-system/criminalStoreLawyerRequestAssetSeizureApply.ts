/**
 * تطبيق حجز الأموال عند إنشاء قرار قضائي — مُستخرَج من criminalStoreLawyerRequestActions.ts
 */
import type { CriminalCase, LawyerRequest, TimelineEvent } from './criminalCaseModel';
import type { SeizedAsset } from './criminalSeizedAssetModel';
import { createCriminalId as createId } from './criminalIdUtils';

type AssetSeizurePerDefendant = {
    defendantId: string;
    assets: SeizedAsset[];
};

export function applyAssetSeizureFromJudicialRequest(
    nextCase: CriminalCase,
    stamped: LawyerRequest,
    assetSeizurePayload: { perDefendant: AssetSeizurePerDefendant[] },
): CriminalCase {
    const caseIsMutual = (nextCase as { isMutualComplaint?: boolean }).isMutualComplaint === true;
    const defendantsArr = Array.isArray(nextCase.defendants) ? nextCase.defendants : [];
    const complainantsArr = Array.isArray(nextCase.complainants) ? nextCase.complainants : [];
    const seizureEvents: TimelineEvent[] = [];
    const stampToday = new Date().toISOString().slice(0, 10);

    const updatedDefendants = defendantsArr.map((d) => {
        const entry = assetSeizurePayload.perDefendant.find((p) => p.defendantId === d.id);
        if (!entry) return d;
        if (d.status !== 'هارب') return d;
        const stamp = entry.assets.map((a) => ({ ...a, sourceRequestId: stamped.id }));
        const prevAssets = Array.isArray(d.seizedAssets) ? d.seizedAssets : [];
        seizureEvents.push({
            id: createId(),
            date: stampToday,
            type: 'decision',
            category: 'حجز الأموال',
            title: `حجز أموال على المتهم الهارب: ${String(d.fullName ?? '').trim() || '—'}`,
            description: stamp.map((a) => `• ${a.description}`).join('\n'),
            defendantIds: [d.id],
        });
        return { ...d, seizedAssets: [...prevAssets, ...stamp] };
    });

    const updatedComplainants = complainantsArr.map((c) => {
        const entry = assetSeizurePayload.perDefendant.find((p) => p.defendantId === c.id);
        if (!entry) return c;
        const isAccused =
            caseIsMutual || (c as { isCrossComplaint?: boolean }).isCrossComplaint === true;
        if (!isAccused) return c;
        if ((c as { accusedStatus?: string }).accusedStatus !== 'هارب') return c;
        const stamp = entry.assets.map((a) => ({ ...a, sourceRequestId: stamped.id }));
        const prevAssets = Array.isArray(
            (c as { accusedSeizedAssets?: SeizedAsset[] }).accusedSeizedAssets,
        )
            ? ((c as { accusedSeizedAssets?: SeizedAsset[] }).accusedSeizedAssets as SeizedAsset[])
            : [];
        seizureEvents.push({
            id: createId(),
            date: stampToday,
            type: 'decision',
            category: 'حجز الأموال (شكوى متقابلة)',
            title: `حجز أموال على المشتكي الهارب: ${String(c.fullName ?? '').trim() || '—'}`,
            description: stamp.map((a) => `• ${a.description}`).join('\n'),
            complainantIds: [c.id],
        });
        return { ...c, accusedSeizedAssets: [...prevAssets, ...stamp] };
    });

    const prevEvents = Array.isArray(nextCase.timelineEvents) ? nextCase.timelineEvents : [];
    return {
        ...nextCase,
        defendants: updatedDefendants,
        complainants: updatedComplainants,
        timelineEvents: seizureEvents.length ? [...prevEvents, ...seizureEvents] : prevEvents,
    };
}
