import { describe, expect, it } from 'vitest';
import {
    buildDossierActionContentParts,
    buildDossierActionFullContent,
    buildDossierActionPayloadJson,
    DOSSIER_ACTION_TITLE_MAP,
    validateDossierActionPayload,
} from '../executionDashboardDossierAction';
import type { DossierActionPayload } from '../../components/DossierActionsModal';

describe('executionDashboardDossierAction', () => {
    it('maps action titles in Arabic', () => {
        expect(DOSSIER_ACTION_TITLE_MAP.delegation).toBe('طلب الإنابة التنفيذية');
        expect(DOSSIER_ACTION_TITLE_MAP.unify).toBe('طلب توحيد الأضابير');
    });

    it('builds delegation content parts', () => {
        const parts = buildDossierActionContentParts({
            actionType: 'delegation',
            delegationTargetDirectorate: 'بغداد',
            delegationPurpose: 'تبليغ',
        });
        expect(parts).toEqual([
            'الدائرة المناب إليها: بغداد',
            'الغاية من الإنابة: تبليغ',
        ]);
    });

    it('validates inaba correspondence requires sub-file and subject', () => {
        const missingSub: DossierActionPayload = {
            actionType: 'inaba_correspondence',
            inabaCorrespondenceDirectorate: 'كربلاء',
        };
        expect(validateDossierActionPayload(missingSub)).toEqual({
            ok: false,
            message: 'تعذر إرسال الطلب: لا توجد إنابة نشطة لهذه الإضبارة.',
        });

        const missingSubject: DossierActionPayload = {
            actionType: 'inaba_correspondence',
            inabaCorrespondenceSubFileId: 'sub-1',
            inabaCorrespondenceDirectorate: 'كربلاء',
        };
        expect(validateDossierActionPayload(missingSubject)).toEqual({
            ok: false,
            message: 'أدخل موضوع المخاطبة',
        });
    });

    it('builds unify payload json', () => {
        const json = buildDossierActionPayloadJson({
            actionType: 'unify',
            unificationTargetId: 'exec-2',
            unificationTargetMeta: { fileNumber: '55', fileYear: '2026' },
        });
        expect(JSON.parse(json!)).toMatchObject({
            kind: 'unification',
            targetId: 'exec-2',
        });
    });

    it('builds full content with title prefix', () => {
        const content = buildDossierActionFullContent({
            actionType: 'renew',
            renewalReason: 'انتهاء المهلة',
        });
        expect(content).toContain('طلب تجديد الإضبارة');
        expect(content).toContain('سبب التجديد: انتهاء المهلة');
    });
});
