import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function read(rel: string): string {
    return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
}

describe('HQ session continuity', () => {
    it('skips login and OTP while the device stays trusted; OTP returns only after a successful end-session revoke', () => {
        const inner = read('src/app/surface/inner.tsx');
        expect(inner.indexOf('if (skipTrustedDevice)')).toBeLessThan(inner.indexOf('if (pending && !allowed)'));
        expect(inner.indexOf('if (allowed) {')).toBeLessThan(inner.indexOf('if (needsLogin)'));
        expect(inner).toContain('skipLiveProbe');
        expect(inner).toContain('devSessionReady');
        expect(inner).toContain('skipTrustedDevice && !devSessionReady');
        expect(inner).toContain('return <>{fallback}</>');

        const panelLoad = read('src/app/components/admin/useHqPanelLoad.ts');
        expect(panelLoad).toContain('alreadySettled');
        expect(panelLoad).toContain('skipFirstWork');

        const gate = read('src/app/components/admin/RequireTrustedDevice.tsx');
        expect(gate).toContain("probe === 'trusted'");
        expect(gate).toContain("setTrusted(true)");
        expect(gate).toContain('isDeviceTrustedLocally');
        expect(gate).toContain("probe === 'untrusted'");
        expect(gate).toContain("setPhase('request')");
        expect(gate.split("probe === 'untrusted'")[1]?.slice(0, 280) ?? '').not.toContain('revokeDeviceTrust');

        const sessionChunk = gate.split("probe === 'session_required'")[1]?.slice(0, 500) ?? '';
        expect(sessionChunk).toContain('setVerifyNeedsLogin(true)');
        expect(sessionChunk).not.toContain('onSessionRequiredRef.current');

        const unavailableAt = gate.lastIndexOf("probe === 'unavailable'");
        const unavailableHandler = gate.slice(unavailableAt, unavailableAt + 420);
        expect(unavailableHandler).toContain("setError('تعذّر التحقق من الجهاز الموثّق");
        expect(unavailableHandler).not.toContain("setPhase('request')");

        const endSession = read('src/app/services/admin/endHeadquartersTrustedSession.ts');
        expect(endSession.indexOf('hqMutatingFetch')).toBeLessThan(endSession.indexOf('revokeDeviceTrust'));
        expect(endSession).toContain('if (!data?.ok) return { revoked: false }');
        expect(endSession).toContain('clearPrimedHeadquartersStatus');

        const statusHook = read('src/app/components/admin/useHeadquartersStatus.ts');
        expect(statusHook).toContain('peekPrimedHeadquartersStatus');

        const dash = read('src/app/components/AdminDashboard.tsx');
        expect(dash).toContain('isHqAdminLiveReady');
        expect(dash).toContain('gated={!liveReady}');
        expect(dash).toContain('skipFetch={!liveReady}');
        expect(dash).toContain('if (!revoked)');
        expect(dash).toContain('return;');
        expect(dash).toContain('onLogout()');
        expect(dash).not.toContain('غادرت المقر.');
        expect(dash.indexOf('if (!revoked)')).toBeLessThan(dash.indexOf('onLogout()'));
    });

    it('does not auto-send a new OTP when the trust probe cannot be reached', () => {
        const gate = read('src/app/components/admin/RequireTrustedDevice.tsx');
        expect(gate).toContain('admin-otp-retry-probe');
        expect(gate).toContain('UNOBTAINABLE_PROBE_RETRY_MS');
        expect(gate).toContain('setProbeEpoch');
    });
});
