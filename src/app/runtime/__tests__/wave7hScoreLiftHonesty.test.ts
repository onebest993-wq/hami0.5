import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { readHomeTabImplSource } from './readHomeTabImplSource';

const root = process.cwd();
const cs = path.join(root, 'src/app/components/lawyer/criminal-system');

describe('wave7h score lift honesty', () => {
    it('trial session / verdict-card / evidence مصانع منفصلة', () => {
        const trial = fs.readFileSync(path.join(cs, 'criminalStoreTrialActions.ts'), 'utf8');
        expect(trial).toContain('createCriminalTrialVerdictCardActions');
        expect(trial).toContain('createCriminalTrialEvidenceActions');
        expect(trial).not.toContain('updateVerdictCardDraft:');
        expect(trial.split(/\r?\n/).length).toBeLessThan(560);
        expect(fs.existsSync(path.join(cs, 'criminalStoreTrialVerdictCardActions.ts'))).toBe(true);
        expect(fs.existsSync(path.join(cs, 'criminalStoreSeizedAssetActions.ts'))).toBe(true);
    });

    it('party status يركّب seized assets ولا يعرّفها محلياً', () => {
        const party = fs.readFileSync(path.join(cs, 'criminalStorePartyStatusActions.ts'), 'utf8');
        expect(party).toContain('createCriminalSeizedAssetActions');
        expect(party).not.toContain('addDefendantSeizedAssets:');
        expect(party.split(/\r?\n/).length).toBeLessThan(500);
    });

    it('لا يوجد criminalStore.ts.bak-7f', () => {
        expect(fs.existsSync(path.join(cs, 'criminalStore.ts.bak-7f'))).toBe(false);
    });

    it('HomeTab يسحب إشارات المنتدى عبر جزيرة lazy', () => {
        const home = readHomeTabImplSource(root);
        expect(home).toContain('HomeForumSignalsIsland');
        expect(home).not.toMatch(/from ['"]@\/app\/hooks\/useForumUnreadCount['"]/);
        expect(home).not.toMatch(/from ['"]@\/app\/hooks\/useForumNotificationStream['"]/);
        expect(home).toContain('forumSignalsEnabled');
    });
});
