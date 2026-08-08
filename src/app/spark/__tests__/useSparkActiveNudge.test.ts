import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSparkActiveNudge, useSparkActiveNudgeFromQueue } from '@/app/spark/ui/useSparkActiveNudge';
import type { SparkNudge } from '@/app/spark/types';
import { resetSparkPreferences } from '@/app/spark/memory/sparkPreferenceStore';

const sampleNudge = (dossierKey: string): SparkNudge => ({
    id: `${dossierKey}:test`,
    kind: 'lawsuit.absent_notification_missing',
    surface: 'lawsuit',
    priority: 10,
    message: 'تنبيه اختباري',
    presence: { present: ['موجود'], missing: ['غير مسجّل'] },
    source: 'test',
    dossierKey,
});

describe('useSparkActiveNudge', () => {
    beforeEach(() => {
        resetSparkPreferences();
    });

    it('يعيد الضبط عند تغيير dossierKey بعد الإخفاء', () => {
        const { result, rerender } = renderHook(
            ({ dossierKey, active }) => useSparkActiveNudge({ dossierKey, active }),
            {
                initialProps: {
                    dossierKey: 'dossier-a',
                    active: sampleNudge('dossier-a'),
                },
            },
        );

        expect(result.current.nudge?.id).toBe('dossier-a:test');

        act(() => {
            result.current.hideAfterFollow();
        });
        expect(result.current.nudge).toBeNull();

        rerender({
            dossierKey: 'dossier-b',
            active: sampleNudge('dossier-b'),
        });
        expect(result.current.nudge?.id).toBe('dossier-b:test');
    });

    it('يخفي التنبيه بعد dismiss', () => {
        const { result } = renderHook(() =>
            useSparkActiveNudge({
                dossierKey: 'dossier-x',
                active: sampleNudge('dossier-x'),
            }),
        );

        act(() => {
            result.current.handleDismiss();
        });
        expect(result.current.nudge).toBeNull();
    });
});

describe('useSparkActiveNudgeFromQueue', () => {
    beforeEach(() => {
        resetSparkPreferences();
    });

    const queueNudge = (id: string, dossierKey: string): SparkNudge => ({
        ...sampleNudge(dossierKey),
        id,
        kind: 'execution.debtor_unnotified',
        surface: 'execution',
    });

    it('ينتقل للتنبيه التالي بعد dismiss', () => {
        const queue = [
            queueNudge('n1', 'execution:1'),
            queueNudge('n2', 'execution:1'),
        ];
        const { result } = renderHook(() =>
            useSparkActiveNudgeFromQueue({ dossierKey: 'execution:1', queue }),
        );

        expect(result.current.nudge?.id).toBe('n1');
        act(() => {
            result.current.handleDismiss();
        });
        expect(result.current.nudge?.id).toBe('n2');
        expect(result.current.visibleQueue).toHaveLength(1);
    });
});
