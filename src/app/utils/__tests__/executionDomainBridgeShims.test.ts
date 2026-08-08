/**
 * يضمن أن جسور utils→domain للمحرّكات التنفيذية تبقى re-export فقط
 * (لا عودة لنسخ منطق مكرّر كانت «مصدرَي حقيقة»).
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const utilsDir = path.join(root, 'src/app/utils');

const BRIDGE_SHIMS: Record<string, string> = {
    'imprisonmentEngine.ts': 'imprisonment/imprisonmentEngine',
    'summoningImmunityEngine.ts': 'summons/summoningImmunityEngine',
    'visitationScheduleEngine.ts': 'visitation/visitationScheduleEngine',
    'otherPartyEffectiveRequestsUtils.ts': 'otherParty/otherPartyEffectiveRequestsUtils',
    'creditorOtherPartyMirrorVisibility.ts': 'otherParty/creditorOtherPartyMirrorVisibility',
};

function stripComments(src: string): string {
    return src
        .replace(/\/\*[\s\S]*?\*/g, '')
        .replace(/\/\/.*$/gm, '')
        .trim();
}

function executableLines(src: string): string[] {
    return src
        .split('\n')
        .map((line) => line.trim())
        .filter(
            (line) =>
                line.length > 0 &&
                !line.startsWith('//') &&
                !line.startsWith('/**') &&
                !line.startsWith('*') &&
                line !== '*/',
        );
}

describe('execution domain bridge shims', () => {
    for (const [file, domainPath] of Object.entries(BRIDGE_SHIMS)) {
        it(`${file} re-exports domain/execution/${domainPath} only`, () => {
            const shimPath = path.join(utilsDir, file);
            const domainFile = path.join(root, `src/app/domain/execution/${domainPath}.ts`);
            expect(fs.existsSync(domainFile)).toBe(true);

            const body = fs.readFileSync(shimPath, 'utf8');
            expect(executableLines(body)).toEqual([
                `export * from '@/app/domain/execution/${domainPath}';`,
            ]);
        });
    }

    it('utils engines without domain twin are single-source (not duplicated shims)', () => {
        const singleSourceEngines = ['alimonyPaymentEngine.ts', 'custodyWardDeliveryEngine.ts'];
        for (const file of singleSourceEngines) {
            const shimPath = path.join(utilsDir, file);
            expect(fs.existsSync(shimPath)).toBe(true);
            const body = stripComments(fs.readFileSync(shimPath, 'utf8'));
            expect(body).not.toMatch(/^export \* from '@\/app\/domain\/execution\//);
            expect(body.length).toBeGreaterThan(40);
        }
    });
});
