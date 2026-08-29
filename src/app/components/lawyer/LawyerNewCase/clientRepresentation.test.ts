import { describe, expect, it } from 'vitest';
import {
    buildThirdPartyRoleLabel,
    getDefaultThirdPartyStatus,
    hasLawyerClientMark,
    resolveLawyerClientSide,
    resolveRepresentedPartyLabel,
} from './clientRepresentation';
import type { Party, ThirdParty } from './types';

const p = (side: 1 | 2, isClient: boolean): Party => ({
    id: `${side}`,
    name: 'أ',
    status: side === 1 ? 'المدعي' : 'المدعى عليه',
    isClient,
    phone: '',
    address: '',
});

describe('clientRepresentation', () => {
    it('resolves lawyer side from party flags', () => {
        expect(resolveLawyerClientSide([p(1, true)], [p(2, false)])).toBe(1);
        expect(resolveRepresentedPartyLabel([p(1, true)], [p(2, false)])).toBe('المدعي');
    });

    it('detects when no lawyer client is marked', () => {
        expect(hasLawyerClientMark([p(1, false)], [p(2, false)], [])).toBe(false);
        expect(hasLawyerClientMark([p(1, true)], [p(2, false)], [])).toBe(true);
    });

    it('third-party client on affiliative side resolves lawyer side', () => {
        const tp: ThirdParty = {
            id: 1,
            name: 'ثالث',
            status: 'مدخل انضمامي',
            address: '',
            entryMode: 'affiliative',
            affiliatedSide: 2,
            type: 'thirdParty',
            roleLabel: '',
            hasLawyer: false,
            lawyerName: '',
            lawyerPhone: '',
            isMyOffice: false,
            isClient: true,
        };
        expect(resolveLawyerClientSide([p(1, false)], [p(2, false)], [tp])).toBe(2);
        expect(resolveRepresentedPartyLabel([p(1, false)], [p(2, false)], [tp])).toBe('المدعى عليه');
        expect(hasLawyerClientMark([p(1, false)], [p(2, false)], [tp])).toBe(true);
    });
});

describe('third party labels — القضاء المدني', () => {
    it('buildThirdPartyRoleLabel for all entry modes', () => {
        expect(
            buildThirdPartyRoleLabel({ entryMode: 'interpleader', affiliatedSide: undefined } as ThirdParty),
        ).toBe('شخص ثالث (اختصامي)');
        expect(
            buildThirdPartyRoleLabel({ entryMode: 'affiliative', affiliatedSide: 1 } as ThirdParty),
        ).toContain('انضمامي — جانب المدعي');
        expect(
            buildThirdPartyRoleLabel({ entryMode: 'affiliative', affiliatedSide: 2 } as ThirdParty),
        ).toContain('انضمامي — جانب المدعى عليه');
        expect(buildThirdPartyRoleLabel({ entryMode: 'court' } as ThirdParty)).toContain('بقرار المحكمة');
        expect(buildThirdPartyRoleLabel({ entryMode: 'opponent_request' } as ThirdParty)).toContain('بطلب الخصم');
    });

    it('getDefaultThirdPartyStatus at بداءة vs استئناف', () => {
        expect(getDefaultThirdPartyStatus('interpleader', undefined, 'بداءة بدرجة أخيرة')).toBe(
            'الشخص الثالث الاختصامي',
        );
        expect(getDefaultThirdPartyStatus('affiliative', 1, 'بداءة بدرجة أخيرة')).toContain('المدعي');
        expect(getDefaultThirdPartyStatus('affiliative', 1, 'استئناف')).toContain('مستأنف');
    });
});
