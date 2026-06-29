import { describe, expect, it } from 'vitest';
import {
    buildProfileContactTarget,
    normalizeTelHref,
    resolveLocationMode,
} from '@/app/services/profile/profileContactNavigation';
import type { ProfileAction } from '@/app/services/lawyer-cloud';

function action(
    type: ProfileAction['type'],
    value: string,
    extra: Partial<ProfileAction> = {},
): ProfileAction {
    return { id: '1', type, label: type, value, ...extra };
}

describe('normalizeTelHref', () => {
    it('normalizes Iraqi local numbers to international tel', () => {
        expect(normalizeTelHref('07567567')).toBe('tel:+9647567567');
    });
});

describe('buildProfileContactTarget', () => {
    it('builds tel link for phone', () => {
        expect(buildProfileContactTarget(action('call', '07567567'))).toBe('tel:+9647567567');
    });

    it('builds mailto only for valid email', () => {
        expect(buildProfileContactTarget(action('email', '756756756'))).toBeNull();
        expect(buildProfileContactTarget(action('email', 'dodo23259@yahoo.com'))).toBe(
            'mailto:dodo23259@yahoo.com',
        );
    });

    it('rejects invalid website hostnames', () => {
        expect(buildProfileContactTarget(action('website', '65756756'))).toBeNull();
        expect(buildProfileContactTarget(action('website', 'hami.iq'))?.startsWith('https://')).toBe(true);
    });

    it('builds maps link for gps location', () => {
        const target = buildProfileContactTarget(
            action('location', '33.3, 44.4', { locationMode: 'gps' }),
        );
        expect(target).toMatch(/^https:\/\//);
        expect(target).toContain('33.3');
        expect(target).toContain('44.4');
    });

    it('builds maps search for manual location address', () => {
        const target = buildProfileContactTarget(
            action('location', 'بغداد - الكرادة', { locationMode: 'manual' }),
        );
        expect(target).toMatch(/^https:\/\//);
        expect(target).toContain(encodeURIComponent('بغداد - الكرادة'));
    });
});

describe('resolveLocationMode', () => {
    it('infers gps from coordinates when mode omitted', () => {
        expect(resolveLocationMode(action('location', '33.1,44.2'))).toBe('gps');
    });

    it('infers manual from address text when mode omitted', () => {
        expect(resolveLocationMode(action('location', 'بغداد'))).toBe('manual');
    });
});
