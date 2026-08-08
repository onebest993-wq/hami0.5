import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { AsyncSettingToggle } from '@/app/components/lawyer/HamiSettings/AsyncSettingToggle';

describe('AsyncSettingToggle', () => {
    it('ينفّذ onCommit من pointerdown', async () => {
        const onCommit = vi.fn().mockResolvedValue(undefined);
        render(<AsyncSettingToggle checked={false} onCommit={onCommit} testId="async-toggle" />);

        fireEvent.pointerDown(screen.getByTestId('async-toggle'));
        await act(async () => {
            await Promise.resolve();
        });

        expect(onCommit).toHaveBeenCalledWith(true);
    });

    it('لا يبدّل مرتين من نفس اللمسة (pointerdown + click)', async () => {
        const onCommit = vi.fn().mockResolvedValue(undefined);
        render(<AsyncSettingToggle checked={false} onCommit={onCommit} testId="async-toggle" />);
        const toggle = screen.getByTestId('async-toggle');

        fireEvent.pointerDown(toggle);
        fireEvent.click(toggle);
        await act(async () => {
            await Promise.resolve();
        });

        expect(onCommit).toHaveBeenCalledTimes(1);
    });

    it('لا يبقى معلقاً إذا علّق onCommit', async () => {
        vi.useFakeTimers();
        const onCommit = vi.fn(() => new Promise<void>(() => undefined));
        render(<AsyncSettingToggle checked={false} onCommit={onCommit} testId="async-toggle" />);

        fireEvent.pointerDown(screen.getByTestId('async-toggle'));
        expect(screen.getByTestId('async-toggle')).toHaveAttribute('aria-busy', 'true');

        await act(async () => {
            await vi.advanceTimersByTimeAsync(20_000);
        });

        expect(screen.getByTestId('async-toggle')).not.toHaveAttribute('aria-busy');
        vi.useRealTimers();
    });
});
