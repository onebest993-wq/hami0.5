import { describe, expect, it } from 'vitest';
import { legalTaskUiSignature } from '../legalTaskUiSignature';
import { legalTaskStub } from './legalTaskStub';
import { areTaskCardPropsEqual, type TaskCardProps } from '@/app/components/lawyer/dashboard/tasksManager/taskCardUtils';

function noop(): void {
    /* test stub */
}

function cardProps(task = legalTaskStub({ id: 't1', title: 'جلسة' })): TaskCardProps {
    const now = new Date(2026, 7, 30, 10, 0, 0);
    return {
        task,
        now,
        onCompleteRequest: noop,
        onReopenTask: noop,
        onToggleFatal: noop,
        onToggleFieldCurtainPin: noop,
        detailPanel: null,
        setDetailPanel: noop,
        addSubTask: noop,
        toggleSubTaskComplete: noop,
        setSubTaskPlanStatus: noop,
        renameSubTask: noop,
        removeSubTask: noop,
        addDocumentRequirement: noop,
        toggleDocumentRequirement: noop,
        onEditRequest: noop,
        onDeleteRequest: noop,
        onReminderBadgeClick: noop,
    };
}

describe('legalTaskUiSignature', () => {
    it('يتغيّر عند linkedCaseId أو تاريخ المهمة أو نص المستند', () => {
        const base = legalTaskStub({ id: 't1', title: 'جلسة' });
        expect(legalTaskUiSignature({ ...base, linkedCaseId: 'case-9' })).not.toBe(
            legalTaskUiSignature(base),
        );
        expect(
            legalTaskUiSignature({ ...base, parsedDate: new Date(2026, 7, 31) }),
        ).not.toBe(legalTaskUiSignature(base));
        expect(
            legalTaskUiSignature({
                ...base,
                documentRequirements: [{ id: 'd1', text: 'هوية', isChecked: false }],
            }),
        ).not.toBe(
            legalTaskUiSignature({
                ...base,
                documentRequirements: [{ id: 'd1', text: 'وكالة', isChecked: false }],
            }),
        );
    });
});

describe('areTaskCardPropsEqual', () => {
    it('لا يعتبر البطاقة متساوية بعد ربط ملف', () => {
        const prev = cardProps();
        const next = cardProps({ ...prev.task, linkedCaseId: 'case-12' });
        expect(areTaskCardPropsEqual(prev, next)).toBe(false);
    });

    it('يثبّت البطاقة عندما الحقول الظاهرة لم تتغيّر', () => {
        const prev = cardProps();
        const next = { ...prev, onCompleteRequest: () => undefined };
        expect(areTaskCardPropsEqual(prev, next)).toBe(true);
    });
});
