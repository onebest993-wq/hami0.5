import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { ExecutionArchiveCardOpenShell } from '../ExecutionArchiveCardOpenShell';
import { ExecutionArchiveCardPaintSlot } from '../ExecutionArchiveCardPaintSlot';
import { ExecutionArchiveQueuedPaintSlot } from '../ExecutionArchiveQueuedPaintSlot';
import {
    rememberExecutionArchiveFirstOpenIndex,
    resetExecutionArchiveFirstOpenClickForTests,
    takeExecutionArchiveFirstOpenIndex,
} from '@/app/runtime/executionArchiveFirstOpenClick';

describe('execution archive first-open click', () => {
    afterEach(() => {
        resetExecutionArchiveFirstOpenClickForTests();
    });

    it('الهيكل الصامت ليس زراً ولا يفتح من pointerdown', () => {
        const { getByTestId } = render(<ExecutionArchiveCardPaintSlot />);
        const slot = getByTestId('execution-archive-card-paint-slot');
        expect(slot.tagName).toBe('DIV');
        fireEvent.pointerDown(slot, { button: 0 });
        expect(takeExecutionArchiveFirstOpenIndex()).toBeNull();
    });

    it('يحفظ فهرس الضغطة حتى تصل الشبكة', () => {
        rememberExecutionArchiveFirstOpenIndex(2);
        expect(takeExecutionArchiveFirstOpenIndex()).toBe(2);
        expect(takeExecutionArchiveFirstOpenIndex()).toBeNull();
    });

    it('الهيكل في أول إطار يحفظ الفهرس عند رفع الإصبع لا pointerdown', () => {
        const { getByTestId } = render(<ExecutionArchiveQueuedPaintSlot slot={1} />);
        const queued = getByTestId('execution-archive-queued-paint-slot');
        fireEvent.pointerDown(queued, { button: 0, clientX: 8, clientY: 8, pointerId: 1 });
        expect(takeExecutionArchiveFirstOpenIndex()).toBeNull();
        fireEvent.pointerUp(queued, { button: 0, clientX: 8, clientY: 8, pointerId: 1 });
        expect(takeExecutionArchiveFirstOpenIndex()).toBe(1);
    });

    it('الغلاف الثابت يفتح بعد استبدال الهيكل في نفس اللمسة', () => {
        const onOpen = vi.fn();

        function SwapHost() {
            const [live, setLive] = useState(false);
            return (
                <ExecutionArchiveCardOpenShell file={{ id: 'exec-1', type: 'execution' }} onOpen={onOpen}>
                    {live ? (
                        <div data-testid="live-inner">حية</div>
                    ) : (
                        <div
                            data-testid="slot-inner"
                            onPointerDown={() => {
                                setLive(true);
                            }}
                        >
                            هيكل
                        </div>
                    )}
                </ExecutionArchiveCardOpenShell>
            );
        }

        render(<SwapHost />);
        const shell = screen.getByTestId('execution-archive-card-open-shell');
        fireEvent.pointerDown(screen.getByTestId('slot-inner'), {
            button: 0,
            clientX: 12,
            clientY: 12,
            pointerId: 3,
        });
        expect(onOpen).not.toHaveBeenCalled();
        fireEvent.pointerUp(shell, { button: 0, clientX: 12, clientY: 12, pointerId: 3 });
        expect(onOpen).toHaveBeenCalledTimes(1);
    });
});
