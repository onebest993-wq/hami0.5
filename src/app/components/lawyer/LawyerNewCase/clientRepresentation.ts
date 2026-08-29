import type { Party, ThirdParty } from './types';
import { getLegalRole } from '../LawyerShared';

export type ClientSide = 1 | 2;

export function resolveLawyerClientSide(
    parties1: Party[],
    parties2: Party[],
    thirdParties: ThirdParty[] = [],
): ClientSide | null {
    if (parties1.some((p) => p.isClient) || thirdParties.some((t) => t.isClient && t.affiliatedSide === 1)) {
        return 1;
    }
    if (parties2.some((p) => p.isClient) || thirdParties.some((t) => t.isClient && t.affiliatedSide === 2)) {
        return 2;
    }
    return null;
}

export function hasLawyerClientMark(
    parties1: Party[],
    parties2: Party[],
    thirdParties: ThirdParty[] = [],
): boolean {
    return (
        parties1.some((p) => p.isClient) ||
        parties2.some((p) => p.isClient) ||
        thirdParties.some((tp) => tp.isClient)
    );
}

export function resolveRepresentedPartyLabel(
    parties1: Party[],
    parties2: Party[],
    thirdParties: ThirdParty[] = [],
): 'المدعي' | 'المدعى عليه' | null {
    const side = resolveLawyerClientSide(parties1, parties2, thirdParties);
    if (side === 1) return 'المدعي';
    if (side === 2) return 'المدعى عليه';
    return null;
}

export function buildThirdPartyRoleLabel(tp: ThirdParty): string {
    if (tp.entryMode === 'interpleader') return 'شخص ثالث (اختصامي)';
    if (tp.entryMode === 'affiliative') {
        const withSide = tp.affiliatedSide === 1 ? 'انضمامي — جانب المدعي' : 'انضمامي — جانب المدعى عليه';
        return `شخص ثالث (${withSide})`;
    }
    if (tp.entryMode === 'court') return 'شخص ثالث (بقرار المحكمة)';
    if (tp.entryMode === 'opponent_request') return 'شخص ثالث (بطلب الخصم)';
    return tp.roleLabel || 'شخص ثالث';
}

export function getDefaultThirdPartyStatus(
    entryMode: ThirdParty['entryMode'],
    affiliatedSide: 1 | 2 | undefined,
    stage: string,
): string {
    if (entryMode === 'interpleader') return 'الشخص الثالث الاختصامي';
    if (entryMode === 'affiliative' && affiliatedSide) {
        const sideRole = getLegalRole(stage ?? '', affiliatedSide, 1);
        return `مدخل انضمامي — ${sideRole}`;
    }
    if (entryMode === 'court') return 'شخص ثالث (بقرار المحكمة)';
    if (entryMode === 'opponent_request') return 'شخص ثالث (بطلب الخصم)';
    return 'شخص ثالث';
}
