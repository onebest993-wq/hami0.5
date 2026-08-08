import { describe, expect, it } from 'vitest';
import { buildConservativePruneKeepKeys } from '@/app/workspace/workspacePinPrunePolicy';
import type { ClusterScanRecord, WorkspacePinnedItem } from '@/app/workspace/types';

const taskPin: WorkspacePinnedItem = {
    id: 'aebae38b-6ec3-4f34-9351-fac0efbe6911',
    type: 'task',
    title: 'مهمة — التلاتلات',
    clientName: 'مي',
    caseNumber: '',
    routePath: '/field-tasks/aebae38b-6ec3-4f34-9351-fac0efbe6911',
};

const lawsuitScan: ClusterScanRecord = {
    id: 'case-1',
    type: 'lawsuit',
    title: 'دعوى',
    clientName: 'أحمد',
    caseNumber: '123',
    routePath: '/lawsuit/case-1',
};

describe('buildConservativePruneKeepKeys', () => {
    it('يحتفظ بتثبيت مهمة قبل فهرسة المهام', () => {
        const keep = buildConservativePruneKeepKeys([lawsuitScan], [taskPin]);
        expect(keep.has('task:aebae38b-6ec3-4f34-9351-fac0efbe6911')).toBe(true);
    });

    it('يزيل التثبيت اليتيم عندما يُفهرس نفس النوع', () => {
        const keep = buildConservativePruneKeepKeys(
            [
                {
                    ...lawsuitScan,
                    id: 'other-task',
                    type: 'task',
                    title: 'مهمة أخرى',
                },
            ],
            [taskPin],
        );
        expect(keep.has('task:aebae38b-6ec3-4f34-9351-fac0efbe6911')).toBe(false);
    });

    it('يحتفظ بالتثبيت المطابق في الفهرس', () => {
        const keep = buildConservativePruneKeepKeys(
            [
                {
                    id: taskPin.id,
                    type: 'task',
                    title: taskPin.title,
                    clientName: taskPin.clientName,
                    caseNumber: taskPin.caseNumber,
                    routePath: taskPin.routePath,
                },
            ],
            [taskPin],
        );
        expect(keep.has(`task:${taskPin.id}`)).toBe(true);
    });
});
