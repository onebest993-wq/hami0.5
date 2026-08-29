import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = path.join(process.cwd(), 'src/app/components/lawyer/personal-status');

function read(name: string): string {
    return fs.readFileSync(path.join(root, name), 'utf8');
}

describe('personal-status structural closure', () => {
    it('PersonalStatusDossierBody has no @ts-nocheck and uses derived flags helper', () => {
        const body = read('PersonalStatusDossierBody.tsx');
        expect(body).not.toContain('@ts-nocheck');
        expect(body).toContain('derivePersonalStatusDossierFlags');
        expect(body).toContain('PersonalStatusDossierPanel');
        // لا stub لـ incidental modal في الأحوال الشخصية — الحقل ميت ولم يُستخدم
        expect(body).not.toContain('setShowIncidentalModal');
    });

    it('PersonalStatusSmartFileChrome hides edit/trash when viewing archived', () => {
        const chrome = read('PersonalStatusSmartFileChrome.tsx');
        expect(chrome).toContain('isViewingArchived');
        expect(chrome).toContain('أرشيف');
        expect(chrome).toContain('showStageRail');
        expect(chrome).toContain('iconOnly');
    });

    /*
     * كان الفحص يقرأ `PersonalStatusActionDock.tsx`. انتقل تركيب بوّابة المرجع
     * القانوني إلى `PersonalStatusWorkToolbar`، وبقي الـdock بلا مستورد فحُذف.
     * الفحص يتبع الموضع الحيّ لا الاسم القديم.
     */
    it('dead PersonalStatusLawReferenceHub removed — law ref via WorkToolbar portal', () => {
        expect(fs.existsSync(path.join(root, 'PersonalStatusLawReferenceHub.tsx'))).toBe(false);
        expect(fs.existsSync(path.join(root, 'PersonalStatusActionDock.tsx'))).toBe(false);
        expect(fs.existsSync(path.join(root, 'PersonalStatusMoroccanGlass.tsx'))).toBe(false);
        const toolbar = read('PersonalStatusWorkToolbar.tsx');
        expect(toolbar).toContain('PersonalStatusLawReferencePortal');
        expect(toolbar).not.toContain('onClick={() => {}}');
        expect(toolbar).not.toContain('label="سير"');
        const requests = read('PersonalStatusRequestsSection.tsx');
        expect(requests).not.toContain('Sparkles');
        expect(requests).toContain('لا توجد طلبات معلقة');
        expect(requests).not.toContain('لا طلبات مسجّلة');
        const identity = read('PersonalStatusIdentityFolio.tsx');
        const lazy = read('personalStatusDossierLazy.ts');
        expect(lazy).toContain('LazyPersonalStatusDossierSurface');
        expect(lazy).toContain('prefetchPersonalStatusDossierSurface');
        expect(fs.existsSync(path.join(root, 'PersonalStatusDossierSurface.tsx'))).toBe(true);
        expect(identity).toContain('displayMetaField');
        expect(identity).toContain('caseNoTextDir');
        expect(identity).toContain('<dt');
        expect(identity).not.toContain('valueDir="ltr"');
        expect(identity).not.toContain('محكمة الأحوال الشخصية');
        const chrome = read('PersonalStatusSmartFileChrome.tsx');
        expect(chrome).toContain('sticky top-0');
        expect(chrome).not.toContain('py-0.5');
        const pearl = read('personalStatusPearlTheme.ts');
        expect(pearl).toContain('max-w-[18rem]');
        expect(pearl).not.toContain('inset-x-3 mx-auto w-auto');
        const pleading = read('PersonalStatusPleadingActions.tsx');
        expect(pleading).toContain('personal-status-pleading-bar');
        expect(pleading).toContain('rounded-xl border border-white/[0.14]');
        const rail = read('PersonalStatusActionRail.tsx');
        expect(rail).toContain('divide-y divide-white/[0.08]');
    });

    it('FAB prefetches personal jurisdiction chunk on intent', () => {
        const fab = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/lawyer/dashboard/LawsuitsAddCaseFabWithPicker.tsx'),
            'utf8',
        );
        expect(fab).toContain("id === 'personal'");
        expect(fab).toContain('PersonalStatusNewCaseForm');
        expect(fab).toContain('hami-jurisdiction-picker-item');
        expect(fab).not.toContain('animate-[lawsuitsBloom');
    });

    it('personal-status new-case and dossier controls meet 44px floor', () => {
        const third = read('PersonalStatusThirdPartiesPanel.tsx');
        const primitives = read('PersonalStatusFormPrimitives.tsx');
        const body = read('PersonalStatusDossierBody.tsx');
        const theme = read('personalStatusVisualTheme.ts');
        const party = read('PersonalStatusPartyCard.tsx');
        const chromeTheme = read('personalStatusDossierTheme.ts');
        expect(third).toContain('min-h-[44px] min-w-[44px] h-11 w-11');
        expect(third).not.toContain('w-8 h-8 rounded-lg border border-rose-400/20');
        expect(primitives).toContain('min-h-[44px]');
        expect(primitives).toContain('touch-pan-x');
        expect(primitives).not.toContain('تمرير لليمين');
        expect(party).toContain('min-h-[44px]');
        expect(party).not.toContain('ChevronDown');
        expect(party).not.toContain('العنوان');
        expect(party).not.toContain('MapPin');
        expect(party).not.toContain('party.address');
        expect(body).toContain('min-h-[44px]');
        expect(body).not.toContain('min-h-[36px]');
        expect(theme).toContain('min-h-[44px]');
        expect(chromeTheme).toContain('min-h-[44px] min-w-[44px]');
    });

    it('lawsuit mutation guard blocks archived saves in smart-file persist', () => {
        const persist = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/lawyer/smart-modal/hooks/useSmartFilePersist.ts'),
            'utf8',
        );
        expect(persist).toContain('rejectLawsuitFileMutation');
        const guard = fs.readFileSync(
            path.join(process.cwd(), 'src/app/domain/lawsuit/lawsuitFileMutationGuard.ts'),
            'utf8',
        );
        expect(guard).toContain('isLawsuitArchived');
        expect(guard).toContain('lawsuitTargetIsArchived');
        expect(guard).not.toContain('isLawsuitFileArchived');
    });
});
