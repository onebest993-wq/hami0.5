import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
    detectEarlyAndroidCapacitorShell,
    getCapacitorPlatformId,
    isCapacitorNativePlatform,
    readNativePlatformFromDom,
} from '@/app/runtime/nativePlatform';
import { applyCapacitorShellBoot } from '@/app/runtime/capacitorShellBoot';

describe('nativePlatform', () => {
    beforeEach(() => {
        document.documentElement.removeAttribute('data-hami-native');
        document.documentElement.removeAttribute('data-hami-platform');
        document.documentElement.classList.remove('hami-native-shell');
        delete (window as Window & { Capacitor?: unknown }).Capacitor;
    });

    afterEach(() => {
        delete (window as Window & { Capacitor?: unknown }).Capacitor;
    });

    it('reads native platform from DOM dataset', () => {
        document.documentElement.dataset.hamiNative = '1';
        document.documentElement.dataset.hamiPlatform = 'ios';
        expect(readNativePlatformFromDom()).toBe('ios');
        expect(isCapacitorNativePlatform()).toBe(true);
    });

    it('detects Capacitor global when DOM unset', () => {
        (window as Window & { Capacitor?: { isNativePlatform: () => boolean; getPlatform: () => string } }).Capacitor =
            {
                isNativePlatform: () => true,
                getPlatform: () => 'android',
            };
        expect(isCapacitorNativePlatform()).toBe(true);
        expect(getCapacitorPlatformId()).toBe('android');
    });
});

describe('applyCapacitorShellBoot', () => {
    beforeEach(() => {
        document.documentElement.removeAttribute('data-hami-native');
        document.documentElement.removeAttribute('data-hami-platform');
        document.documentElement.classList.remove('hami-native-shell');
        delete (window as Window & { Capacitor?: unknown }).Capacitor;
        restoreNavigatorAndLocation();
    });

    afterEach(() => {
        restoreNavigatorAndLocation();
        delete (window as Window & { Capacitor?: unknown }).Capacitor;
    });

    it('marks document root on native Capacitor', () => {
        (window as Window & { Capacitor?: { isNativePlatform: () => boolean; getPlatform: () => string } }).Capacitor =
            {
                isNativePlatform: () => true,
                getPlatform: () => 'ios',
            };
        applyCapacitorShellBoot();
        expect(document.documentElement.dataset.hamiNative).toBe('1');
        expect(document.documentElement.dataset.hamiPlatform).toBe('ios');
        expect(document.documentElement.classList.contains('hami-native-shell')).toBe(true);
    });

    it('marks web when not native', () => {
        applyCapacitorShellBoot();
        expect(document.documentElement.dataset.hamiNative).toBe('0');
        expect(document.documentElement.dataset.hamiPlatform).toBe('web');
    });

    it('marks Android from WebView UA before Capacitor global', () => {
        stubUserAgent(
            'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.122 Mobile Safari/537.36; wv)',
        );
        applyCapacitorShellBoot();
        expect(document.documentElement.dataset.hamiNative).toBe('1');
        expect(document.documentElement.dataset.hamiPlatform).toBe('android');
    });

    it('marks Android from https://localhost scheme + Android UA', () => {
        stubUserAgent(
            'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
        );
        stubLocation({ protocol: 'https:', hostname: 'localhost', port: '' });
        applyCapacitorShellBoot();
        expect(document.documentElement.dataset.hamiNative).toBe('1');
        expect(document.documentElement.dataset.hamiPlatform).toBe('android');
    });

    it('does not treat Vite http://localhost:port as native', () => {
        stubUserAgent(
            'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
        );
        stubLocation({ protocol: 'http:', hostname: 'localhost', port: '8080' });
        applyCapacitorShellBoot();
        expect(document.documentElement.dataset.hamiNative).toBe('0');
        expect(document.documentElement.dataset.hamiPlatform).toBe('web');
        expect(document.documentElement.getAttribute('data-hami-app')).toBe('handheld');
    });
});

describe('detectEarlyAndroidCapacitorShell', () => {
    beforeEach(() => {
        document.documentElement.removeAttribute('data-hami-native');
        document.documentElement.removeAttribute('data-hami-platform');
        document.documentElement.classList.remove('hami-native-shell');
        delete (window as Window & { Capacitor?: unknown }).Capacitor;
        restoreNavigatorAndLocation();
    });

    afterEach(() => {
        restoreNavigatorAndLocation();
        delete (window as Window & { Capacitor?: unknown }).Capacitor;
    });

    it('is false on desktop jsdom', () => {
        expect(detectEarlyAndroidCapacitorShell()).toBe(false);
        expect(isCapacitorNativePlatform()).toBe(false);
        expect(getCapacitorPlatformId()).toBe('web');
    });

    it('is true for Android WebView UA', () => {
        stubUserAgent(
            'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.122 Mobile Safari/537.36; wv)',
        );
        expect(detectEarlyAndroidCapacitorShell()).toBe(true);
        expect(isCapacitorNativePlatform()).toBe(true);
        expect(getCapacitorPlatformId()).toBe('android');
    });
});

const originalUa = navigator.userAgent;
const originalLocation = window.location;

function stubUserAgent(value: string): void {
    Object.defineProperty(navigator, 'userAgent', {
        configurable: true,
        value,
    });
}

function stubLocation(partial: { protocol: string; hostname: string; port: string }): void {
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: {
            ...originalLocation,
            protocol: partial.protocol,
            hostname: partial.hostname,
            port: partial.port,
            href: `${partial.protocol}//${partial.hostname}${partial.port ? `:${partial.port}` : ''}/`,
        },
    });
}

function restoreNavigatorAndLocation(): void {
    Object.defineProperty(navigator, 'userAgent', {
        configurable: true,
        value: originalUa,
    });
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
    });
}
