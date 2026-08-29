import { describe, expect, it } from 'vitest';
import { resolveExecutionDossierNestedNav } from '../utils/resolveExecutionDossierNestedNav';

const base = {
    showExecutionTrashModal: false,
    showUnifiedSeizureLogModal: false,
    propertySeizureRequestModalOpen: false,
    movableSeizureRequestModalOpen: false,
    showExecutionFinancialHub: false,
    dossierActionModalOpen: false,
    dossierLifecyclePanelOpen: false,
    hasChildDossiers: false,
    isInabaActive: false,
    activeTabId: 'file-1',
    currentFileId: 'file-1',
    activeSubFileId: null,
};

describe('resolveExecutionDossierNestedNav', () => {
    it('يعتبر لوحة دورة الحياة المفتوحة تنقلاً متداخلاً', () => {
        expect(resolveExecutionDossierNestedNav({ ...base, dossierLifecyclePanelOpen: true })).toBe(
            true,
        );
    });

    it('لا يعتبر الإضبارة الجذرية بدون طبقات تنقلاً متداخلاً', () => {
        expect(resolveExecutionDossierNestedNav(base)).toBe(false);
    });
});
