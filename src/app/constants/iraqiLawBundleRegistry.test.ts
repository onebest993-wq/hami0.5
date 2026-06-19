import { describe, expect, it } from 'vitest';
import {
    ALL_IRAQI_LAW_BUNDLE_SLUGS,
    LAW_NAME_TO_BUNDLE_SLUG,
    bundleFileNameForSlug,
} from './iraqiLawBundleRegistry';
import { ALLOWED_IRAQI_LAW_NAMES } from './iraqiLawCatalog';

describe('iraqiLawBundleRegistry', () => {
    it('maps every allowed law to a unique bundle slug/file', () => {
        const slugs = new Set<string>();
        for (const lawName of ALLOWED_IRAQI_LAW_NAMES) {
            const slug = LAW_NAME_TO_BUNDLE_SLUG[lawName];
            expect(slug).toBeTruthy();
            expect(slugs.has(slug!)).toBe(false);
            slugs.add(slug!);
            expect(bundleFileNameForSlug(slug!)).toMatch(/\.articles\.json$/);
        }
        expect(slugs.size).toBe(ALLOWED_IRAQI_LAW_NAMES.length);
        expect(ALL_IRAQI_LAW_BUNDLE_SLUGS).toHaveLength(ALLOWED_IRAQI_LAW_NAMES.length);
    });
});
