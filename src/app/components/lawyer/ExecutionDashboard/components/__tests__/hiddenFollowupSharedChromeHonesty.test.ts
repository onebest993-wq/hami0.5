import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    HIDDEN_FOLLOWUP_LOCKED_REASON,
    HIDDEN_FOLLOWUP_PENDING_REASON,
    openHiddenFollowupSubmitOrWarn,
    resolveHiddenFollowupLockedReason,
} from '../hiddenFollowup/shared';

const root = process.cwd();
const components = path.join(
    root,
    'src/app/components/lawyer/ExecutionDashboard/components',
);

function read(rel: string): string {
    return fs.readFileSync(path.join(components, rel), 'utf8');
}

describe('hiddenFollowup shared chrome honesty', () => {
    it('يستخرج chrome/helpers مشتركة ويستخدمها كل Hidden* دون @ts-nocheck', () => {
        const sharedChrome = path.join(components, 'hiddenFollowup/shared/hiddenFollowupChrome.tsx');
        const sharedHelpers = path.join(
            components,
            'hiddenFollowup/shared/hiddenFollowupSubmitHelpers.ts',
        );
        expect(fs.existsSync(sharedChrome)).toBe(true);
        expect(fs.existsSync(sharedHelpers)).toBe(true);

        const chromeSrc = fs.readFileSync(sharedChrome, 'utf8');
        expect(chromeSrc).toContain('export function HiddenFollowupCatalogPickerButton');
        expect(chromeSrc).toContain('export function HiddenFollowupSubmitButton');
        expect(chromeSrc).toContain('export function HiddenFollowupDetailPanel');
        expect(chromeSrc).toContain('export function HiddenFollowupBackButton');

        const consumers = [
            'HiddenFollowupRequestOptions.tsx',
            'HiddenPersonalCoerciveRequestOptionsReady.tsx',
            'HiddenGuarantorRequestOptions.tsx',
            'HiddenBreakInventoryRequestOptions.tsx',
        ];
        for (const file of consumers) {
            const src = read(file);
            expect(src).not.toMatch(/^\s*\/\/\s*@ts-nocheck/m);
            expect(src).toContain("from './hiddenFollowup/shared'");
        }

        const followup = read('HiddenFollowupRequestOptions.tsx');
        expect(followup).toContain('HiddenFollowupCatalogPickerButton');
        expect(followup).toContain('HiddenFollowupEmptyState');

        const personalViews = read('HiddenPersonalCoerciveRequestViews.tsx');
        expect(personalViews).toContain('HiddenFollowupSubmitButton');
        expect(personalViews).toContain('openHiddenFollowupSubmitOrWarn');

        const guarantor = read('HiddenGuarantorRequestOptions.tsx');
        expect(guarantor).toContain('HiddenGuarantorRequestDetailPanel');
        expect(guarantor).toContain('resolveHiddenFollowupLockedReason');
        const guarantorDetail = read('HiddenGuarantorRequestDetailPanel.tsx');
        expect(guarantorDetail).toContain('HiddenFollowupDetailPanel');

        const breakInv = read('HiddenBreakInventoryRequestOptions.tsx');
        expect(breakInv).toContain('HiddenFollowupDecisionsFollowupButton');
    });

    it('resolveHiddenFollowupLockedReason + openHiddenFollowupSubmitOrWarn سلوك صحيح', () => {
        expect(resolveHiddenFollowupLockedReason(true, false)).toBe(HIDDEN_FOLLOWUP_LOCKED_REASON);
        expect(resolveHiddenFollowupLockedReason(false, true)).toBe(HIDDEN_FOLLOWUP_LOCKED_REASON);
        expect(resolveHiddenFollowupLockedReason(false, false)).toBe('');
        expect(HIDDEN_FOLLOWUP_PENDING_REASON).toContain('قيد البت');

        const toast = viToast();
        const open = { called: false };
        openHiddenFollowupSubmitOrWarn('سبب', toast.fn, () => {
            open.called = true;
        });
        expect(open.called).toBe(false);
        expect(toast.calls).toEqual([['سبب', 'warning']]);

        openHiddenFollowupSubmitOrWarn('', toast.fn, () => {
            open.called = true;
        });
        expect(open.called).toBe(true);
    });
});

describe('ExecutionDashboard @ts-nocheck batch honesty (overlays + thin hooks)', () => {
    it('أُزيل @ts-nocheck من أغلفة lazy الصغيرة مع أنواع props حقيقية', () => {
        const notes = read('ExecutionDashboardNotesOverlays.tsx');
        const solidary = read('ExecutionDashboardSolidaryEvictionOverlays.tsx');
        expect(notes).not.toMatch(/^\s*\/\/\s*@ts-nocheck/m);
        expect(solidary).not.toMatch(/^\s*\/\/\s*@ts-nocheck/m);
        expect(notes).toContain('ExecutionNotesAndAppointmentModalsProps');
        expect(solidary).toContain('ExecutionSolidaryAndEvictionFollowupModalsContainerProps');
    });

    it('أُزيل @ts-nocheck من thin core helpers الآمنة', () => {
        const core = path.join(
            root,
            'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore',
        );
        for (const file of [
            'buildExecutionDashboardCoreRuntimeVars.ts',
            'collectScopeLocalBundleInput.ts',
            'useExecutionDashboardCoreLightHandlers.ts',
        ]) {
            const src = fs.readFileSync(path.join(core, file), 'utf8');
            expect(src).not.toMatch(/^\s*\/\/\s*@ts-nocheck/m);
        }
    });
});

function viToast() {
    const calls: unknown[][] = [];
    return {
        calls,
        fn: (...args: unknown[]) => {
            calls.push(args);
        },
    };
}
