import { describe, expect, it } from 'vitest';
import { resolveHeaderCourtAndJudge } from '../smartFileMainPanelUtils';

describe('resolveHeaderCourtAndJudge', () => {
    it('falls back to file/parent court and judge on first instance', () => {
        expect(
            resolveHeaderCourtAndJudge({
                stageName: 'بداءة بدرجة أولى',
                stageCourt: '',
                stageJudge: '',
                fileCourt: 'الديوانية',
                fileJudge: 'حسام',
            }),
        ).toEqual({ court: 'الديوانية', judge: 'حسام' });
    });

    it('does not inherit file court or judge on appeal or cassation', () => {
        expect(
            resolveHeaderCourtAndJudge({
                stageName: 'الاستئناف',
                stageCourt: '',
                stageJudge: '',
                fileCourt: 'الديوانية',
                fileJudge: 'حسام',
                parentCourt: 'الديوانية',
                parentJudge: 'حسام',
            }),
        ).toEqual({ court: '', judge: '' });

        expect(
            resolveHeaderCourtAndJudge({
                stageName: 'التمييز',
                stageCourt: 'محكمة التمييز الاتحادية',
                stageJudge: '',
                fileCourt: 'الديوانية',
                fileJudge: 'حسام',
            }),
        ).toEqual({ court: 'محكمة التمييز الاتحادية', judge: '' });
    });

    it('never shows judge on appeal even when stage stores one', () => {
        expect(
            resolveHeaderCourtAndJudge({
                stageName: 'الاستئناف',
                stageCourt: 'استئناف الديوانية',
                stageJudge: 'قاضي الاستئناف',
                fileCourt: 'الديوانية',
                fileJudge: 'حسام',
            }),
        ).toEqual({ court: 'استئناف الديوانية', judge: '' });
    });

    it('drops appeal court when it matches inherited first-instance court', () => {
        expect(
            resolveHeaderCourtAndJudge({
                stageName: 'الاستئناف',
                stageCourt: 'الديوانية',
                stageJudge: '',
                fileCourt: 'الديوانية',
                firstInstanceCourt: 'الديوانية',
            }),
        ).toEqual({ court: '', judge: '' });
    });

    it('keeps appeal court after save when it matches file court but not first instance', () => {
        expect(
            resolveHeaderCourtAndJudge({
                stageName: 'الاستئناف',
                stageCourt: 'استئناف بغداد',
                fileCourt: 'استئناف بغداد',
                firstInstanceCourt: 'بداءة الرصافة',
            }),
        ).toEqual({ court: 'استئناف بغداد', judge: '' });
    });

    it('shows this file court on an independent appeal card', () => {
        expect(
            resolveHeaderCourtAndJudge({
                stageName: 'الاستئناف',
                stageCourt: '',
                fileCourt: 'استئناف بغداد',
                useFileCourtAsAppealIdentity: true,
            }),
        ).toEqual({ court: 'استئناف بغداد', judge: '' });
    });

    it('does not treat first-instance court as independent identity', () => {
        expect(
            resolveHeaderCourtAndJudge({
                stageName: 'الاستئناف',
                stageCourt: '',
                fileCourt: 'بداءة الرصافة',
                firstInstanceCourt: 'بداءة الرصافة',
                useFileCourtAsAppealIdentity: true,
            }),
        ).toEqual({ court: '', judge: '' });
    });

    it('inherits file court and judge on absent objection like first instance', () => {
        expect(
            resolveHeaderCourtAndJudge({
                stageName: 'اعتراض على الحكم الغيابي (بداءة)',
                stageCourt: '',
                stageJudge: '',
                fileCourt: 'الديوانية',
                fileJudge: 'حسام',
                firstInstanceCourt: 'الديوانية',
                firstInstanceJudge: 'حسام',
            }),
        ).toEqual({ court: 'الديوانية', judge: 'حسام' });
    });
});
