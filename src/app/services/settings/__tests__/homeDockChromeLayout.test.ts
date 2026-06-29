import { describe, expect, it } from 'vitest';
import { resolveDockShellMetrics } from '@/app/services/settings/dockShellLayout';
import {
    DOCK_FLOW_END_PAD_PX,
    DOCK_SHELL_CHROME_EXTRA_PX,
    estimateDockChromeOccupiedPx,
    resolveDockChromeScrollPadPx,
    resolveDockChromeStackGapPx,
} from '@/app/services/settings/homeDockChromeLayout';

describe('homeDockChromeLayout', () => {
    it('resolveDockChromeStackGapPx returns zero', () => {
        expect(resolveDockChromeStackGapPx({ shellVisible: true })).toBe(0);
        expect(resolveDockChromeStackGapPx({ shellVisible: false })).toBe(0);
    });

    it('estimateDockChromeOccupiedPx counts shell chrome and lift', () => {
        const shell = resolveDockShellMetrics(2);
        const occupied = estimateDockChromeOccupiedPx({
            visibility: { shellVisible: true },
            shellMetrics: shell,
            stackGapPx: resolveDockChromeStackGapPx({ shellVisible: true }),
            chromeLiftPx: 8,
        });

        expect(occupied).toBe(
            DOCK_FLOW_END_PAD_PX +
                shell.rowMinHeightPx +
                shell.shellVerticalPaddingPx +
                DOCK_SHELL_CHROME_EXTRA_PX +
                8,
        );
    });

    it('estimateDockChromeOccupiedPx counts flow pad only when shell hidden', () => {
        const shell = resolveDockShellMetrics(2);
        const occupied = estimateDockChromeOccupiedPx({
            visibility: { shellVisible: false },
            shellMetrics: shell,
            stackGapPx: 0,
            chromeLiftPx: 0,
        });

        expect(occupied).toBe(DOCK_FLOW_END_PAD_PX);
    });

    it('resolveDockChromeScrollPadPx adds buffer', () => {
        expect(resolveDockChromeScrollPadPx(100)).toBe(118);
        expect(resolveDockChromeScrollPadPx(100, 4)).toBe(104);
    });
});
