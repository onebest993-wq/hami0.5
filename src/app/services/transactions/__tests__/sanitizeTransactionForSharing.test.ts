import { describe, expect, it } from 'vitest';
import {
    formatProcedureCardsBody,
    resanitizeShareDraft,
    sanitizeTemplateForSharing,
    sanitizeTransactionForSharing,
} from '@/app/services/transactions/sanitizeTransactionForSharing';
import { scrubPiiMultiline, scrubPiiText } from '@/app/services/transactions/scrubTransactionSharePii';
import {
    parseProcedureGuideDataLine,
    PROCEDURE_GUIDE_ACTION_MARKER,
    PROCEDURE_GUIDE_TAG,
} from '@/app/services/transactions/procedureGuideNavigation';
import { TransactionTaskStatus, type TransactionTask } from '@/app/modules/transactionsThreading/types';

function task(partial: Partial<TransactionTask> & Pick<TransactionTask, 'id' | 'title'>): TransactionTask {
    return {
        transactionId: 'tx-1',
        status: TransactionTaskStatus.Pending,
        parentTaskId: null,
        notes: null,
        deadline: null,
        officialReference: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        completedAt: null,
        ...partial,
    };
}

describe('sanitizeTransactionForSharing', () => {
    it('يبني إجراءات ومستمسكات مع بيانات آلة قابلة للتطبيق', () => {
        const draft = sanitizeTransactionForSharing(
            {
                title: 'نقل ملكية — أحمد علي',
                clientName: 'أحمد علي',
                targetDepartment: 'دائرة التسجيل العقاري',
            },
            [
                task({ id: '1', title: 'تقديم الطلب', notes: 'راجع القسم المختص' }),
                task({ id: '2', title: 'استلام القيد', parentTaskId: '1', createdAt: '2026-01-01T00:01:00.000Z' }),
            ],
            [
                { title: 'هوية أحمد علي', ownerTag: 'للموكل' },
                { title: 'سند العقار', ownerTag: 'للدائرة' },
            ],
        );

        expect(draft.title).not.toContain('أحمد علي');
        expect(draft.body).not.toContain('الدائرة / المحافظة');
        expect(draft.steps).toHaveLength(2);
        expect(draft.steps[1]?.parentTaskId).toBe('1');
        expect(draft.documents).toHaveLength(2);
        expect(draft.documents[0]?.title).toContain('[محذوف]');
        expect(draft.body).toContain('مستمسكات مطلوبة');
        expect(draft.body).toContain(PROCEDURE_GUIDE_ACTION_MARKER);
        expect(draft.tags).toContain(PROCEDURE_GUIDE_TAG);

        const guide = parseProcedureGuideDataLine(draft.body);
        expect(guide?.steps).toHaveLength(2);
        expect(guide?.documents[1]?.title).toBe('سند العقار');
    });

    it('ينقّح الهواتف من الملاحظات', () => {
        const draft = sanitizeTransactionForSharing(
            {
                title: 'معاملة ضريبية',
                clientName: 'سارة',
                targetDepartment: 'الضريبة',
            },
            [task({ id: '1', title: 'متابعة', notes: 'اتصل على 07901234567 أو الهوية 1234567890123' })],
        );

        expect(draft.body).not.toMatch(/07901234567/);
        expect(draft.steps[0]?.notes).toContain('[محذوف]');
    });

    it('يشارك قالب الإجراءات فقط', () => {
        const draft = sanitizeTemplateForSharing({
            id: 'tpl-1',
            name: 'مسار قسام شرعي',
            createdAt: '2026-01-01T00:00:00.000Z',
            tasks: [
                { id: 'a', title: 'جمع المستمسكات', parentTaskId: null, deadline: null },
                { id: 'b', title: 'تقديم للمحكمة', parentTaskId: 'a', deadline: null },
            ],
        });

        expect(draft.documents).toEqual([]);
        expect(draft.steps[1]?.number).toBe('1.1');
    });
});

describe('formatProcedureCardsBody / resanitizeShareDraft', () => {
    it('يحافظ على النص اليدوي ويعيد بيانات الآلة', () => {
        expect(scrubPiiText('راجع أحمد علي غداً', 'أحمد علي')).toContain('[محذوف]');
        const safe = resanitizeShareDraft(
            {
                title: 'دليل — أحمد علي',
                body: 'نصي اليدوي\n┌─ البطاقة 1\n│  خطوة',
                tags: ['دليل'],
                steps: [
                    {
                        id: '1',
                        number: '1',
                        title: 'خطوة',
                        notes: 'اتصل 07801234567',
                        depth: 0,
                        parentTaskId: null,
                    },
                ],
                documents: [{ title: 'هوية', ownerTag: 'للموكل' }],
            },
            'أحمد علي',
        );
        expect(safe.body).toContain('نصي اليدوي');
        expect(safe.body).not.toMatch(/07801234567/);
        expect(safe.body).toContain(PROCEDURE_GUIDE_ACTION_MARKER);
        expect(parseProcedureGuideDataLine(safe.body)?.documents[0]?.title).toBe('هوية');
        expect(scrubPiiMultiline('سطر1\n\nسطر2', null)).toContain('\n');
        expect(
            formatProcedureCardsBody({
                title: 'دليل',
                steps: [
                    { id: '1', number: '1', title: 'أ', notes: '', depth: 0, parentTaskId: null },
                ],
            }),
        ).toContain(PROCEDURE_GUIDE_ACTION_MARKER);
    });
});
