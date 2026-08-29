import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ecg } from '../components/executionCreationGlassUi';

const components = resolve(__dirname, '../components');

function read(rel: string) {
    return readFileSync(resolve(components, rel), 'utf8');
}

describe('execution creation visual lite (explicit design permission)', () => {
    it('قشرة النموذج مضغوطة بلا blur/ظل ثقيل وعنوان ضخم', () => {
        expect(ecg.modalHeader).toContain('pb-1');
        expect(ecg.modalHeader).toContain('hami-overlay-header-safe-pad');
        expect(ecg.modalHeader).not.toContain('backdrop-blur');
        expect(ecg.modalHeader).not.toContain('shadow-sm');
        expect(ecg.modalHeaderTitle).toContain('text-[13px]');
        expect(ecg.modalHeaderTitle).not.toContain('text-xl');
        expect(ecg.modalClose).toContain('min-h-[44px]');
        expect(ecg.modalClose).not.toContain('bg-white/');
        expect(ecg.sectionTitle).toContain('text-sm');
        expect(ecg.sectionWrap).toContain('py-2.5');
        expect(ecg.partyGroup).not.toContain('backdrop-blur');
        expect(ecg.field).toContain('bg-transparent');
        expect(ecg.field).toContain('min-h-[44px]');
        expect(ecg.card).not.toContain('shadow-[');
        expect(ecg.card).not.toContain('backdrop-blur');
        expect(ecg.aggregatePanel).not.toContain('shadow-[');
        expect(ecg.saveBtn).toContain('min-h-[44px]');
        expect(ecg.choiceBtnIdle).toContain('bg-transparent');
    });

    it('FormBody وBootShell يستخدمان عنوان الرأس المضغوط', () => {
        const body = read('ExecutionCreationFormBody.tsx');
        expect(body).toContain('ecg.modalHeaderTitle');
        expect(body).not.toMatch(/execution-creation-title[\s\S]{0,80}ecg\.modalTitle/);
        const boot = readFileSync(
            resolve(process.cwd(), 'src/app/components/lawyer/dashboard/ExecutionCreationBootShell.tsx'),
            'utf8',
        );
        expect(boot).toContain('ecg.modalHeaderTitle');
        expect(boot).not.toContain('ecg.modalTitle');
    });

    it('PartyCard وLawyerFees بلا backdrop-blur على الشرائح', () => {
        expect(read('PartyCard.tsx')).not.toContain('backdrop-blur-sm');
        expect(read('LawyerFeesToggleCard.tsx')).toContain('min-h-[44px]');
        expect(read('LawyerFeesToggleCard.tsx')).not.toContain('min-h-[52px]');
        expect(read('ExecutionSaveButton.tsx')).toContain('safe-area-inset-bottom');
    });

    it('حوار تأكيد القسم متناسق مع ecg بلا زمرد/blur ثقيل', () => {
        const confirm = readFileSync(
            resolve(process.cwd(), 'src/app/components/lawyer/execution/ExecutionSectionConfirmDialog.tsx'),
            'utf8',
        );
        expect(confirm).toContain('executionCreationGlassUi');
        expect(confirm).toContain('ecg.modalPanel');
        expect(confirm).toContain('ecg.modalBtnPrimary');
        expect(confirm).toContain('whitespace-pre-line');
        expect(confirm).not.toContain('backdrop-blur-3xl');
        expect(confirm).not.toContain('shadow-emerald');
        expect(confirm).not.toContain('from-emerald-600');
        expect(confirm).not.toContain('text-emerald-200');
    });
});
