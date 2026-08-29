import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { phraseMatchesMock, isDevTokenMock } = vi.hoisted(() => ({
    phraseMatchesMock: vi.fn(),
    isDevTokenMock: vi.fn(() => false),
}));

vi.mock('@/app/hooks/useReduceMotion', () => ({
    useReduceMotion: () => false,
}));

vi.mock('@/app/bootstrap/bootStaticShell', () => ({
    removeStaticBootShell: vi.fn(),
}));

vi.mock('@/app/domain/admin/headquartersHiddenDoor', () => ({
    headquartersDoorPhraseMatches: (...a: unknown[]) => phraseMatchesMock(...a),
    isHeadquartersDevDoorToken: (...a: unknown[]) => isDevTokenMock(...a),
}));

import { HeadquartersHiddenDoor } from '../HeadquartersHiddenDoor';
import { setPlainDocumentCoverForTests } from '@/boot/plainDocumentPath';

describe('HeadquartersHiddenDoor', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
        isDevTokenMock.mockReturnValue(false);
        setPlainDocumentCoverForTests(false);
    });

    it('renders an empty document with no boot mark', () => {
        render(
            <HeadquartersHiddenDoor unlocked={false} onUnlock={() => undefined}>
                <div data-testid="inner">inner</div>
            </HeadquartersHiddenDoor>,
        );
        expect(screen.getByTestId('doc-surface')).toBeTruthy();
        expect(screen.getByTestId('doc-surface').textContent).toBe('');
        expect(screen.queryByRole('img')).toBeNull();
        expect(screen.queryByTestId('inner')).toBeNull();
        expect(document.querySelector('.hami-boot-logo')).toBeNull();
    });

    it('holds on the empty document before unlock', async () => {
        vi.useFakeTimers();
        phraseMatchesMock.mockResolvedValue(true);
        const onUnlock = vi.fn();
        render(
            <HeadquartersHiddenDoor unlocked={false} onUnlock={onUnlock}>
                <div>inner</div>
            </HeadquartersHiddenDoor>,
        );
        fireEvent.change(screen.getByTestId('doc-surface-input'), {
            target: { value: 'xxxxxxxxxxxxx' },
        });
        await act(async () => {
            await Promise.resolve();
        });
        expect(onUnlock).not.toHaveBeenCalled();
        expect(screen.getByTestId('doc-surface')).toBeTruthy();
        await act(async () => {
            vi.advanceTimersByTime(1_000);
        });
        expect(onUnlock).toHaveBeenCalledTimes(1);
    });

    it('opens immediately on the development shortcut without holding the blank document', async () => {
        phraseMatchesMock.mockResolvedValue(true);
        isDevTokenMock.mockReturnValue(true);
        const onUnlock = vi.fn();
        function Harness() {
            const [unlocked, setUnlocked] = useState(false);
            return (
                <HeadquartersHiddenDoor
                    unlocked={unlocked}
                    onUnlock={(via) => {
                        onUnlock(via);
                        setUnlocked(true);
                    }}
                >
                    <div data-testid="inner">inner</div>
                </HeadquartersHiddenDoor>
            );
        }
        render(<Harness />);
        fireEvent.keyDown(window, { key: '1', code: 'Digit1' });
        expect(onUnlock).toHaveBeenCalledWith(true);
        expect(screen.getByTestId('inner')).toBeTruthy();
        expect(screen.queryByTestId('doc-surface')).toBeNull();
    });
});
