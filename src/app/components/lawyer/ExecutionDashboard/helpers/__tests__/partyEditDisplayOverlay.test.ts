import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
    clearAllPartyEditDisplayOverlays,
    getPartyEditDisplayOverlay,
    paintPartyEditNameImmediate,
    setPartyEditDisplayOverlay,
    useApplyPartyEditDisplayOverlay,
} from '../partyEditDisplayOverlay';

describe('partyEditDisplayOverlay', () => {
    beforeEach(() => {
        clearAllPartyEditDisplayOverlays();
        document.body.innerHTML = '';
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('applies overlay fields to party objects immediately', () => {
        setPartyEditDisplayOverlay({
            kind: 'creditor',
            partyId: 'c1',
            aliasIds: ['ec-0'],
            name: 'جديد',
            phone: '0770',
            address: 'بغداد',
        });

        const { result } = renderHook(() => useApplyPartyEditDisplayOverlay());
        const next = result.current(
            { id: 'c1', name: 'قديم', phone: '1', address: 'أ' },
            'creditor',
            ['ec-0'],
        );

        expect(next.name).toBe('جديد');
        expect(next.phone).toBe('0770');
        expect(getPartyEditDisplayOverlay('creditor', 'ec-0')?.name).toBe('جديد');
    });

    it('paints creditor name in the DOM immediately without waiting for React', () => {
        const el = document.createElement('span');
        el.setAttribute('data-party-edit-surface', 'creditor:c1');
        el.textContent = 'قديم';
        document.body.appendChild(el);

        paintPartyEditNameImmediate('creditor', ['c1', 'ec-0'], 'فوري');

        expect(el.textContent).toBe('فوري');
    });

    it('hides the party edit modal from the DOM immediately', async () => {
        const { hidePartyEditModalImmediate } = await import('../partyEditDisplayOverlay');
        const modal = document.createElement('div');
        modal.setAttribute('data-party-edit-modal', 'true');
        document.body.appendChild(modal);

        hidePartyEditModalImmediate();

        expect(modal.style.display).toBe('none');
    });

    it('notifies subscribers when overlay changes', () => {
        const { result, rerender } = renderHook(() => useApplyPartyEditDisplayOverlay());
        expect(result.current({ id: 'c1', name: 'قديم' }, 'creditor').name).toBe('قديم');

        act(() => {
            setPartyEditDisplayOverlay({
                kind: 'creditor',
                partyId: 'c1',
                name: 'فوري',
                phone: '',
                address: '',
            });
        });
        rerender();

        expect(result.current({ id: 'c1', name: 'قديم' }, 'creditor').name).toBe('فوري');
    });
});
