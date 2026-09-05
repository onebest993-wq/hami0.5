/**
 * قسم التقويم: لا KV ولا `/api/calendar`. التشفير المحلي يبقى.
 * المزامنة الشاملة: شريحة داخل نقطة الحفظ المشفّرة فقط.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    isSensitiveStorageKey,
    shouldEncryptValue,
} from '@/app/services/secureStorageKeys';
import { isCalendarNeverCloudKvMaterial } from '@/app/security/kvProxyKeyOwnership';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('calendar network isolation (encryption kept)', () => {
    it('مفاتيح التقويم حسّاسة وتُشفَّر — لا استثناء plaintext', () => {
        for (const key of ['hami:calendar:events:v1', 'hami:calendar:tombstones:v1'] as const) {
            expect(isSensitiveStorageKey(key)).toBe(true);
            expect(shouldEncryptValue(key, '[{"title":"جلسة"}]')).toBe(true);
        }
    });

    it('CalendarDB بلا KV وبلا بوابة سحابة وبلا /api', () => {
        const calendar = read('src/app/services/cloud/lawyerCalendarCloud.ts');
        expect(calendar).not.toContain('lawyerCloudKv');
        expect(calendar).not.toContain('isLawyerWorkCloudLive');
        expect(calendar).not.toContain('fetchPrefixOnceInTick');
        expect(calendar).not.toContain('SecureAPIClient');
        expect(calendar).not.toContain('/api/');
        expect(calendar).toContain('persistSecurePayloadWhenReady');
        expect(calendar).toContain('calendarTombstones');
        expect(calendar).not.toContain('CryptoService');
        expect(calendar).not.toContain('encryptData');
        expect(calendar).toContain('hop مزدوجاً عمداً');
        expect(read('src/app/services/calendar/calendarCloudRuntime.ts')).toContain('hop ثانٍ');
    });

    it('شواهد الحذف محلية — لا WIFE على مسار التقويم', () => {
        const tomb = read('src/app/services/calendarTombstones.ts');
        expect(tomb).not.toContain('SecureAPIClient');
        expect(tomb).not.toContain('/api/calendar/tombstones');
        expect(tomb).not.toContain('isLawyerWorkCloudLive');
        expect(tomb).not.toContain('canReachProtectedServerNetwork');
        expect(tomb).toContain('CALENDAR_TOMBSTONES_STORAGE_KEY');
        expect(tomb).toContain('SecureStoreService');
        expect(read('src/app/services/calendar/calendarStorageKeys.ts')).toContain(
            'hami:calendar:tombstones:v1',
        );
    });

    it('لا مسار BFF للتقويم ولا سكربتات تقسيم يتيمة — authorship مصدر واحد', () => {
        expect(existsSync(join(root, 'src/app/api/calendar/tombstones/route.ts'))).toBe(false);
        const tombstonesSql = read(
            'supabase/migrations/20260830020000_calendar_tombstones_local_only_leftover.sql',
        );
        expect(tombstonesSql).toContain('calendar_tombstones_select_own');
        expect(tombstonesSql).toContain('deny_clients_calendar_tombstones');
        expect(tombstonesSql).not.toMatch(/DROP TABLE\s+public\.calendar_tombstones/i);
        expect(existsSync(join(root, 'src/app/services/calendar/calendarEventAuthorship.ts'))).toBe(
            true,
        );
        expect(existsSync(join(root, 'scripts/split-calendar-bridge.mjs'))).toBe(false);
        expect(existsSync(join(root, 'scripts/split-calendar-dossier-sync.mjs'))).toBe(false);
        expect(existsSync(join(root, 'scripts/split-calendar-bridge-persistence.mjs'))).toBe(false);
        const features = read('src/app/services/secureApiNetworkFeatures.ts');
        expect(features).not.toContain('/api/calendar/');
        const redTeam = read('src/app/security/__tests__/wifeRedTeamHelpers.ts');
        expect(redTeam).not.toContain('/api/calendar/tombstones');
        const snapshot = read('src/app/services/calendar/calendarLocalSnapshot.ts');
        expect(snapshot).not.toContain('mirrorCalendarEventsToLocalStorage');
        expect(snapshot).not.toContain('hasLocalCalendarSnapshot');
        const core = read('src/app/services/calendar/bridge/core.ts');
        expect(core).not.toContain('getCanonicalCalendarUserId');
        const authenticity = read('src/app/services/calendarAuthenticity.ts');
        expect(authenticity).toContain("from '@/app/services/calendar/calendarEventAuthorship'");
        expect(authenticity).not.toContain('export function isUserAuthoredBridgedCalendarEvent');
        const authorship = read('src/app/services/calendar/calendarEventAuthorship.ts');
        expect(authorship).toContain("from '@/app/services/calendar/bridgePersistence/lite'");
    });

    it('KV وBFF يرفضان مادة التقويم حتى ومزامنة العمل حيّة', () => {
        expect(isCalendarNeverCloudKvMaterial('calendar:u1:e1')).toBe(true);
        const kv = read('src/app/services/cloud/lawyerCloudKv.ts');
        expect(kv).toContain('isCalendarNeverCloudKvMaterial');
        expect(kv).toMatch(/if\s*\(\s*isCalendarNeverCloudKvMaterial\(material\)\s*\)/);
        const proxy = read('src/app/api/kv-proxy/route.ts');
        expect(proxy).toContain('rejectCalendarCloudKv');
        expect(proxy).toContain('calendar is local-only');
        const gate = read('src/app/services/settings/lawyerWorkCloudGate.ts');
        expect(gate).toContain('isCalendarNeverCloudKvMaterial');
        const checkpoint = read('src/app/services/cloud/workCloudCheckpoint.ts');
        expect(checkpoint).toContain('collectCalendarCheckpointSlice');
        expect(checkpoint).toContain('calendarTombstones');
        expect(checkpoint).toContain("isLiveCloudSyncBucketEnabled('files')");
        expect(checkpoint).toContain('hasLocalWorkDossiers');
        expect(checkpoint).toContain('CALENDAR_EVENTS_STORAGE_KEY');
        expect(checkpoint).toContain('calendarOmittedForBudget');
        expect(checkpoint).toContain('retryable');
        expect(checkpoint).toContain('keep_anchor');
        expect(checkpoint).not.toContain('lawyerCloudKv');
        expect(checkpoint).not.toMatch(/['"]hami:calendar:events:v1['"]/);
        const slice = read('src/app/services/cloud/workCloudCheckpointCalendar.ts');
        expect(slice).toContain('lawyerCalendarCloud');
        expect(slice).not.toContain('lawyerCloudKv');
        expect(slice).not.toContain('/api/kv-proxy');
        expect(slice).not.toMatch(/['"]\/api\/calendar/);
        expect(slice).toContain('excludeTombstonedCalendarEvents');
        expect(slice).toContain('filterCalendarSliceForUser');
        expect(slice).toContain('resolveLiveAuthUserIdForStorage');
        const checkpointRoute = read('src/app/api/work-checkpoints/route.ts');
        expect(checkpointRoute).not.toMatch(/calendar/i);
        expect(checkpointRoute).toContain('encrypted_data');
        expect(checkpointRoute).toContain('checkpoints');
        expect(checkpointRoute).toContain('KEEP_LATEST');
        expect(checkpointRoute).toContain('keep_anchor');
        expect(read('src/app/api/work-checkpoints/workCheckpointRetention.ts')).not.toMatch(
            /calendar/i,
        );
        const history = read('src/app/services/cloud/workCloudCheckpointHistory.ts');
        expect(history).toContain('composeRestorePayload');
        expect(history).toContain('stripCalendarFromCheckpoint');
    });

    it('مزامنة الإضبارة → التقويم محلية بلا kv-proxy', () => {
        const orch = read('src/app/services/calendar/dossierSync/orchestrator.ts');
        expect(orch).not.toContain('lawyerCloudKv');
        expect(orch).not.toContain('/api/kv-proxy');
        expect(orch).not.toContain('/api/calendar/');
        expect(orch).toContain('syncOneLawsuitFile');
        expect(orch).toContain('syncOneExecutionFile');
    });
});
