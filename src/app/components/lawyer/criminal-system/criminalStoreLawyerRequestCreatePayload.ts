/**
 * بناء حمولات إنشاء طلب المحامي — مُستخرَج من criminalStoreLawyerRequestActions.ts
 */
import type { GuarantorPerson } from './criminalGuarantorModel';
import type { SeizedAsset } from './criminalSeizedAssetModel';
import { createCriminalId as createId } from './criminalIdUtils';

type DefendantBailInput = {
    kind?: string;
    bailAmount?: string;
    guarantors?: Array<{ id?: string; fullName?: string }>;
};

type AssetSeizureInput = {
    perDefendant?: Array<{
        defendantId?: string;
        assets?: Array<{
            description?: string;
            referenceNumber?: string;
            seizureDate?: string;
            notes?: string;
        }>;
    }>;
};

export function buildDefendantBailPayload(b: DefendantBailInput | undefined) {
    if (!b || (b.kind !== 'financial' && b.kind !== 'personal')) return undefined;
    if (b.kind === 'financial') {
        const amt = String(b.bailAmount ?? '').trim();
        if (!amt) return undefined;
        return { kind: 'financial' as const, bailAmount: amt };
    }
    const list = Array.isArray(b.guarantors) ? b.guarantors : [];
    const guarantors: GuarantorPerson[] = list
        .map((g, i) => ({
            id: String(g?.id ?? '').trim() || `g_${Date.now()}_${i}`,
            fullName: String(g?.fullName ?? '').trim(),
        }))
        .filter((g) => g.fullName.length > 0);
    if (guarantors.length === 0) return undefined;
    return { kind: 'personal' as const, guarantors };
}

export function buildAssetSeizurePayload(s: AssetSeizureInput | undefined) {
    if (!s || !Array.isArray(s.perDefendant) || s.perDefendant.length === 0) return undefined;
    const cleaned = s.perDefendant
        .map((entry) => {
            const did = String(entry?.defendantId ?? '').trim();
            if (!did) return null;
            const assets: SeizedAsset[] = (Array.isArray(entry?.assets) ? entry.assets : [])
                .map((a, i) => {
                    const description = String(a?.description ?? '').trim();
                    if (!description) return null;
                    const out: SeizedAsset = {
                        id: `${createId()}_${i}`,
                        description,
                        createdAt: new Date().toISOString(),
                    };
                    const ref = String(a?.referenceNumber ?? '').trim();
                    if (ref) out.referenceNumber = ref;
                    const dt = String(a?.seizureDate ?? '').trim();
                    if (dt) out.seizureDate = dt;
                    const notes = String(a?.notes ?? '').trim();
                    if (notes) out.notes = notes;
                    return out;
                })
                .filter((x): x is SeizedAsset => x !== null);
            if (!assets.length) return null;
            return { defendantId: did, assets };
        })
        .filter((x): x is { defendantId: string; assets: SeizedAsset[] } => x !== null);
    if (!cleaned.length) return undefined;
    return { perDefendant: cleaned };
}
