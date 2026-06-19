import { describe, expect, it } from 'vitest';
import type { Party } from '../../LawyerShared';
import {
    classifyPartySideBucket,
    dedupeAppealThirdPartyShadows,
    dedupePartiesList,
    partitionPartiesBySide,
    partitionPartiesForHeader,
    isAbsentObjectorRole,
} from './partyRoleClassification';

function party(overrides: Partial<Party> & { name: string }): Party {
    return {
        id: overrides.id ?? overrides.name,
        name: overrides.name,
        role: overrides.role ?? '',
        side: overrides.side,
        ...overrides,
    };
}

describe('partyRoleClassification', () => {
    it('does not classify المدعى عليه as plaintiff (substring trap)', () => {
        expect(classifyPartySideBucket(party({ name: 'أحمد', role: 'المدعى عليه' }))).toBe('defendant');
        expect(classifyPartySideBucket(party({ name: 'أحمد', role: 'المدعي' }))).toBe('plaintiff');
    });

    it('classifies absent objector despite (المدعى عليه) in parentheses', () => {
        const role = 'المعترض على الحكم الغيابي (المدعى عليه)';
        expect(isAbsentObjectorRole(role)).toBe(true);
        expect(classifyPartySideBucket(party({ name: 'ب', role }))).toBe('plaintiff');
    });

    it('classifies absent objected party in defendant column', () => {
        const role = 'المعترض عليه بالحكم الغيابي (المدعي)';
        expect(classifyPartySideBucket(party({ name: 'ج', role }))).toBe('defendant');
    });

    it('splits objection stage parties into two columns', () => {
        const parties = [
            party({
                id: 1,
                name: 'ليبليب',
                role: 'المعترض على الحكم الغيابي (المدعى عليه)',
            }),
            party({
                id: 2,
                name: 'موكل',
                role: 'المعترض عليه بالحكم الغيابي (المدعي)',
            }),
        ];
        const { plaintiffs, defendants } = partitionPartiesBySide(parties);
        expect(plaintiffs).toHaveLength(1);
        expect(defendants).toHaveLength(1);
        expect(plaintiffs[0].name).toBe('ليبليب');
        expect(defendants[0].name).toBe('موكل');
    });

    it('deduplicates same id in one bucket', () => {
        const parties = [
            party({ id: 'a', name: 'ليبليب', role: 'المعترض عليه بالحكم الغيابي (المدعي)' }),
            party({ id: 'a', name: 'ليبليب', role: 'المعترض عليه بالحكم الغيابي' }),
        ];
        const { defendants } = partitionPartiesBySide(parties);
        expect(defendants).toHaveLength(1);
    });

    it('keeps same-name parties when ids differ', () => {
        const parties = [
            party({ id: 'a', name: 'ليبليب', role: 'المعترض عليه بالحكم الغيابي (المدعي)' }),
            party({ id: 'b', name: 'ليبليب', role: 'المعترض عليه بالحكم الغيابي' }),
        ];
        const { defendants } = partitionPartiesBySide(parties);
        expect(defendants).toHaveLength(2);
    });

    it('deduplicates by id', () => {
        const parties = [
            party({ id: 'x', name: 'أ', role: 'المدعي' }),
            party({ id: 'x', name: 'أ', role: 'المدعي' }),
        ];
        const { plaintiffs } = partitionPartiesBySide(parties);
        expect(plaintiffs).toHaveLength(1);
    });

    it('classifies appeal roles', () => {
        expect(classifyPartySideBucket(party({ name: 'م', role: 'المستأنف (المدعى عليه)' }))).toBe('plaintiff');
        expect(classifyPartySideBucket(party({ name: 'م', role: 'المستأنف عليه (المدعي)' }))).toBe('defendant');
    });

    it('places affiliative third party in affiliated column', () => {
        const role = 'شخص ثالث (انضمامي — جانب المدعي)';
        expect(classifyPartySideBucket(party({ name: 'ثالث', role, side: 'right' }))).toBe('plaintiff');
        const { plaintiffs, interpleaders } = partitionPartiesForHeader([
            party({ id: 1, name: 'مدعي', role: 'المدعي' }),
            party({ id: 2, name: 'مدعى', role: 'المدعى عليه' }),
            party({ id: 3, name: 'منضم', role }),
        ]);
        expect(plaintiffs).toHaveLength(2);
        expect(plaintiffs.some((p) => p.name === 'منضم')).toBe(true);
        expect(interpleaders).toHaveLength(0);
    });

    it('isolates interpleader third party in dedicated bucket at first instance', () => {
        const { interpleaders, plaintiffs } = partitionPartiesForHeader([
            party({ id: 1, name: 'مدعي', role: 'المدعي' }),
            party({ id: 2, name: 'اختصام', role: 'شخص ثالث (اختصامي)' }),
        ]);
        expect(interpleaders).toHaveLength(1);
        expect(interpleaders[0]?.name).toBe('اختصام');
        expect(plaintiffs).toHaveLength(1);
    });

    it('merges appeal-stage interpleader into appellant or appellee column', () => {
        const { plaintiffs, defendants, interpleaders } = partitionPartiesForHeader([
            party({ id: 1, name: 'مدعى', role: 'المستأنف (المدعى عليه)', side: 'right' }),
            party({
                id: 2,
                name: 'غقفغقف',
                role: 'المستأنف (شخص ثالث اختصامي)',
                side: 'right',
            }),
            party({ id: 3, name: 'مدعي', role: 'المستأنف عليه (المدعي)', side: 'left' }),
        ]);
        expect(interpleaders).toHaveLength(0);
        expect(plaintiffs.map((p) => p.name)).toEqual(['مدعى', 'غقفغقف']);
        expect(defendants.map((p) => p.name)).toEqual(['مدعي']);
    });

    it('merges appeal-stage affiliative third party into side column', () => {
        const { plaintiffs, interpleaders } = partitionPartiesForHeader([
            party({ id: 1, name: 'طاعن', role: 'المستأنف (المدعى عليه)', side: 'right' }),
            party({
                id: 2,
                name: 'منضم',
                role: 'المستأنف (شخص ثالث — انضمامي)',
                side: 'right',
            }),
        ]);
        expect(interpleaders).toHaveLength(0);
        expect(plaintiffs.map((p) => p.name)).toEqual(['طاعن', 'منضم']);
    });

    it('routes interpleader with appeal side into column instead of third bucket', () => {
        const { defendants, interpleaders } = partitionPartiesForHeader([
            party({
                id: 5,
                name: 'غقفغقف',
                role: 'شخص ثالث (اختصامي)',
                side: 'left',
            }),
        ]);
        expect(interpleaders).toHaveLength(0);
        expect(defendants.map((p) => p.name)).toEqual(['غقفغقف']);
    });

    it('drops duplicate third-party shadow when appeal role exists for same id', () => {
        const merged = dedupeAppealThirdPartyShadows([
            party({ id: 5, name: 'غقفغقف', role: 'المستأنف عليه (شخص ثالث اختصامي)', side: 'left' }),
            party({ id: 5, name: 'غقفغقف', role: 'شخص ثالث (اختصامي)' }),
        ]);
        expect(merged).toHaveLength(1);
        expect(merged[0]?.role).toContain('المستأنف عليه');
    });

    it('keeps same-name co-litigants when ids differ', () => {
        const { plaintiffs } = partitionPartiesForHeader([
            party({ id: 1, name: 'غقفغقف', role: 'المستأنف (المدعي)', side: 'right', isClient: true }),
            party({ id: 5, name: 'غقفغقف', role: 'المستأنف (شخص ثالث اختصامي)', side: 'right' }),
        ]);
        expect(plaintiffs).toHaveLength(2);
    });

    it('does not put المستأنف عليه in plaintiffs column (appeal stage)', () => {
        const parties = [
            party({ id: 1, name: 'أ', role: 'المستأنف', side: 'right' }),
            party({ id: 2, name: 'ب', role: 'المستأنف عليه', side: 'left', isClient: true }),
            party({ id: 3, name: 'ج', role: 'المستأنف عليه الثاني', side: 'left' }),
        ];
        const { plaintiffs, defendants } = partitionPartiesBySide(parties);
        expect(plaintiffs.map((p) => p.name)).toEqual(['أ']);
        expect(defendants.map((p) => p.name)).toEqual(['ب', 'ج']);
    });

    it('dedupePartiesList removes duplicate ids and prefers non-client same-name merge in header', () => {
        const merged = dedupePartiesList([
            party({ id: 1, name: 'أ', role: 'المستأنف عليه', isClient: true }),
            party({ id: 1, name: 'أ', role: 'المستأنف عليه', isClient: false }),
        ]);
        expect(merged).toHaveLength(1);
        expect(merged[0]?.isClient).toBe(false);

        const { defendants } = partitionPartiesForHeader([
            party({ id: 1, name: 'موكل', role: 'المستأنف عليه', isClient: true }),
            party({ id: 2, name: 'موكل', role: 'المستأنف عليه', isClient: false }),
        ]);
        expect(defendants).toHaveLength(2);
    });
});
