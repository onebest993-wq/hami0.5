import type { ProfileAction, ProfileLocationMode } from '@/app/services/profile/profileTypes';

export type ProfileContactOpenResult = 'opened' | 'invalid' | 'display_only';

function digitsOnlyPhone(value: string): string {
    return value.replace(/[^\d+]/g, '');
}

function isLatLngPair(value: string): boolean {
    return /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(value.trim());
}

function parseLatLng(value: string): { lat: number; lng: number } | null {
    const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (!match) return null;
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
}

export function resolveLocationMode(action: ProfileAction): ProfileLocationMode {
    if (action.type !== 'location') return 'manual';
    if (action.locationMode === 'gps' || action.locationMode === 'manual') {
        return action.locationMode;
    }
    return isLatLngPair(action.value) ? 'gps' : 'manual';
}

export function isIosDevice(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/i.test(navigator.userAgent);
}

export function isMobileDevice(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/** تنسيق رقم للاتصال — يدعم الأرقام العراقية المحلية */
export function normalizeTelHref(raw: string): string | null {
    let tel = digitsOnlyPhone(raw.trim());
    if (!tel) return null;

    if (tel.startsWith('00')) {
        tel = `+${tel.slice(2)}`;
    } else if (tel.startsWith('0') && !tel.startsWith('+')) {
        tel = `+964${tel.slice(1)}`;
    } else if (!tel.startsWith('+') && tel.length >= 9) {
        tel = `+${tel}`;
    }

    const digitCount = tel.replace(/\D/g, '').length;
    if (digitCount < 7) return null;
    return `tel:${tel}`;
}

function buildMapsSearchTarget(query: string): string | null {
    const trimmed = query.trim();
    if (!trimmed) return null;
    const encoded = encodeURIComponent(trimmed);
    if (isIosDevice()) {
        return `https://maps.apple.com/?q=${encoded}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}

function buildMapsCoordinateTarget(lat: number, lng: number): string {
    if (isIosDevice()) {
        return `https://maps.apple.com/?ll=${lat},${lng}&q=${lat},${lng}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/** يفتح روابط tel/mailto/geo عبر معالج النظام — احتياطي عند عدم استخدام <a href> */
export function openNativeScheme(url: string): void {
    if (typeof window === 'undefined') return;

    if (isMobileDevice()) {
        window.location.assign(url);
        return;
    }

    if (typeof document === 'undefined') return;
    const link = document.createElement('a');
    link.href = url;
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
}

export function buildProfileContactTarget(action: ProfileAction): string | null {
    const raw = action.value.trim();
    if (!raw) return null;

    switch (action.type) {
        case 'call':
            return normalizeTelHref(raw);
        case 'email': {
            const email = raw.replace(/\s+/g, '');
            if (/[\r\n]/.test(email)) return null;
            if (!email.includes('@')) return null;
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
            return `mailto:${email}`;
        }
        case 'whatsapp': {
            let digits = raw.replace(/\D/g, '');
            if (digits.startsWith('0')) {
                digits = `964${digits.slice(1)}`;
            }
            if (digits.length < 8) return null;
            return `https://wa.me/${digits}`;
        }
        case 'website': {
            const rawHost = raw.replace(/^https?:\/\//i, '').split('/')[0]?.split('?')[0] ?? '';
            if (/^\d+$/.test(rawHost)) return null;

            let url = raw;
            if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
            try {
                const parsed = new URL(url);
                if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
                const host = parsed.hostname.toLowerCase();
                if (!host.includes('.') || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;
                if (!/^[a-z0-9.-]+$/i.test(host)) return null;
                return parsed.toString();
            } catch {
                return null;
            }
        }
        case 'location': {
            if (resolveLocationMode(action) === 'gps') {
                const coords = parseLatLng(raw);
                if (!coords) return null;
                return buildMapsCoordinateTarget(coords.lat, coords.lng);
            }
            return buildMapsSearchTarget(raw);
        }
        default:
            return null;
    }
}

/** يفتح قناة التواصل بالتطبيق المناسب (هاتف / بريد / خرائط) */
export function openProfileContact(action: ProfileAction): ProfileContactOpenResult {
    const target = buildProfileContactTarget(action);
    if (!target) return 'invalid';

    switch (action.type) {
        case 'call':
        case 'email':
        case 'whatsapp':
        case 'location':
            openNativeScheme(target);
            break;
        case 'website':
            window.open(target, '_blank', 'noopener,noreferrer');
            break;
        default:
            openNativeScheme(target);
    }

    return 'opened';
}

export function contactValuePlaceholder(type: ProfileAction['type']): string {
    switch (type) {
        case 'whatsapp':
            return '9647XXXXXXXX';
        case 'call':
            return '07XXXXXXXX';
        case 'email':
            return 'name@example.com';
        case 'website':
            return 'https://example.com';
        case 'location':
            return 'العنوان أو اضغط «تحديد المكان»';
        default:
            return 'القيمة';
    }
}
