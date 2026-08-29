import React, { useRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import {
    listGlobalSearchFocusables,
    useSearchKeyboard,
} from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useSearchKeyboard';

const fileNav = { type: 'file' as const, fileId: 'f1' };

function entry(id: string, title: string): GlobalSearchEntry {
    return {
        id,
        category: 'lawsuit',
        title,
        subtitle: '',
        lifecycle: 'active',
        _searchStr: title,
        navigate: fileNav,
    };
}

function KeyboardProbe({
    results,
    onPick,
}: {
    results: GlobalSearchEntry[];
    onPick: (entry: GlobalSearchEntry) => void;
}) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const { onKeyDownCapture } = useSearchKeyboard(
        overlayRef,
        results,
        activeIndex,
        setActiveIndex,
        onPick,
    );

    return (
        <div ref={overlayRef} data-testid="kb-root" onKeyDownCapture={onKeyDownCapture}>
            <button type="button">إغلاق</button>
            <input data-testid="kb-input" />
            {results.map((item, index) => (
                <button
                    key={item.id}
                    type="button"
                    data-search-result-index={index}
                    tabIndex={index === activeIndex ? 0 : -1}
                >
                    {item.title}
                </button>
            ))}
        </div>
    );
}

describe('listGlobalSearchFocusables', () => {
    it('يستبعد العناصر المخفية بـ aria-hidden', () => {
        const root = document.createElement('div');
        root.innerHTML = `
            <button type="button">ظاهر</button>
            <button type="button" aria-hidden="true">مخفي</button>
        `;
        document.body.appendChild(root);
        const list = listGlobalSearchFocusables(root);
        expect(list.map((el) => el.textContent)).toEqual(['ظاهر']);
        root.remove();
    });
});

describe('useSearchKeyboard', () => {
    it('Enter يختار النتيجة النشطة', () => {
        const onPick = vi.fn();
        const rows = [entry('a', 'أ'), entry('b', 'ب')];
        render(<KeyboardProbe results={rows} onPick={onPick} />);
        fireEvent.keyDown(screen.getByTestId('kb-input'), { key: 'Enter' });
        expect(onPick).toHaveBeenCalledWith(rows[0]);
    });

    it('Escape لا يُستهلك هنا', () => {
        const onPick = vi.fn();
        render(<KeyboardProbe results={[entry('a', 'أ')]} onPick={onPick} />);
        fireEvent.keyDown(screen.getByTestId('kb-root'), { key: 'Escape' });
        expect(onPick).not.toHaveBeenCalled();
    });

    it('ArrowDown يمنع التمرير الافتراضي', () => {
        const onPick = vi.fn();
        render(<KeyboardProbe results={[entry('a', 'أ'), entry('b', 'ب')]} onPick={onPick} />);
        const ev = fireEvent.keyDown(screen.getByTestId('kb-input'), { key: 'ArrowDown' });
        expect(ev).toBe(false);
    });

    it('لا يختار Enter من الحقل إن لم تُفعَّل نتيجة', () => {
        const onPick = vi.fn();

        function IdleProbe() {
            const overlayRef = useRef<HTMLDivElement>(null);
            const { onKeyDownCapture } = useSearchKeyboard(
                overlayRef,
                [],
                -1,
                () => undefined,
                onPick,
            );
            return (
                <div ref={overlayRef} onKeyDownCapture={onKeyDownCapture}>
                    <input data-testid="idle-input" />
                </div>
            );
        }

        render(<IdleProbe />);
        fireEvent.keyDown(screen.getByTestId('idle-input'), { key: 'Enter' });
        expect(onPick).not.toHaveBeenCalled();
    });
});
