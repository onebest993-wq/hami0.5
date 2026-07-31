import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const MAIN_FILE = path.resolve(__dirname, '../PersonalCoerciveFollowupPanel.tsx');
const FOLLOWUP_DIR = path.resolve(__dirname, '../PersonalCoerciveFollowup');

const mainFileSource = fs.readFileSync(MAIN_FILE, 'utf8');
const MAIN_FILE_LINE_COUNT = mainFileSource.split('\n').length;

/**
 * كل نص مميّز يخص أحد المكوّنات/الخطافات المستخرجة — يجب أن يبقى داخل ملفه الجديد فقط
 * ولا يتكرر كتعليق أو نص منطقي آخر في الملف الرئيسي.
 */
const EXTRACTED_MODULE_MARKERS: Array<{ file: string; marker: string }> = [
    { file: 'PersonalCoerciveFollowupModals.tsx', marker: 'سيتم سحب طلب مفاتحة محكمة التحقيق' },
    { file: 'PersonalCoerciveForcedBringCard.tsx', marker: 'تفعيل بقرار المنفذ العدل' },
    { file: 'PersonalCoerciveInvestigationCard.tsx', marker: 'مفاتحة محكمة التحقيق — بعد موافقة المنفذ' },
    { file: 'PersonalCoerciveTravelBanCard.tsx', marker: 'يُغلق طلب منع السفر الحالي وتعود دورة التقديم' },
    { file: 'PersonalCoerciveDossierCard.tsx', marker: 'يجب تبليغ المدين أولاً قبل تقديم طلب عرض الإضبارة' },
    { file: 'PersonalCoerciveJudgeDetentionCard.tsx', marker: 'بانتظار قرار قاضي البداءة' },
    { file: 'PersonalCoerciveGuarantorAndReleaseSection.tsx', marker: 'طلب إخلاء سبيل المدين' },
    {
        file: 'personalCoerciveFollowupPanelProps.ts',
        marker: 'من الطلبات المخفية — إظهار مسار واحد فقط بنفس دورة الحياة الكاملة',
    },
    { file: 'PersonalCoerciveInlineGate.tsx', marker: 'بوابة تأكيد داخلية موحّدة' },
    {
        file: 'usePersonalCoercivePanelDerived.ts',
        marker: 'جوهر اشتقاق حالات وقرارات الإجراءات الجبرية الشخصية',
    },
    {
        file: 'usePersonalCoerciveExecutorEvents.ts',
        marker: 'تعذّر تسجيل قرار المنفذ — تحقق من مركز القرارات أو أعد المحاولة',
    },
    {
        file: 'usePersonalCoerciveActionGates.ts',
        marker: 'لا يتم التفعيل إلا بعد الإخبار بمذكرة الإخبار بالتنفيذ',
    },
    {
        file: 'usePersonalCoerciveCardVisibility.ts',
        marker: 'بوابات إظهار البطاقات المتبقية',
    },
];

describe('PersonalCoerciveFollowupPanel modal/card extraction', () => {
    it.each(EXTRACTED_MODULE_MARKERS)('$file exists and owns its distinctive marker', ({ file, marker }) => {
        const filePath = path.join(FOLLOWUP_DIR, file);
        expect(fs.existsSync(filePath)).toBe(true);
        const source = fs.readFileSync(filePath, 'utf8');
        expect(source).toContain(marker);
    });

    it('main PersonalCoerciveFollowupPanel.tsx no longer contains the extracted modules distinctive strings', () => {
        for (const { marker } of EXTRACTED_MODULE_MARKERS) {
            expect(mainFileSource).not.toContain(marker);
        }
    });

    it('main PersonalCoerciveFollowupPanel.tsx imports the extracted card/modal components', () => {
        expect(mainFileSource).toContain(
            "import { PersonalCoerciveFollowupModals } from '@/app/components/lawyer/execution/PersonalCoerciveFollowup/PersonalCoerciveFollowupModals';"
        );
        expect(mainFileSource).toContain(
            "import { PersonalCoerciveForcedBringCard } from '@/app/components/lawyer/execution/PersonalCoerciveFollowup/PersonalCoerciveForcedBringCard';"
        );
        expect(mainFileSource).toContain(
            "import { PersonalCoerciveInvestigationCard } from '@/app/components/lawyer/execution/PersonalCoerciveFollowup/PersonalCoerciveInvestigationCard';"
        );
        expect(mainFileSource).toContain(
            "import { PersonalCoerciveTravelBanCard } from '@/app/components/lawyer/execution/PersonalCoerciveFollowup/PersonalCoerciveTravelBanCard';"
        );
        expect(mainFileSource).toContain(
            "import { PersonalCoerciveDossierCard } from '@/app/components/lawyer/execution/PersonalCoerciveFollowup/PersonalCoerciveDossierCard';"
        );
        expect(mainFileSource).toContain(
            "import { PersonalCoerciveJudgeDetentionCard } from '@/app/components/lawyer/execution/PersonalCoerciveFollowup/PersonalCoerciveJudgeDetentionCard';"
        );
        expect(mainFileSource).toContain(
            "import { PersonalCoerciveGuarantorAndReleaseSection } from '@/app/components/lawyer/execution/PersonalCoerciveFollowup/PersonalCoerciveGuarantorAndReleaseSection';"
        );
    });

    it('shared presentation primitives (Portal/Fold/BTN classes) live in personalCoercivePresentation.tsx', () => {
        const sharedPath = path.join(FOLLOWUP_DIR, 'personalCoercivePresentation.tsx');
        expect(fs.existsSync(sharedPath)).toBe(true);
        const source = fs.readFileSync(sharedPath, 'utf8');
        expect(source).toContain('export function PersonalCoerciveFollowUpPortal');
        expect(source).toContain('export function CoerciveSubsectionFold');
        expect(source).toContain('export const BTN_BASE');
        expect(mainFileSource).not.toMatch(/^function PersonalCoerciveFollowUpPortal/m);
        expect(mainFileSource).not.toMatch(/^function CoerciveSubsectionFold/m);
    });
});

describe('PersonalCoerciveFollowupPanel action-hook extraction', () => {
    const EXTRACTED_HOOKS: Array<{ file: string; exportName: string }> = [
        { file: 'usePersonalCoerciveForcedBringActions.ts', exportName: 'usePersonalCoerciveForcedBringActions' },
        { file: 'usePersonalCoerciveDetentionActions.ts', exportName: 'usePersonalCoerciveDetentionActions' },
        { file: 'usePersonalCoerciveTravelBanActions.ts', exportName: 'usePersonalCoerciveTravelBanActions' },
        { file: 'usePersonalCoerciveSubmitRequest.ts', exportName: 'usePersonalCoerciveSubmitRequest' },
        { file: 'usePersonalCoerciveDecisionLookups.ts', exportName: 'usePersonalCoerciveDecisionLookups' },
        { file: 'usePersonalCoerciveAppealActions.tsx', exportName: 'usePersonalCoerciveAppealActions' },
    ];

    it.each(EXTRACTED_HOOKS)('$file exists and exports $exportName', ({ file, exportName }) => {
        const filePath = path.join(FOLLOWUP_DIR, file);
        expect(fs.existsSync(filePath)).toBe(true);
        const source = fs.readFileSync(filePath, 'utf8');
        expect(source).toContain(`export function ${exportName}`);
    });

    it('main file imports and uses every extracted action hook', () => {
        for (const { exportName } of EXTRACTED_HOOKS) {
            expect(mainFileSource).toContain(exportName);
        }
    });

    it('recordForcedOutcome/startDetentionFourMonths/submitRequest are no longer defined as local consts in the main file', () => {
        for (const symbolName of [
            'recordForcedOutcome',
            'closeInvestigationAndForcedBringDecisionCycles',
            'buildReleaseDetentionPatch',
            'recordExecutiveDetentionJudgeOutcome',
            'startDetentionFourMonths',
            'liftTravelBanEnforcement',
            'withdrawTravelBanRequestCycle',
            'withdrawInvestigationCourtPath',
            'submitRequest',
            'queueEncryptedPayloadForDecision',
            'findLatestDecisionIdForSubtype',
            'findGoverningDossierDecisionId',
            'handleWaiveInitialAppealApplied',
            'renderWaiveInitialAppeal',
            'renderRejectedExecutorAppealSection',
            'renderAppealSyncFollowup',
        ]) {
            const localConstOrFunctionPattern = new RegExp(
                `const ${symbolName}\\s*=|function ${symbolName}\\s*\\(`
            );
            expect(mainFileSource).not.toMatch(localConstOrFunctionPattern);
        }
    });

    it('does not leave dead/unused underscore-prefixed helpers behind in the main runtime', () => {
        expect(mainFileSource).not.toMatch(/const _\w+ =/);
        expect(mainFileSource).not.toContain('_runTravelBanSubmit');
        expect(mainFileSource).not.toContain('_runArrestInvestigationSubmit');
        expect(mainFileSource).not.toContain('_revertWarrantIssuedMark');
        expect(mainFileSource).not.toContain('_detentionUntil');
        expect(mainFileSource).not.toContain('_travelRejectedAppealOpen');
    });
});

describe('PersonalCoerciveFollowupPanel Phase-1 size budget', () => {
    it('stays within the Phase-1 stretch size budget after extraction', () => {
        expect(MAIN_FILE_LINE_COUNT).toBeLessThanOrEqual(1700);
    });

    it('stays within the Phase-2 hook-extraction size budget (\u2264 1000 lines)', () => {
        expect(MAIN_FILE_LINE_COUNT).toBeLessThanOrEqual(1000);
    });
});

describe('PersonalCoerciveFollowupPanel derived/state-hook extraction', () => {
    const EXTRACTED_STATE_HOOKS: Array<{ file: string; exportName: string }> = [
        { file: 'usePersonalCoercivePanelDerived.ts', exportName: 'usePersonalCoercivePanelDerived' },
        { file: 'usePersonalCoerciveExecutorEvents.ts', exportName: 'usePersonalCoerciveExecutorEvents' },
        { file: 'usePersonalCoerciveActionGates.ts', exportName: 'usePersonalCoerciveActionGates' },
        { file: 'usePersonalCoerciveCardVisibility.ts', exportName: 'usePersonalCoerciveCardVisibility' },
    ];

    it.each(EXTRACTED_STATE_HOOKS)('$file exists and exports $exportName', ({ file, exportName }) => {
        const filePath = path.join(FOLLOWUP_DIR, file);
        expect(fs.existsSync(filePath)).toBe(true);
        const source = fs.readFileSync(filePath, 'utf8');
        expect(source).toContain(`export function ${exportName}`);
    });

    it('main file imports and uses every extracted state hook', () => {
        for (const { exportName } of EXTRACTED_STATE_HOOKS) {
            expect(mainFileSource).toContain(exportName);
        }
    });

    it('Props interface lives in personalCoerciveFollowupPanelProps.ts, not inline in the main file', () => {
        const propsPath = path.join(FOLLOWUP_DIR, 'personalCoerciveFollowupPanelProps.ts');
        expect(fs.existsSync(propsPath)).toBe(true);
        const source = fs.readFileSync(propsPath, 'utf8');
        expect(source).toContain('export interface PersonalCoerciveFollowupPanelProps');
        expect(mainFileSource).not.toMatch(/^export interface PersonalCoerciveFollowupPanelProps/m);
    });

    it('PersonalCoerciveInlineGate.tsx owns the inline confirmation gate UI', () => {
        const gatePath = path.join(FOLLOWUP_DIR, 'PersonalCoerciveInlineGate.tsx');
        expect(fs.existsSync(gatePath)).toBe(true);
        const source = fs.readFileSync(gatePath, 'utf8');
        expect(source).toContain('export function PersonalCoerciveInlineGate');
        expect(mainFileSource).not.toMatch(/^function renderInlineGate/m);
    });
});
