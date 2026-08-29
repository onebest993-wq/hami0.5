import { describe, expect, it } from 'vitest';
import {
    formatHqNetworkPlace,
    isHqPrivateNetworkIp,
    parseHqDeviceFromUserAgent,
    sanitizeHqIp,
} from '@/app/domain/admin/hqConnectionSignal';

const ANDROID_WV =
    'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36';
const IPHONE =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const DESKTOP =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

describe('hqConnectionSignal', () => {
    it('يصنّف نوع الجهاز دون الاحتفاظ ببصمة وكيل كاملة', () => {
        expect(parseHqDeviceFromUserAgent(ANDROID_WV).deviceLabel).toBe('هاتف أندرويد');
        expect(parseHqDeviceFromUserAgent(IPHONE).deviceClass).toBe('ios');
        expect(parseHqDeviceFromUserAgent(DESKTOP).deviceLabel).toBe('حاسوب ويندوز');
        expect(parseHqDeviceFromUserAgent('okhttp/4.12.0').deviceLabel).toContain('حامٍ');
        expect(parseHqDeviceFromUserAgent(ANDROID_WV, { capacitor: 'true' }).deviceLabel).toBe(
            'هاتف أندرويد — حامٍ',
        );
    });

    it('يميّز الشبكة الخاصة ولا يقبل عنواناً تالفاً', () => {
        expect(sanitizeHqIp('203.0.113.10')).toBe('203.0.113.10');
        expect(sanitizeHqIp('unknown')).toBeNull();
        expect(sanitizeHqIp('1.2.3.999')).toBeNull();
        expect(isHqPrivateNetworkIp('192.168.1.8')).toBe(true);
        expect(isHqPrivateNetworkIp('203.0.113.10')).toBe(false);
        expect(formatHqNetworkPlace({ ip: '10.0.0.2' })).toBe('شبكة خاصة');
        expect(formatHqNetworkPlace({ ip: '203.0.113.10', countryCode: 'IQ', city: 'Baghdad' })).toBe(
            'بغداد، العراق',
        );
        expect(formatHqNetworkPlace({ ip: '203.0.113.10' })).toBe('عنوان عام — بلا تقدير بلد');
    });
});
