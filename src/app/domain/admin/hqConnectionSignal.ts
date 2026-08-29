import { stripHqControlChars } from '@/app/domain/admin/hqSafeText';

export type HqDeviceClass = 'android' | 'ios' | 'windows' | 'macos' | 'linux' | 'web' | 'unknown';

export type HqConnectionSource = 'login' | 'signup' | 'refresh' | 'session';

export type HqConnectionFact = {
    at: string;
    deviceLabel: string;
    ip: string | null;
    place: string;
    source: HqConnectionSource;
};

const COUNTRY_AR: Record<string, string> = {
    IQ: 'العراق',
    SA: 'السعودية',
    AE: 'الإمارات',
    KW: 'الكويت',
    QA: 'قطر',
    BH: 'البحرين',
    OM: 'عُمان',
    JO: 'الأردن',
    SY: 'سوريا',
    LB: 'لبنان',
    EG: 'مصر',
    TR: 'تركيا',
    IR: 'إيران',
    US: 'الولايات المتحدة',
    GB: 'بريطانيا',
    DE: 'ألمانيا',
    FR: 'فرنسا',
};

const CITY_AR: Record<string, string> = {
    baghdad: 'بغداد',
    basra: 'البصرة',
    basrah: 'البصرة',
    erbil: 'أربيل',
    irbil: 'أربيل',
    mosul: 'الموصل',
    najaf: 'النجف',
    karbala: 'كربلاء',
    kirkuk: 'كركوك',
    sulaymaniyah: 'السليمانية',
    suleimaniya: 'السليمانية',
};

export function sanitizeHqIp(raw: unknown): string | null {
    const text = String(raw ?? '').trim().replace(/^\[|\]$/g, '');
    if (!text || text === 'unknown' || text.length > 45) return null;
    if (text.includes('/') || text.includes(' ')) return null;
    const v4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
    const v6 = /^[0-9a-f:]+$/i;
    if (!v4.test(text) && !v6.test(text)) return null;
    if (v4.test(text) && text.split('.').some((part) => Number(part) > 255)) return null;
    return text;
}

export function isHqPrivateNetworkIp(ip: string): boolean {
    const value = ip.trim().toLowerCase();
    if (value === '::1' || value === '127.0.0.1') return true;
    if (value.startsWith('10.')) return true;
    if (value.startsWith('192.168.')) return true;
    if (value.startsWith('169.254.')) return true;
    if (value.startsWith('fe80:') || value.startsWith('fc') || value.startsWith('fd')) return true;
    const parts = value.split('.');
    if (parts.length === 4 && parts[0] === '172') {
        const second = Number(parts[1]);
        return second >= 16 && second <= 31;
    }
    return false;
}

export function parseHqDeviceFromUserAgent(
    raw: unknown,
    extras?: { capacitor?: string | null; requestedWith?: string | null },
): { deviceClass: HqDeviceClass; deviceLabel: string } {
    const ua = String(raw ?? '');
    const capacitor = Boolean(extras?.capacitor?.trim()) || /Capacitor/i.test(ua);
    const hami = extras?.requestedWith?.trim().toLowerCase() === 'iq.hami.legal';
    const native = capacitor || hami || /\bokhttp\b/i.test(ua);
    const suffix = native ? ' — حامٍ' : '';

    if (/\b(iPhone|iPod)\b/i.test(ua)) {
        return { deviceClass: 'ios', deviceLabel: `آيفون${suffix}` };
    }
    if (/\biPad\b/i.test(ua)) {
        return { deviceClass: 'ios', deviceLabel: `آيباد${suffix}` };
    }
    if (/Android/i.test(ua) || /\bokhttp\b/i.test(ua)) {
        return { deviceClass: 'android', deviceLabel: `هاتف أندرويد${suffix}` };
    }
    if (/Windows NT/i.test(ua)) {
        return { deviceClass: 'windows', deviceLabel: 'حاسوب ويندوز' };
    }
    if (/Mac OS X|Macintosh/i.test(ua) && !/Mobile/i.test(ua)) {
        return { deviceClass: 'macos', deviceLabel: 'حاسوب ماك' };
    }
    if (/Linux/i.test(ua) && !/Android/i.test(ua)) {
        return { deviceClass: 'linux', deviceLabel: 'حاسوب لينكس' };
    }
    if (native) {
        return { deviceClass: 'unknown', deviceLabel: 'تطبيق حامٍ' };
    }
    if (ua.trim()) {
        return { deviceClass: 'web', deviceLabel: 'متصفح' };
    }
    return { deviceClass: 'unknown', deviceLabel: 'جهاز غير معروف' };
}

export function parseHqDeviceFromRequest(request: Request): {
    deviceClass: HqDeviceClass;
    deviceLabel: string;
} {
    return parseHqDeviceFromUserAgent(request.headers.get('user-agent'), {
        capacitor: request.headers.get('x-capacitor'),
        requestedWith: request.headers.get('x-requested-with'),
    });
}

export function readHqEdgeCountry(request: Request): string | null {
    const raw =
        request.headers.get('x-vercel-ip-country') ||
        request.headers.get('cf-ipcountry') ||
        '';
    const code = raw.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code) || code === 'XX' || code === 'T1') return null;
    return code;
}

export function readHqEdgeCity(request: Request): string | null {
    const raw = request.headers.get('x-vercel-ip-city') || request.headers.get('cf-ipcity') || '';
    let decoded = raw.trim();
    if (!decoded) return null;
    try {
        decoded = decodeURIComponent(decoded);
    } catch {
        /* يبقى النص الخام */
    }
    const cleaned = stripHqControlChars(decoded, 80);
    return cleaned || null;
}

export function hqCountryLabel(code: string | null | undefined): string | null {
    const key = String(code ?? '').trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(key)) return null;
    return COUNTRY_AR[key] ?? key;
}

export function hqCityLabel(city: string | null | undefined): string | null {
    const cleaned = stripHqControlChars(city, 40);
    if (!cleaned) return null;
    const mapped = CITY_AR[cleaned.toLowerCase()];
    return mapped || cleaned;
}

export function formatHqNetworkPlace(input: {
    ip: string | null;
    countryCode?: string | null;
    city?: string | null;
}): string {
    if (input.ip && isHqPrivateNetworkIp(input.ip)) return 'شبكة خاصة';
    const country = hqCountryLabel(input.countryCode);
    const city = hqCityLabel(input.city);
    if (city && country) return `${city}، ${country}`;
    if (country) return country;
    if (input.ip) return 'عنوان عام — بلا تقدير بلد';
    return 'غير معروف';
}

export function formatHqConnectionDetail(fact: Pick<HqConnectionFact, 'deviceLabel' | 'ip' | 'place'>): string {
    return [fact.deviceLabel, fact.ip, fact.place].filter(Boolean).join(' · ');
}
