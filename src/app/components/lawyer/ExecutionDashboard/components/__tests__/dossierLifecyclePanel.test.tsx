import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DossierLifecyclePanel } from '../DossierLifecyclePanel';
import { dossierLifecycleLabelAr } from '../../helpers/dossierLifecycleUtils';

describe('DossierLifecyclePanel', () => {
    it('renders from the trigger ref when pop style is not ready yet', () => {
        Object.defineProperty(document.documentElement, 'clientWidth', {
            configurable: true,
            value: 390,
        });

        const trigger = document.createElement('div');
        Object.defineProperty(trigger, 'getBoundingClientRect', {
            configurable: true,
            value: () => ({
                x: 0,
                y: 0,
                top: 24,
                left: 16,
                right: 280,
                bottom: 64,
                width: 264,
                height: 40,
                toJSON: () => ({}),
            }),
        });
        document.body.appendChild(trigger);

        const handlePick = vi.fn();

        render(
            <DossierLifecyclePanel
                dossierLifecyclePanelOpen
                dossierLifecyclePopStyle={null}
                dossierLifecyclePanelPhase="menu"
                setDossierLifecyclePanelPhase={vi.fn()}
                dossierStatusDraft="active"
                dossierPendingStatus={null}
                setDossierPendingStatus={vi.fn()}
                dossierReasonDraft=""
                setDossierReasonDraft={vi.fn()}
                dossierDateDraft=""
                setDossierDateDraft={vi.fn()}
                dossierLifecycleLabelAr={dossierLifecycleLabelAr}
                handleDossierLifecyclePick={handlePick}
                handleDossierLifecycleConfirmDetails={vi.fn()}
                dossierLifecyclePanelPortalRef={React.createRef<HTMLDivElement>()}
                dossierLifecyclePopoverRef={{
                    current: trigger,
                }}
            />,
        );

        expect(screen.getByRole('dialog', { name: 'حالة الإضبارة' })).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /متوقفة/i }));

        expect(handlePick).toHaveBeenCalledWith('paused');
    });

    it('focuses the reason textarea and commits local drafts on confirm without per-keystroke parent churn', () => {
        const trigger = document.createElement('div');
        Object.defineProperty(trigger, 'getBoundingClientRect', {
            configurable: true,
            value: () => ({
                x: 0,
                y: 0,
                top: 24,
                left: 16,
                right: 280,
                bottom: 64,
                width: 264,
                height: 40,
                toJSON: () => ({}),
            }),
        });
        document.body.appendChild(trigger);

        const setReasonDraft = vi.fn();
        const setDateDraft = vi.fn();
        const handleConfirm = vi.fn();

        render(
            <DossierLifecyclePanel
                dossierLifecyclePanelOpen
                dossierLifecyclePopStyle={null}
                dossierLifecyclePanelPhase="details"
                setDossierLifecyclePanelPhase={vi.fn()}
                dossierStatusDraft="paused"
                dossierPendingStatus="paused"
                setDossierPendingStatus={vi.fn()}
                dossierReasonDraft=""
                setDossierReasonDraft={setReasonDraft}
                dossierDateDraft=""
                setDossierDateDraft={setDateDraft}
                dossierLifecycleLabelAr={dossierLifecycleLabelAr}
                handleDossierLifecyclePick={vi.fn()}
                handleDossierLifecycleConfirmDetails={handleConfirm}
                dossierLifecyclePanelPortalRef={React.createRef<HTMLDivElement>()}
                dossierLifecyclePopoverRef={{
                    current: trigger,
                }}
            />,
        );

        const textarea = screen.getByRole('textbox', { name: 'السبب' });
        const dateInput = screen.getByLabelText('التاريخ');

        expect(document.activeElement).toBe(textarea);

        fireEvent.change(textarea, { target: { value: 'سبب تجريبي' } });
        fireEvent.change(dateInput, { target: { value: '2026-07-10' } });

        expect(setReasonDraft).not.toHaveBeenCalled();
        expect(setDateDraft).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: /اعتماد وتسجيل في السجل الزمني/i }));

        expect(setReasonDraft).toHaveBeenCalledWith('سبب تجريبي');
        expect(setDateDraft).toHaveBeenCalledWith('2026-07-10');
        expect(handleConfirm).toHaveBeenCalledWith('سبب تجريبي', '2026-07-10');
    });
});
