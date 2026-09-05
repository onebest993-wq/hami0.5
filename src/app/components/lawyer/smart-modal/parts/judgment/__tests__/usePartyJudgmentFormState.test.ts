import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePartyJudgmentFormState } from '../usePartyJudgmentFormState';

const FOUR = [
    { id: 1, name: 'أحمد', role: 'مدعي', isClient: true },
    { id: 2, name: 'سامي', role: 'مدعى عليه' },
    { id: 3, name: 'كريم', role: 'مدعى عليه' },
    { id: 4, name: 'نادر', role: 'مدعى عليه' },
    { id: 5, name: 'هيثم', role: 'مدعى عليه' },
    { id: 6, name: 'زيد', role: 'شخص ثالث اختصامي' },
];

describe('usePartyJudgmentFormState — تعدد المدعى عليهم', () => {
    it('يستبعد الاختصامي ويبذر أربعة صفوف حضورياً', () => {
        const { result } = renderHook(() =>
            usePartyJudgmentFormState({
                isOpen: true,
                parties: FOUR,
                docType: 'مطالبة بدين',
            }),
        );
        expect(result.current.multiDefendant).toBe(true);
        expect(result.current.defendants.map((p) => Number(p.id))).toEqual([2, 3, 4, 5]);
        expect(result.current.judgmentForm).toBe('حضوري');
        expect(result.current.dispositions).toHaveLength(4);
        expect(result.current.disputeIntegrity).toBe('indivisible');
    });

    it('يقترح عدم التجزئة دائماً ويُحوّل الصف إلى مختلط عند غيابي واحد', () => {
        const { result } = renderHook(() =>
            usePartyJudgmentFormState({
                isOpen: true,
                parties: FOUR,
                docType: 'إزالة شيوع',
            }),
        );
        expect(result.current.disputeIntegrity).toBe('indivisible');
        act(() => {
            result.current.setPartyForm('5', 'غيابي');
        });
        expect(result.current.judgmentForm).toBe('مختلط');
        expect(result.current.dispositions.find((row) => row.partyId === '5')?.form).toBe('غيابي');
        expect(result.current.dispositions.filter((row) => row.form === 'حضوري')).toHaveLength(3);
    });

    it('تعميم غيابي على الجميع ثم طرف واحد حضوري يبقى مختلطاً', () => {
        const { result } = renderHook(() =>
            usePartyJudgmentFormState({
                isOpen: true,
                parties: FOUR,
                docType: 'مطالبة بدين',
            }),
        );
        act(() => {
            result.current.setUniformForm('غيابي');
        });
        expect(result.current.judgmentForm).toBe('غيابي');
        expect(result.current.dispositions.every((row) => row.form === 'غيابي')).toBe(true);
        act(() => {
            result.current.setPartyForm('2', 'حضوري');
        });
        expect(result.current.judgmentForm).toBe('مختلط');
    });

    it('يحوّل بمثابة الحضوري إلى حضوري عند الاختيار', () => {
        const { result } = renderHook(() =>
            usePartyJudgmentFormState({
                isOpen: true,
                parties: FOUR,
                docType: 'مطالبة بدين',
            }),
        );
        act(() => {
            result.current.setPartyForm('2', 'بمثابة الحضوري');
            result.current.setPartyForm('3', 'غيابي');
        });
        expect(result.current.judgmentForm).toBe('مختلط');
        expect(result.current.dispositions.find((row) => row.partyId === '2')?.form).toBe(
            'حضوري',
        );
    });

    it('مدعى عليه واحد: ليست قائمة متعددة', () => {
        const { result } = renderHook(() =>
            usePartyJudgmentFormState({
                isOpen: true,
                parties: [
                    { id: 1, role: 'مدعي' },
                    { id: 2, role: 'مدعى عليه' },
                ],
            }),
        );
        expect(result.current.multiDefendant).toBe(false);
        expect(result.current.defendants).toHaveLength(1);
    });

    it('يرد بحق طرف ويبقي الآخرين ملزَمين', () => {
        const { result } = renderHook(() =>
            usePartyJudgmentFormState({
                isOpen: true,
                parties: FOUR,
                docType: 'مطالبة بدين',
            }),
        );
        act(() => {
            result.current.setPartyOperative('3', 'released');
        });
        expect(result.current.dispositions.find((row) => row.partyId === '3')?.operative).toBe(
            'released',
        );
        expect(
            result.current.dispositions.filter((row) => (row.operative ?? 'bound') === 'bound'),
        ).toHaveLength(3);
        act(() => {
            result.current.setUniformOperative('released');
        });
        expect(result.current.dispositions.every((row) => row.operative === 'released')).toBe(true);
    });
});
