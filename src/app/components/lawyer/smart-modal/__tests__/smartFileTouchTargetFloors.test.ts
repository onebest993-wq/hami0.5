import { describe, expect, it } from 'vitest';
import {
    COMPACT_HUB_TRIGGER_BASE,
    COMPACT_HUB_TRIGGER_GOLD,
} from '@/app/components/lawyer/smart-modal/smartFile/compactHubTrigger';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('smart file touch target floors', () => {
    it('new-case client mark and party remove meet 44px floor', () => {
        const party = readFileSync(
            resolve(__dirname, '../../LawyerNewCase/components/PartyCard.tsx'),
            'utf8',
        );
        const personal = readFileSync(
            resolve(__dirname, '../../personal-status/PersonalStatusPartyCard.tsx'),
            'utf8',
        );
        expect(party).toContain('data-testid="lawyer-new-case-mark-client"');
        expect(party).toContain('min-h-[44px] min-w-[44px]');
        expect(personal).toContain('data-testid="lawyer-new-case-mark-client"');
        expect(personal).toContain('min-h-[44px]');
        expect(personal).not.toContain('ChevronDown');
        expect(personal).not.toContain('اسم غير مُدخل');
    });

    it('compact hub triggers meet 44px floor', () => {
        expect(COMPACT_HUB_TRIGGER_BASE).toContain('min-h-[44px]');
        expect(COMPACT_HUB_TRIGGER_GOLD).toContain('min-h-[44px]');
    });

    it('dossier header nav buttons meet 44px floor', () => {
        const src = readFileSync(
            resolve(__dirname, '../../dashboard/DossierHeaderNavButtons.tsx'),
            'utf8',
        );
        expect(src).toContain('min-h-[44px]');
        expect(src).toContain('min-w-[44px]');
        expect(src).toContain('h-11 w-11');
        expect(src).not.toMatch(/compact \? 'h-8 w-8 min-h-\[36px\]/);
        expect(src).not.toContain('inline-flex h-9 w-9 shrink-0');
    });

    it('task row actions meet 44px floor', () => {
        const src = readFileSync(resolve(__dirname, '../parts/ToDoList.tsx'), 'utf8');
        expect(src).toContain('min-h-[44px]');
        expect(src).toContain('min-w-[44px]');
        expect(src).not.toContain('min-h-[40px]');
    });

    it('smart modal close controls meet 44px floor', () => {
        const theme = readFileSync(
            resolve(__dirname, '../smartFile/smartFileModalTheme.tsx'),
            'utf8',
        );
        const moroccan = readFileSync(
            resolve(__dirname, '../smartFile/moroccanGlassShell.tsx'),
            'utf8',
        );
        expect(theme).toMatch(/closeBtn:[\s\S]*min-h-\[44px\]/);
        expect(moroccan).toContain('min-h-[44px]');
        expect(moroccan).toContain('min-w-[44px]');
    });

    it('PartyChip and contentEntry shared interactive controls meet 44px', () => {
        const chip = readFileSync(resolve(__dirname, '../smart-header/PartyChip.tsx'), 'utf8');
        const shared = readFileSync(
            resolve(__dirname, '../modals/contentEntry/shared.tsx'),
            'utf8',
        );
        expect(chip).toContain('min-h-[44px]');
        expect(shared).toContain('min-h-[44px]');
        expect(chip).not.toMatch(/h-8 w-8 items-center justify-center rounded-xl border bg-white/);
    });

    it('SmartFileMainPanel lazy-loads secondary hubs and personal body', () => {
        const host = readFileSync(resolve(__dirname, '../layout/SmartFileMainPanel.tsx'), 'utf8');
        const hubs = readFileSync(
            resolve(__dirname, '../layout/mainPanel/SmartFileWorkflowHubsSection.tsx'),
            'utf8',
        );
        const incidental = readFileSync(
            resolve(__dirname, '../layout/mainPanel/SmartFileIncidentalCasesSection.tsx'),
            'utf8',
        );
        expect(hubs).toContain('LazyToDoList');
        expect(hubs).toContain('LazyCivilLawReferenceHub');
        expect(incidental).toContain('LazyIncidentalCasesManager');
        expect(host).toContain('LazyPersonalStatusDossierBody');
        expect(host).not.toMatch(/import \{ ToDoList \} from/);
        expect(host).not.toMatch(/import \{ PersonalStatusDossierBody \}/);
        expect(hubs).not.toMatch(/import \{ ToDoList \} from/);
        expect(incidental).not.toMatch(/import \{ IncidentalCasesManager \} from/);
    });

    it('judgment modal chrome stays compact with 44px floors', () => {
        const chrome = readFileSync(
            resolve(__dirname, '../smartFile/smartModalChrome.tsx'),
            'utf8',
        );
        expect(chrome).toContain('max-w-xl');
        expect(chrome).toContain('min-h-[44px]');
        expect(chrome).toContain('max-h-[min(86dvh,34rem)]');
        expect(chrome).toContain('pb-[env(safe-area-inset-bottom)]');
        expect(chrome).not.toContain('max-h-[92vh]');
        expect(chrome).not.toContain("from-[#E6C673]/[0.06]");
        expect(chrome).not.toContain(
            'shadow-[0_8px_24px_rgba(0,0,0,0.2),0_1px_0_rgba(255,255,255,0.04)_inset]',
        );
    });

    it('JudgmentSection lazy JudicialNotification; Judgment keep-mounted', () => {
        const src = readFileSync(
            resolve(__dirname, '../layout/portal/SmartFileModalsJudgmentSection.tsx'),
            'utf8',
        );
        expect(src).toContain('LazyJudicialNotificationModal');
        expect(src).toContain('SmartJudgmentModal');
        expect(src).not.toMatch(/import \{ JudicialNotificationModal \}/);
        expect(src).toContain("import { SmartJudgmentModal } from '../../SmartJudgmentModal'");
    });

    it('SmartFileModalContent softens hot-modal prefetch (no Judgment; Flow/Admin deferred)', () => {
        const src = readFileSync(resolve(__dirname, '../SmartFileModalContent.tsx'), 'utf8');
        expect(src).toContain('scheduleSmartFileDeferredModalWarm');
        expect(src).not.toMatch(/void import\('\.\/SmartJudgmentModal'\)/);
        expect(src).toMatch(/prefetchSmartFileHotModals[\s\S]*AppealTransitionModal/);
        expect(src).toMatch(
            /scheduleSmartFileDeferredModalWarm[\s\S]*SmartFileModalsFlowSection[\s\S]*SmartFileModalsAdminSection/,
        );
    });
});
