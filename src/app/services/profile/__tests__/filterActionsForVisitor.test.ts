import { describe, expect, it } from 'vitest';
import {
    defaultProfilePageCustomization,
    filterActionsForVisitor,
} from '../profilePageCustomization';

describe('filterActionsForVisitor (P0)', () => {
    const actions = [
        { id: 'a1', label: 'موقع' },
        { id: 'a2', label: 'هاتف' },
        { id: 'a3', label: 'بريد' },
    ];

    it('returns all actions for profile owner', () => {
        const privacy = defaultProfilePageCustomization().privacy;
        expect(filterActionsForVisitor(actions, privacy, true)).toEqual(actions);
    });

    it('returns empty list for visitor when showContactChannels is false', () => {
        const privacy = {
            ...defaultProfilePageCustomization().privacy,
            showContactChannels: false,
        };
        expect(filterActionsForVisitor(actions, privacy, false)).toEqual([]);
    });

    it('filters hidden contact ids for visitors', () => {
        const privacy = {
            ...defaultProfilePageCustomization().privacy,
            hiddenContactIds: ['a2'],
        };
        const visible = filterActionsForVisitor(actions, privacy, false);
        expect(visible.map((a) => a.id)).toEqual(['a1', 'a3']);
    });

    it('returns empty array when actions list is empty', () => {
        const privacy = defaultProfilePageCustomization().privacy;
        expect(filterActionsForVisitor([], privacy, false)).toEqual([]);
        expect(filterActionsForVisitor([], privacy, true)).toEqual([]);
    });

    it('hides all when every id is in hiddenContactIds', () => {
        const privacy = {
            ...defaultProfilePageCustomization().privacy,
            hiddenContactIds: ['a1', 'a2', 'a3'],
        };
        expect(filterActionsForVisitor(actions, privacy, false)).toEqual([]);
    });
});
