/**
 * E2E: إضبارة طعن مستقلة بعد حكم اعتراض مختلف عن رول الاستئناف المستخرج.
 * يفتح Chromium على التطبيق، يزرع الملف المختلط، ويتحقق من الزر والأطراف.
 */
import { test, expect } from '@playwright/test';
import {
    bootCivilLawsuitsScreenE2E,
    E2E_CIVIL_FILE_ID,
    fillLabeledInput,
    openLawsuitDossierById,
    prepareCivilLawsuitsE2E,
    readLawyerFilesFromPage,
} from './helpers/civilLawsuitFixtures';

const ART172_SUSPENSION_REASON = 'PENDING_CO_DEFENDANT_OBJECTION';

const PARTIES = [
    { id: 1, name: 'أحمد', role: 'المدعي', isClient: true, side: 'right' },
    { id: 2, name: 'سامي', role: 'المدعى عليه', isClient: false, side: 'left' },
    { id: 3, name: 'باسم', role: 'المدعى عليه', isClient: false, side: 'left' },
    { id: 4, name: 'كريم', role: 'المدعى عليه', isClient: false, side: 'left' },
];

function buildMixedIndependentChallengeFile() {
    return {
        id: E2E_CIVIL_FILE_ID,
        type: 'lawsuit',
        status: 'active',
        caseNo: '100/2026',
        court: 'بداءة الرصافة',
        docType: 'مطالبة بدين',
        lawsuitJurisdiction: 'civil',
        representedParty: 'المدعي',
        disputeIntegrity: 'indivisible',
        date: '2026-01-01',
        parties: PARTIES,
        history: [],
        notes: [],
        images: [],
        currentStage: 'الاعتراض على الحكم الغيابي',
        stages: [
            {
                id: 's0',
                name: 'بداءة بدرجة أولى',
                stageName: 'بداءة بدرجة أولى',
                status: 'locked',
                isPleadingsClosed: true,
                caseNo: '100/2026',
                court: 'بداءة الرصافة',
                parties: PARTIES,
                clientStageOutcome: 'WIN',
                judgmentForm: 'مختلط',
                disputeIntegrity: 'indivisible',
                partyJudgmentDispositions: [
                    { partyId: '2', form: 'حضوري' },
                    { partyId: '3', form: 'حضوري' },
                    { partyId: '4', form: 'غيابي' },
                ],
                timeline: [],
                tasks: [],
            },
            {
                id: 's1',
                name: 'الاستئناف',
                stageName: 'الاستئناف',
                status: 'active',
                caseNo: 'است/10',
                court: 'استئناف بغداد',
                isSuspended: true,
                suspensionReason: ART172_SUSPENSION_REASON,
                parties: [
                    { ...PARTIES[1], role: 'المستأنف (المدعى عليه)', isClient: false, side: 'right' },
                    { ...PARTIES[2], role: 'المستأنف (المدعى عليه)', isClient: false, side: 'right' },
                    { ...PARTIES[0], role: 'المستأنف عليه (المدعي)', isClient: true, side: 'left' },
                ],
                appealMetadata: {
                    appealType: 'استئناف',
                    appellant: 'المدعى عليه',
                    appellantPartyIds: ['2', '3'],
                    appelleePartyIds: ['1'],
                    priorStageOutcome: 'WIN',
                },
                timeline: [],
                tasks: [],
            },
            {
                id: 's2',
                name: 'الاعتراض على الحكم الغيابي',
                stageName: 'الاعتراض على الحكم الغيابي',
                status: 'active',
                isPleadingsClosed: true,
                caseNo: '100/2026',
                court: 'بداءة الرصافة',
                clientStageOutcome: 'LOSS',
                finalDecision: 'تعديل الحكم الغيابي — يحق لموكلك الطعن',
                judgmentForm: 'حضوري',
                disputeIntegrity: 'indivisible',
                parties: [
                    {
                        id: 1,
                        name: 'أحمد',
                        role: 'المعترض عليه بالحكم الغيابي (المدعي)',
                        isClient: true,
                        side: 'left',
                    },
                    {
                        id: 4,
                        name: 'كريم',
                        role: 'المعترض على الحكم الغيابي (المدعى عليه)',
                        isClient: false,
                        side: 'right',
                    },
                ],
                timeline: [],
                tasks: [],
            },
        ],
        activeStageIndex: 2,
    };
}

test.describe('Independent challenge dossier — browser', () => {
    test.describe.configure({ timeout: 120_000 });

    test('يفتح الإضبارة المختلطة وينشئ طعناً مستقلاً بأطراف الحكم الجديد', async ({ page }) => {
        await prepareCivilLawsuitsE2E(page);
        await bootCivilLawsuitsScreenE2E(page, false, [buildMixedIndependentChallengeFile()]);
        await openLawsuitDossierById(page, E2E_CIVIL_FILE_ID);

        await expect(page.getByTestId('smart-file-dossier')).toBeVisible({ timeout: 20_000 });
        const spawn = page.getByTestId('smart-independent-challenge-spawn');
        await expect(spawn).toBeVisible({ timeout: 20_000 });
        await expect(spawn).toHaveText('إنشاء طعن استئنافي مستقل');
        await page.screenshot({
            path: '.audit/_e2e_independent_challenge_spawn_footer.png',
            fullPage: true,
        });

        await spawn.click();
        const submit = page.getByRole('button', { name: 'إنشاء طعن استئنافي مستقل' }).last();
        await expect(submit).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText('المعترض عليه بالحكم الغيابي المدعي').or(page.getByText('المعترض عليه بالحكم الغيابي (المدعي)'))).toBeVisible({
            timeout: 10_000,
        });
        await expect(page.getByTestId('independent-challenge-court')).toBeVisible();
        await expect(page.getByTestId('independent-challenge-case-no')).toBeVisible();
        await fillLabeledInput(page, 'المحكمة المختصة', 'استئناف بغداد');
        await fillLabeledInput(page, 'رقم دعوى الاستئناف', 'است/88');
        await submit.click();

        await expect(page.getByText('المستأنف (المدعي)').nth(0)).toBeAttached();
        await expect(page.getByTestId('smart-dossier-case-no')).toContainText('است/88');
        await expect(page.getByTestId('smart-dossier-court')).toContainText('استئناف بغداد');
        await expect(page.getByTestId('smart-independent-challenge-unify')).toHaveCount(0);
        await page.screenshot({
            path: '.audit/_e2e_independent_challenge_after_spawn.png',
            fullPage: true,
        });

        const files = await readLawyerFilesFromPage(page);
        const created = (files as Array<{ parentId?: number; parties?: Array<{ id?: number; role?: string }> }>).find(
            (file) => Number(file.parentId) === E2E_CIVIL_FILE_ID,
        );
        expect(created).toBeTruthy();
        expect(String((created as { caseNo?: string })?.caseNo ?? '')).toBe('است/88');
        expect(String((created as { court?: string })?.court ?? '')).toBe('استئناف بغداد');
        const plaintiff = created?.parties?.find((party) => Number(party.id) === 1);
        const objector = created?.parties?.find((party) => Number(party.id) === 4);
        expect(String(plaintiff?.role ?? '')).toContain('المستأنف');
        expect(String(objector?.role ?? '')).toContain('المستأنف عليه');
        expect(created?.parties?.some((party) => Number(party.id) === 2)).toBe(false);
    });
});
