import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ExecutionArchiveCardPin } from '../ExecutionArchiveCardPin';
import type { WorkspacePinnedItem } from '@/app/workspace/types';

const pinnedKeys = new Set<string>();
const listeners = new Set<(state: { isPinned: (id: string, type: string) => boolean }) => void>();

function notify() {
    const snapshot = {
        isPinned: (id: string, type: string) => pinnedKeys.has(`${type}:${id}`),
    };
    listeners.forEach((listener) => listener(snapshot));
}

vi.mock('@/app/stores/workspaceStore', () => ({
    useWorkspaceStore: {
        getState: () => ({
            isPinned: (id: string, type: string) => pinnedKeys.has(`${type}:${id}`),
            togglePin: (item: { id: string; type: string }) => {
                const key = `${item.type}:${item.id}`;
                if (pinnedKeys.has(key)) pinnedKeys.delete(key);
                else pinnedKeys.add(key);
                notify();
            },
        }),
        subscribe: (
            listener: (state: { isPinned: (id: string, type: string) => boolean }) => void,
        ) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    },
}));

const item: WorkspacePinnedItem = {
    id: 'ex-1',
    type: 'execution',
    title: 'تنفيذ 501',
    clientName: 'موكل',
    caseNumber: '501/2026',
    routePath: 'workspace:execution:ex-1',
};

describe('ExecutionArchiveCardPin', () => {
    beforeEach(() => {
        pinnedKeys.clear();
        listeners.clear();
    });

    it('يرسم زراً حقيقياً من أول إطار ويثبّت بنقرة واحدة', async () => {
        render(<ExecutionArchiveCardPin item={item} />);
        const button = screen.getByTestId('workspace-pin-execution-ex-1');
        expect(button.tagName).toBe('BUTTON');
        expect(button).toHaveAttribute('aria-pressed', 'false');
        expect(button).toHaveAttribute('aria-label', 'تثبيت الإضبارة');
        fireEvent.click(button);
        await waitFor(() => {
            expect(button).toHaveAttribute('aria-pressed', 'true');
        });
        expect(pinnedKeys.has('execution:ex-1')).toBe(true);
    });

    it('يلغي التثبيت بالنقرة التالية', async () => {
        pinnedKeys.add('execution:ex-1');
        render(<ExecutionArchiveCardPin item={item} />);
        const button = screen.getByTestId('workspace-pin-execution-ex-1');
        await waitFor(() => {
            expect(button).toHaveAttribute('aria-pressed', 'true');
        });
        fireEvent.click(button);
        await waitFor(() => {
            expect(button).toHaveAttribute('aria-pressed', 'false');
        });
    });

    it('يعرض حالة التثبيت من أول إطار بعد تسخين المخزن', async () => {
        const warm = render(<ExecutionArchiveCardPin item={item} />);
        fireEvent.click(warm.getByTestId('workspace-pin-execution-ex-1'));
        await waitFor(() => {
            expect(warm.getByTestId('workspace-pin-execution-ex-1')).toHaveAttribute(
                'aria-pressed',
                'true',
            );
        });
        warm.unmount();
        render(<ExecutionArchiveCardPin item={item} />);
        expect(screen.getByTestId('workspace-pin-execution-ex-1')).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    });
});
