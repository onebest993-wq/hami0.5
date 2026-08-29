import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RadarShell } from '@/app/components/lawyer/SmartLegalRadar/RadarShell';
import {
    RADAR_ADD_DOCK,
    RADAR_HEADER,
    RADAR_PAGE,
    RADAR_SCROLL,
} from '@/app/components/lawyer/SmartLegalRadar/radarTheme';

describe('SmartLegalRadar mobile readiness', () => {
    it('shell يستخدم dvh وscroll آمن للموبايل', () => {
        render(
            <RadarShell>
                <div data-testid="child" />
            </RadarShell>,
        );
        const shell = screen.getByTestId('smart-legal-radar');
        expect(shell.className).toContain('min-h-[100dvh]');
        expect(RADAR_PAGE).toContain('100dvh');
        expect(RADAR_SCROLL).toContain('pb-3');
        expect(RADAR_SCROLL).toContain('overflow-y-auto');
        expect(RADAR_ADD_DOCK).toContain('hami-lawyer-header-safe-bottom');
        expect(RADAR_HEADER).toContain('hami-lawyer-header-safe-top');
        expect(RADAR_ADD_DOCK).not.toContain('5.25rem');
        expect(RADAR_ADD_DOCK).not.toContain('border-t');
    });
});
