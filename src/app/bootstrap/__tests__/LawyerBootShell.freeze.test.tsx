import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { markBootRevealDone } from '@/app/bootstrap/bootReveal';
import { LawyerBootShell } from '@/app/bootstrap/LawyerBootShell';

describe('LawyerBootShell splash freeze', () => {
    beforeEach(() => {
        window.__hamiBootRevealDone__ = undefined;
        try {
            sessionStorage.removeItem('hami_boot_complete');
            sessionStorage.removeItem('hami_splash_executed');
        } catch {
            /* ignore */
        }
    });

    afterEach(() => {
        window.__hamiBootRevealDone__ = undefined;
    });

    it('يعرض شعار الإقلاع قبل اكتمال الجلسة', () => {
        render(<LawyerBootShell />);
        expect(screen.getByTestId('lawyer-boot-shell')).toBeInTheDocument();
    });

    it('بعد hami_boot_complete لا يعيد الشعار — canvas مجمّد فقط', () => {
        markBootRevealDone();
        render(<LawyerBootShell />);
        expect(screen.queryByTestId('lawyer-boot-shell')).not.toBeInTheDocument();
        expect(screen.getByTestId('lawyer-boot-shell-frozen')).toBeInTheDocument();
    });
});
