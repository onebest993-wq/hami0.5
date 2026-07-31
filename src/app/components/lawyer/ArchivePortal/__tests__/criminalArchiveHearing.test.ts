import { describe, expect, it } from 'vitest';
import {
    criminalArchiveHearingFingerprint,
    resolveCriminalArchiveHearingDisplay,
} from '../utils/criminalArchiveHearing';

describe('resolveCriminalArchiveHearingDisplay', () => {
    it('shows scheduled hearing hint before any held proceedings', () => {
        const display = resolveCriminalArchiveHearingDisplay({
            basics: { stage: 'محكمة الجنح' },
            location: { nextHearingDate: '2026-08-15' },
            trials: [],
        });
        expect(display).toEqual({
            ymd: '2026-08-15',
            label: 'موعد المرافعة',
        });
    });

    it('ignores stale pending session when only location date is set', () => {
        const display = resolveCriminalArchiveHearingDisplay({
            basics: { stage: 'محكمة الجنح' },
            location: { nextHearingDate: '2026-08-15' },
            trials: [
                {
                    id: 's1',
                    sessionNumber: '1',
                    date: '2026-08-15',
                    status: 'pending',
                },
            ],
        });
        expect(display).toEqual({
            ymd: '2026-08-15',
            label: 'موعد المرافعة',
        });
    });

    it('shows next hearing after a postponed session', () => {
        const display = resolveCriminalArchiveHearingDisplay({
            basics: { stage: 'محكمة الجنايات' },
            location: { nextHearingDate: '2026-09-01' },
            trials: [
                {
                    id: 's1',
                    sessionNumber: '1',
                    status: 'postponed',
                    nextSessionDate: '2026-09-01',
                },
            ],
        });
        expect(display).toEqual({
            ymd: '2026-09-01',
            label: 'المرافعة القادمة',
            sessionNumber: 2,
        });
    });

    it('returns null for investigation stage', () => {
        expect(
            resolveCriminalArchiveHearingDisplay({
                basics: { stage: 'تحقيق' },
                location: { nextHearingDate: '2026-08-01' },
            }),
        ).toBeNull();
    });
});

describe('criminalArchiveHearingFingerprint', () => {
    it('changes when nextHearingDate updates', () => {
        const base = {
            basics: { stage: 'محكمة الجنح' },
            location: { nextHearingDate: '2026-08-01' },
            trials: [],
        };
        const a = criminalArchiveHearingFingerprint(base);
        const b = criminalArchiveHearingFingerprint({
            ...base,
            location: { nextHearingDate: '2026-09-01' },
        });
        expect(a).not.toBe(b);
    });
});
