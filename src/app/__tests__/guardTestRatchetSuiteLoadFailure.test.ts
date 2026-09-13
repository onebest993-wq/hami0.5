/**
 * مِسنَنةُ الاختبارات تَعُدّ **ملفَّ اختبارٍ سقط بلا اختبارٍ ساقط** — لم يُحمَّل، أو رمى خطّافُه قبل الاختبارات.
 *
 * **العطلُ الذي يمنعه، مقيساً ٢٠٢٦-٠٩-١٤:** الحارسُ كان يجمع التوكيداتِ الساقطة وحدها، وملفٌّ لا يُحمَّل **لا توكيدَ
 * فيه**، فيموت كلُّه بصمت. **ووقع:** نقلُ `sameOriginApiProbe` إلى `services/network` (`dfaf68bd`) ترك استيراداً نسبياً
 * في اختباره لا يُحلّ — **فلم تعمل اختباراتُه الستّة أربعةَ أيّام**، ومرّت كلُّ بوّابةٍ خضراء.
 *
 * صندوقٌ أسود على السكربت المشحون بـ`HAMI_TEST_RATCHET_REPORT` و`HAMI_TEST_RATCHET_BASELINE` — لا تُشغَّل المجموعة
 * ولا يُمسّ خطُّ الأساس الحقيقيّ.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = resolve(process.cwd(), 'scripts/guard-test-ratchet.mjs');

/* مسارٌ يُبنى من مقاطع — `guard:source-paths` يُسقط كلَّ مسارٍ مكتوبٍ حرفاً لا وجود له */
const DEAD_FILE = ['src', 'fake', 'movedModule.test.ts'].join('/');

type Suite = {
    file: string;
    status?: string;
    message?: string;
    assertions?: { status: string; name: string }[];
};

let dir = '';

function writeJson(name: string, value: unknown): string {
    const path = join(dir, name);
    writeFileSync(path, JSON.stringify(value), 'utf8');
    return path;
}

function report(suites: readonly Suite[]): string {
    return writeJson('report.json', {
        numTotalTests: 10,
        numFailedTests: 0,
        testResults: suites.map((s) => ({
            name: join(process.cwd(), s.file),
            status: s.status,
            message: s.message ?? '',
            assertionResults: (s.assertions ?? []).map((a) => ({ status: a.status, fullName: a.name, title: a.name })),
        })),
    });
}

function runGuard(reportPath: string, baselineFailures: string[]): { code: number; out: string } {
    const baselinePath = writeJson('baseline.json', { failures: baselineFailures });
    try {
        const out = execFileSync(process.execPath, [SCRIPT], {
            cwd: process.cwd(),
            encoding: 'utf8',
            env: {
                ...process.env,
                GITHUB_ACTIONS: '',
                CI: '',
                HAMI_TEST_RATCHET_REPORT: reportPath,
                HAMI_TEST_RATCHET_BASELINE: baselinePath,
            },
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        return { code: 0, out };
    } catch (error) {
        const err = error as { status?: number; stdout?: string; stderr?: string };
        return { code: err.status ?? 1, out: `${err.stdout ?? ''}${err.stderr ?? ''}` };
    }
}

describe('guard-test-ratchet — ملفٌّ لا يُحمَّل انحدارٌ لا صمت', () => {
    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), 'hami-ratchet-suite-'));
    });

    afterEach(() => {
        if (dir) rmSync(dir, { recursive: true, force: true });
        dir = '';
    });

    it('ملفٌّ سقط بلا توكيدٍ ساقط (استيرادٌ لا يُحلّ) يُسقط البوّابةَ باسمه', () => {
        const result = runGuard(
            report([{ file: DEAD_FILE, status: 'failed', message: 'Failed to resolve import "../movedModule"' }]),
            [],
        );
        expect(result.code).toBe(1);
        expect(result.out).toContain(DEAD_FILE);
        expect(result.out).toContain('suite failed with no failing test');
    });

    it('ويُحفظ في خطّ الأساس كأيّ ساقط — فلا يُسقط ما قُبل صراحةً', () => {
        const suite: Suite = { file: DEAD_FILE, status: 'failed', message: 'boom' };
        const first = runGuard(report([suite]), []);
        const added = first.out
            .split('\n')
            .map((line) => line.trim())
            .find((line) => line.startsWith(`+ ${DEAD_FILE} :: `));
        expect(added).toBeDefined();
        expect(runGuard(report([suite]), [String(added).slice(2)]).code).toBe(0);
    });

    it('ملفٌّ فيه توكيدٌ ساقط يُعدّ مرّةً واحدة — بالتوكيد لا بالملفّ', () => {
        const result = runGuard(
            report([{ file: DEAD_FILE, status: 'failed', assertions: [{ status: 'failed', name: 'real failure' }] }]),
            [`${DEAD_FILE} :: real failure`],
        );
        expect(result.code).toBe(0);
        expect(result.out).toContain('baseline 1  ->  current 1');
    });

    it('ضابطة: ملفٌّ ناجحٌ بلا توكيدات، أو بلا حالةٍ أصلاً، لا يُعدّ', () => {
        expect(runGuard(report([{ file: DEAD_FILE, status: 'passed' }]), []).code).toBe(0);
        expect(runGuard(report([{ file: DEAD_FILE }]), []).code).toBe(0);
    });
});
