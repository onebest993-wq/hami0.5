import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const MAIN_FILE = path.resolve(__dirname, '../PersonalCoerciveFollowupPanel.tsx');
const FOLLOWUP_DIR = path.resolve(__dirname, '../PersonalCoerciveFollowup');

const mainFileSource = fs.readFileSync(MAIN_FILE, 'utf8');
const MAIN_FILE_LINE_COUNT = mainFileSource.split('\n').length;

describe('PersonalCoerciveFollowupPanel monolith guard', () => {
    it('uses the self-contained monolith (abandoned split folder removed)', () => {
        expect(fs.existsSync(FOLLOWUP_DIR)).toBe(false);
        expect(mainFileSource).toContain('export const PersonalCoerciveFollowupPanel');
        expect(mainFileSource).not.toContain("from '@/app/components/lawyer/execution/PersonalCoerciveFollowup/");
    });

    it('exports panel props from the main file', () => {
        expect(mainFileSource).toContain('export interface PersonalCoerciveFollowupPanelProps');
    });

    it('keeps runtime imports on live execution utilities (no dead split hooks)', () => {
        expect(mainFileSource).toContain("from '@/app/utils/executorSeizureDecisionQueue'");
        expect(mainFileSource).toContain('RejectedExecutorResubmitStrip');
    });

    it('documents current size budget honestly (monolith until wired split returns)', () => {
        expect(MAIN_FILE_LINE_COUNT).toBeGreaterThan(1000);
        expect(MAIN_FILE_LINE_COUNT).toBeLessThan(4500);
    });
});
