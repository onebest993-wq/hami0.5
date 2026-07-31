import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cs = path.join(root, 'src/app/components/lawyer/criminal-system');

describe('wave7k final mega honesty', () => {
    it('concludeStage يركّب referCaseToTrial', () => {
        const t = fs.readFileSync(path.join(cs, 'criminalStoreConcludeStageActions.ts'), 'utf8');
        expect(t).toContain('createCriminalReferCaseToTrialActions');
        expect(t).not.toContain('referCaseToTrial:');
        expect(fs.existsSync(path.join(cs, 'criminalStoreReferCaseToTrialActions.ts'))).toBe(true);
    });

    it('defendant draft يركّب unknown identity', () => {
        const t = fs.readFileSync(path.join(cs, 'criminalStoreSessionDraftDefendantActions.ts'), 'utf8');
        expect(t).toContain('createCriminalSessionDraftUnknownDefendantActions');
        expect(t).not.toContain('setUnknownDefendant:');
        expect(t.split(/\r?\n/).length).toBeLessThan(400);
    });

    it('warm TTFI script يطابق إعدادات cold (dock + strip failure)', () => {
        const t = fs.readFileSync(path.join(root, 'scripts/boot-ttfi-warm.mjs'), 'utf8');
        expect(t).toContain('dockVisible: true');
        expect(t).toContain('hami-boot-failure');
        expect(t).toContain('timeout: 90_000');
        expect(t).toContain('assertPortFree');
        expect(t).toContain('**/sw.js');
    });

    it('cap bake يفحص checkBiometry كـ hardware probe', () => {
        const t = fs.readFileSync(path.join(root, 'scripts/wave6-cap-section-bake.mjs'), 'utf8');
        expect(t).toContain('biometric-hardware-probe');
        expect(t).toContain('checkBiometry');
    });

    it('شارة المنتدى تُصدَّر من leaf events لا من LawyerDashboard عبر SAC', () => {
        const readSync = fs.readFileSync(
            path.join(root, 'src/app/services/notifications/notificationReadSync.ts'),
            'utf8',
        );
        const bg = fs.readFileSync(
            path.join(root, 'src/app/services/notifications/notificationBackgroundSync.ts'),
            'utf8',
        );
        const stream = fs.readFileSync(
            path.join(root, 'src/app/services/forum/ForumNotificationStreamService.ts'),
            'utf8',
        );
        const bridge = fs.readFileSync(
            path.join(root, 'src/app/services/forum/forumNotificationBridge.ts'),
            'utf8',
        );
        expect(readSync).toContain("from '@/app/services/forum/forumNotificationEvents'");
        expect(readSync).not.toMatch(/emitForumUnreadCount.*forumNotificationBridge/);
        expect(bg).toContain("from '@/app/services/forum/forumNotificationEvents'");
        expect(stream).toContain("from '@/app/services/forum/forumNotificationEvents'");
        expect(bridge).toContain("from '@/app/services/forum/forumNotificationEvents'");
        expect(bridge).not.toContain('window.dispatchEvent');
        const gate = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/hubArchivePrefetchGate.ts'),
            'utf8',
        );
        expect(gate).toContain("import('@/app/utils/lazyComponents')");
        expect(gate).not.toMatch(/from ['"]@\/app\/utils\/lazyComponents['"]/);
    });
});
