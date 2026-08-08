import { describe, expect, it } from 'vitest';
import {
    buildFollowupModalTabsFromFlags,
    buildFollowupSectionTabOrderFromFlags,
} from '../buildFollowupModalTabsFromFlags';

describe('buildFollowupModalTabsFromFlags', () => {
    it('shows coercive tab when restricted but coercive flag is open', () => {
        const tabs = buildFollowupModalTabsFromFlags({
            specialization: {
                hidePersonalCoerciveFollowupTab: true,
                hideFollowupCoerciveTab: false,
                hideFollowupSeizureRequestsTab: true,
            },
            showPersonalCoerciveFollowupTab: false,
            personalTabLockedForEmployee: false,
            followupTabsRestricted: true,
        });
        expect(tabs.map((t) => t.id)).toEqual([
            'coercive',
            'correspondences',
            'admin',
            'dossier_controls',
            'other_party',
        ]);
    });

    it('omits seizure tab when specialization hides it', () => {
        const tabs = buildFollowupModalTabsFromFlags({
            specialization: {
                hidePersonalCoerciveFollowupTab: true,
                hideFollowupCoerciveTab: false,
                hideFollowupSeizureRequestsTab: true,
            },
            showPersonalCoerciveFollowupTab: false,
            personalTabLockedForEmployee: false,
            followupTabsRestricted: false,
        });
        expect(tabs.map((t) => t.id)).toEqual([
            'coercive',
            'correspondences',
            'admin',
            'dossier_controls',
            'other_party',
        ]);
    });

    it('includes personal and seizure when flags allow', () => {
        const order = buildFollowupSectionTabOrderFromFlags({
            showPersonalCoerciveFollowupTab: true,
            specialization: {
                hideFollowupCoerciveTab: false,
                hideFollowupSeizureRequestsTab: false,
            },
            followupTabsRestricted: false,
        });
        expect(order).toEqual([
            'personal',
            'coercive',
            'seizure_requests',
            'correspondences',
            'admin',
            'dossier_controls',
            'other_party',
        ]);
    });

    it('shows locked label for employee personal tab', () => {
        const tabs = buildFollowupModalTabsFromFlags({
            specialization: {
                hidePersonalCoerciveFollowupTab: false,
                hideFollowupCoerciveTab: true,
                hideFollowupSeizureRequestsTab: true,
            },
            showPersonalCoerciveFollowupTab: true,
            personalTabLockedForEmployee: true,
            followupTabsRestricted: false,
        });
        expect(tabs.find((t) => t.id === 'personal')?.label).toBe('🔒 التنفيذ الجبري الشخصي');
    });

    it('shows personal tab when assignment block overrides hide flag (assembly modal path)', () => {
        const tabs = buildFollowupModalTabsFromFlags({
            specialization: {
                hidePersonalCoerciveFollowupTab: true,
                hideFollowupCoerciveTab: true,
                hideFollowupSeizureRequestsTab: false,
            },
            showPersonalCoerciveFollowupTab: true,
            personalTabLockedForEmployee: false,
            followupTabsRestricted: false,
        });
        expect(tabs.map((t) => t.id)).toContain('personal');
        expect(tabs.map((t) => t.id)).toContain('seizure_requests');
        expect(tabs.map((t) => t.id)).not.toContain('coercive');
    });

    it('section order ids match chip tab ids when same show-personal input', () => {
        const input = {
            showPersonalCoerciveFollowupTab: true,
            specialization: {
                hideFollowupCoerciveTab: false,
                hideFollowupSeizureRequestsTab: false,
            },
            followupTabsRestricted: false,
        };
        const tabs = buildFollowupModalTabsFromFlags({
            ...input,
            specialization: {
                hidePersonalCoerciveFollowupTab: false,
                ...input.specialization,
            },
            personalTabLockedForEmployee: false,
        });
        const order = buildFollowupSectionTabOrderFromFlags(input);
        expect(order).toEqual(tabs.map((t) => t.id));
    });
});
