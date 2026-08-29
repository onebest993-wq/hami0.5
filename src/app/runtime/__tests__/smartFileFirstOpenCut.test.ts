import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('smart-file first-open cut', () => {
    it('محتوى الإضبارة لا يسحب استخراج المشاركة ولا برميل التقويم ولا التخزين عند أول إطار', () => {
        const content = read('src/app/components/lawyer/smart-modal/SmartFileModalContent.tsx');
        expect(content).not.toContain("from '@/app/services/caseShare/caseShareExtractors'");
        expect(content).not.toContain('ColleagueConsultationFlow');
        expect(content).not.toContain("from '@/app/services/calendarBridge'");
        expect(content).not.toContain('lawsuitFilesStorage');
        expect(content).not.toContain("from '@/app/utils/executionStateMachine'");
        expect(content).toContain('resolveSource={resolveShareSource}');
        expect(content).toContain("import('@/app/services/caseShare/caseShareExtractors')");
    });

    it('استشارة الزميل تُحمَّل كسولاً من الـ Provider', () => {
        const ctx = read('src/app/components/lawyer/caseShare/ColleagueConsultationContext.tsx');
        expect(ctx).toContain('lazy(() =>');
        expect(ctx).toContain("import('./ColleagueConsultationFlow')");
        expect(ctx).not.toMatch(
            /import \{[^}]*ColleagueConsultationFlow[^}]*\} from '\.\/ColleagueConsultationFlow'/,
        );
    });

    it('بوابة الإضبارة لا تقرأ القرص في مسار الرسم الأول', () => {
        const portal = read('src/app/components/lawyer/dashboard/SmartFileModalPortal.tsx');
        expect(portal).not.toMatch(/import \{ loadLawsuitFilesRaw \}/);
        expect(portal).toContain("import('@/app/utils/lawsuitFilesStorage')");
        expect(portal).toContain('pickFreshSmartFileModalFile');
    });

    it('قائمة السير ومودال المهمة خارج الإغلاق الثابت للبوابة', () => {
        const portal = read('src/app/components/lawyer/smart-modal/layout/SmartFileModalsPortal.tsx');
        expect(portal).not.toMatch(/import \{ LegalActionsMenu \}/);
        expect(portal).not.toMatch(/import \{ AddTaskModal \}/);
        expect(portal).toContain('LazyLegalActionsMenu');
        expect(portal).toContain('LazyAddTaskModal');
    });

    it('سياق تقويم الإجراءات من الجسر الخفيف', () => {
        const cal = read(
            'src/app/components/lawyer/smart-modal/hooks/procedural/lawsuitCalendarContext.ts',
        );
        expect(cal).toContain("from '@/app/services/calendar/bridge/lite'");
        expect(cal).not.toContain("from '@/app/services/calendarBridge'");
    });

    it('مزامنة المهام/المواعيد/الحكم الغيابي عبر الغلاف الكسول لا برميل التقويم', () => {
        const files = [
            'src/app/components/lawyer/smart-modal/hooks/useSmartFileDefaultJudgmentActions.ts',
            'src/app/components/lawyer/smart-modal/hooks/procedural/useProceduralTaskActions.ts',
            'src/app/components/lawyer/smart-modal/hooks/procedural/createProceduralTimelineAppointmentHandlers.ts',
        ];
        for (const rel of files) {
            const src = read(rel);
            expect(src, rel).not.toContain("from '@/app/services/calendarDossierSync'");
            expect(src, rel).toContain("from '@/app/services/calendar/dossierSyncLazy'");
        }
    });

    it('مرآة التقويم والخزنة خارج الإغلاق الثابت للحكم والإجراءات', () => {
        const judgment = read(
            'src/app/components/lawyer/smart-modal/hooks/judgment/judgmentConfirm/applyJudgmentConfirm.ts',
        );
        expect(judgment).not.toContain("from '@/app/services/lawsuitTimelineCalendarMirror'");
        expect(judgment).toContain('overlayMirrorStageLegalDatesToCalendar');

        const appeal = read(
            'src/app/components/lawyer/smart-modal/hooks/judgment/useAppealTransitionAction.ts',
        );
        expect(appeal).not.toContain("from '@/app/services/lawsuitTimelineCalendarMirror'");
        expect(appeal).toContain('overlayMirrorStageLegalDatesToCalendar');

        const session = read(
            'src/app/components/lawyer/smart-modal/hooks/procedural/createProceduralTimelineActionHandlers.ts',
        );
        expect(session).not.toContain("from '@/app/services/lawsuitTimelineCalendarMirror'");
        expect(session).not.toContain("from '@/app/utils/employeeSummonsAssignment'");
        expect(session).toContain('overlayMirrorSessionNextHearingToCalendar');

        const docs = read(
            'src/app/components/lawyer/smart-modal/hooks/procedural/createProceduralTimelineNoteDocPaymentHandlers.ts',
        );
        expect(docs).not.toMatch(/import \{ saveFileToVault \}/);
        expect(docs).not.toMatch(/import \{ SmartVaultDB \}/);
        expect(docs).toContain("import('@/app/services/vaultUploadService')");
    });

    it('ربط الجزائي لا يُقرأ من القرص عند أول إطار', () => {
        const linking = read(
            'src/app/components/lawyer/smart-modal/hooks/useSmartFileConsolidationLinking.ts',
        );
        expect(linking).not.toContain("from '../smartFile/caseLinkCriminalPeers'");
        expect(linking).toContain("import('../smartFile/caseLinkCriminalPeers')");
        expect(linking).toContain('showCaseLinkModal');
    });

    it('حسابات YMD لا تسحب برميل آلة حالة التنفيذ', () => {
        const ymd = read('src/app/utils/executionYmdCalendar.ts');
        expect(ymd).not.toContain("from '@/app/utils/executionStateMachine'");
        expect(ymd).toContain("from '@/app/utils/localYmd'");
        expect(ymd).toContain("from '@/app/utils/executionStateMachineChrono'");
    });

    it('حفظ الإضبارة لا يسحب SecureStore في الإغلاق الثابت', () => {
        const persist = read('src/app/components/lawyer/smart-modal/hooks/useSmartFilePersist.ts');
        expect(persist).not.toContain("from '@/app/utils/storageUtils'");
        expect(persist).not.toContain("from '@/app/utils/errorHandler'");
        expect(persist).toContain("from '@/app/utils/errorLog'");
        expect(persist).toContain("import('@/app/utils/storageUtils')");

        const docs = read(
            'src/app/components/lawyer/smart-modal/hooks/procedural/createProceduralTimelineNoteDocPaymentHandlers.ts',
        );
        expect(docs).not.toContain("from '@/app/utils/errorHandler'");
        expect(docs).toContain("from '@/app/utils/errorLog'");
    });

    it('ترويسة الإضبارة لا تسحب وعاء الأموال عبر تنسيق المبلغ', () => {
        const header = read(
            'src/app/components/lawyer/smart-modal/smart-header/smartHeaderPresentation.ts',
        );
        expect(header).not.toContain('FinancialOperationsCenter/utils');
        expect(header).toContain("from '@/app/utils/execution/amountInputCore'");
    });

    it('بطاقة الطرف في الترويسة بلا واردات ميتة من محركات الحكم', () => {
        const party = read('src/app/components/lawyer/smart-modal/smart-header/PartyItem.tsx');
        expect(party).not.toContain('absentJudgmentFlow');
        expect(party).not.toContain('judgmentTypes');
        expect(party).not.toContain('crossAppealEngine');
        expect(party).not.toContain('partyRoleClassification');
        expect(party).not.toContain('incidentalCaseLinking');
        expect(party).not.toContain("from '@/app/components/ui/icons/Clock'");
    });

    it('الاستئناف المتقابل لا يسحب تحقق الحكم ولا محركات غير مستعملة', () => {
        const cassation = read(
            'src/app/components/lawyer/smart-modal/hooks/judgment/useCrossAppealAndCassationActions.ts',
        );
        expect(cassation).not.toContain('validationUtils');
        expect(cassation).not.toContain('interpleaderJudgmentEngine');
        expect(cassation).not.toContain('appealPartyEngine');
        expect(cassation).toContain('handleCrossAppeal');
        expect(cassation).toContain('handleCassationDecision');
    });
});
