import { describe, expect, it } from 'vitest';
import { resolveDockShellItemAriaLabel } from '../dockShellAria';

describe('resolveDockShellItemAriaLabel', () => {
    it('يعيد التسمية الأساسية للمفكرة بدون شارة', () => {
        expect(resolveDockShellItemAriaLabel('dockNotepad', 'المفكرة')).toBe('المفكرة');
    });

    it('يذكر المهام المعلقة على أيقونة المهام', () => {
        expect(
            resolveDockShellItemAriaLabel('dockTasks', 'مهام', { pendingFieldTasksCount: 4 }),
        ).toBe('مهام، 4 مهام معلقة');
    });

    it('يذكر التنبيهات العاجلة والتثبيت', () => {
        expect(
            resolveDockShellItemAriaLabel('alerts', 'تنبيهات', {
                urgentAlertsCount: 2,
                pinnedCount: 3,
            }),
        ).toBe('تنبيهات، 2 عاجل و3 مثبّت');
    });

    it('يذكر غير المقروء في المنتدى', () => {
        expect(
            resolveDockShellItemAriaLabel('forum', 'المنتدى', { forumUnreadCount: 5 }),
        ).toBe('المنتدى القانوني، 5 غير مقروء');
    });

    it('يذكر متابعة سبارك في المستودع', () => {
        expect(
            resolveDockShellItemAriaLabel('dockRepository', 'المستودع', {
                repositorySparkAttentionCount: 1,
            }),
        ).toBe('المستودع، متابعة إجرائية في المستودع');
    });
});
