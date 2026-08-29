import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    installWifeFetchGuard,
    resetWifeFetchGuardForTests,
} from '@/app/security/wifeFetchGuard';
import { isLocalOnlyModeEnabled, LocalOnlyNetworkError } from '@/app/services/settings/localOnlyGuard';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '@/app/services/settings/defaults';
import {
    armLocalOnlyNetworkIsolation,
    installLocalOnlyNetworkIsolation,
    resetLocalOnlyNetworkIsolationForTests,
    syncLocalOnlyFlagFromSettings,
} from '@/app/services/settings/localOnlyNetworkIsolation';

const offSettings = {
    ...LAWYER_SETTINGS_V2_DEFAULTS,
    security: { ...LAWYER_SETTINGS_V2_DEFAULTS.security, localOnlyMode: false },
};

class FakeWebSocket {
    url: string;
    constructor(url: string) {
        this.url = url;
    }
}

class FakeEventSource {
    url: string;
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSED = 2;
    constructor(url: string) {
        this.url = url;
    }
}

describe('localOnlyNetworkIsolation', () => {
    beforeEach(() => {
        resetLocalOnlyNetworkIsolationForTests();
        resetWifeFetchGuardForTests();
        window.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
        window.EventSource = FakeEventSource as unknown as typeof EventSource;
        navigator.sendBeacon = vi.fn(() => true);
        window.RTCPeerConnection = function NativeRtc() {} as unknown as typeof RTCPeerConnection;
        window.open = vi.fn(() => ({ closed: false }) as unknown as Window);
        installLocalOnlyNetworkIsolation();
        installWifeFetchGuard();
    });

    afterEach(() => {
        resetLocalOnlyNetworkIsolationForTests();
        resetWifeFetchGuardForTests();
        vi.restoreAllMocks();
    });

    it('يقطع fetch/XHR/WebSocket فوراً عبر علم DOM قبل snapshot', async () => {
        armLocalOnlyNetworkIsolation(true);
        expect(document.documentElement.dataset.hamiLocalOnly).toBe('1');
        expect(isLocalOnlyModeEnabled(offSettings)).toBe(true);

        await expect(fetch('https://project.supabase.co/rest/v1/cases')).rejects.toMatchObject({
            name: 'LocalOnlyNetworkError',
        });

        expect(() => new XMLHttpRequest().open('GET', 'https://api.example.com/v1')).toThrow(
            /قطع الاتصال/,
        );

        expect(() => new WebSocket('wss://project.supabase.co/realtime/v1')).toThrow(/قطع الاتصال/);
    });

    it('يقطع EventSource وsendBeacon أثناء التسليح', () => {
        armLocalOnlyNetworkIsolation(true);
        expect(() => new EventSource('https://project.supabase.co/events')).toThrow(/قطع الاتصال/);
        expect(navigator.sendBeacon('https://project.supabase.co/t', 'x')).toBe(false);
    });

    it('لا يخفض العلم من لقطة إعدادات مطفأة بعد تسليح صريح', () => {
        armLocalOnlyNetworkIsolation(true);
        syncLocalOnlyFlagFromSettings(false);
        expect(document.documentElement.dataset.hamiLocalOnly).toBe('1');
        expect(isLocalOnlyModeEnabled(offSettings)).toBe(true);
        expect(() => new XMLHttpRequest().open('GET', 'https://api.example.com/v1')).toThrow(
            /قطع الاتصال/,
        );
    });

    it('يمنع صورة خارجية عبر src وsetAttribute', () => {
        armLocalOnlyNetworkIsolation(true);
        const img = document.createElement('img');
        img.src = 'https://cdn.example/a.png';
        expect(img.getAttribute('src')).not.toBe('https://cdn.example/a.png');
        img.setAttribute('src', 'https://cdn.example/b.png');
        expect(img.getAttribute('src')).not.toBe('https://cdn.example/b.png');
        img.src = '/assets/logo.png';
        expect(img.getAttribute('src') ?? img.src).toContain('/assets/logo.png');
    });

    it('يمنع RTCPeerConnection أثناء التسليح', () => {
        armLocalOnlyNetworkIsolation(true);
        expect(() => new RTCPeerConnection()).toThrow(LocalOnlyNetworkError);
    });

    it('يبقي العزل إذا صُفِّر dataset بينما علم القرص قائم', () => {
        armLocalOnlyNetworkIsolation(true);
        document.documentElement.dataset.hamiLocalOnly = '0';
        expect(isLocalOnlyModeEnabled(offSettings)).toBe(true);
        expect(() => new XMLHttpRequest().open('GET', 'https://api.example.com/v1')).toThrow(
            /قطع الاتصال/,
        );
    });

    it('يمنع window.open الخارجي ويسمح بالمسار المحلي', () => {
        armLocalOnlyNetworkIsolation(true);
        expect(window.open('https://evil.test/exfil')).toBeNull();
        expect(window.open('/dashboard')).not.toBeNull();
    });

    it('يمنع نقرة رابط خارجي', () => {
        armLocalOnlyNetworkIsolation(true);
        const anchor = document.createElement('a');
        anchor.href = 'https://evil.test/leak';
        document.body.appendChild(anchor);
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        anchor.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
        anchor.remove();
    });

    it('يمنع صورة خلفية CSS خارجية', () => {
        armLocalOnlyNetworkIsolation(true);
        const el = document.createElement('div');
        el.style.setProperty('background-image', 'url("https://cdn.example/x.png")');
        expect(el.style.backgroundImage).not.toContain('cdn.example');
        el.style.setProperty('background-image', 'url("/assets/logo.png")');
        expect(el.style.backgroundImage).toContain('/assets/logo.png');
    });

    it('ينزع src خارجي أُدخل عبر innerHTML', async () => {
        armLocalOnlyNetworkIsolation(true);
        const holder = document.createElement('div');
        document.body.appendChild(holder);
        holder.innerHTML = '<img src="https://cdn.example/leak.png" alt="">';
        const img = holder.querySelector('img');
        await vi.waitFor(() => {
            expect(img?.getAttribute('src')).not.toBe('https://cdn.example/leak.png');
        });
        holder.remove();
    });

    it('يسمح بأصول التطبيق بعد إطفاء العلم', async () => {
        armLocalOnlyNetworkIsolation(true);
        armLocalOnlyNetworkIsolation(false);
        expect(document.documentElement.dataset.hamiLocalOnly).toBe('0');

        const xhr = new XMLHttpRequest();
        expect(() => xhr.open('GET', '/assets/chunk.js')).not.toThrow();
    });
});
