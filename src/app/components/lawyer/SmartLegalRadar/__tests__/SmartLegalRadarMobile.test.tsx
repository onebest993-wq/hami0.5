import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RadarShell } from '@/app/components/lawyer/SmartLegalRadar/RadarShell';
import { RADAR_PAGE, RADAR_SCROLL } from '@/app/components/lawyer/SmartLegalRadar/radarTheme';

describe('SmartLegalRadar mobile readiness', () => {
    it('shell يستخدم dvh وscroll آمن للموبايل', () => {
        render(
            <RadarShell loading={false}>
                <div data-testid="child" />
            </RadarShell>,
        );
        const shell = screen.getByTestId('smart-legal-radar');
        expect(shell.className).toContain('min-h-[100dvh]');
        expect(RADAR_PAGE).toContain('100dvh');
        expect(RADAR_SCROLL).toContain('pb-32');
        expect(RADAR_SCROLL).toContain('overflow-y-auto');
    });
});
