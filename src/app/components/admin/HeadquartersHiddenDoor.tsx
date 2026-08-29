import React, { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { headquartersDoorPhraseMatches, isHeadquartersDevDoorToken } from '@/app/domain/admin/headquartersHiddenDoor';
import { BlankDocumentLayer } from '@/app/components/admin/blankDocumentSurface';
import { useDocumentHold } from '@/app/components/admin/useDocumentHold';
import {
    applyPlainDocumentSurface,
    clearPlainDocumentSurface,
} from '@/boot/plainDocumentPath';
import { removeStaticBootShell } from '@/app/bootstrap/bootStaticShell';

type Props = {
    unlocked: boolean;
    onUnlock: (viaDevShortcut?: boolean) => void;
    children: ReactNode;
};

export function HeadquartersHiddenDoor({ unlocked, onUnlock, children }: Props) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const bufferRef = useRef('');
    const busyRef = useRef(false);
    const releasedRef = useRef(false);
    const viaDevShortcutRef = useRef(false);
    const [buffer, setBuffer] = useState('');
    const { holdActive, beginHold } = useDocumentHold(() => onUnlock(viaDevShortcutRef.current));

    const tryUnlock = useCallback(
        async (candidate: string) => {
            if (releasedRef.current || busyRef.current || unlocked || holdActive) return;
            busyRef.current = true;
            try {
                const allowDevShortcut = Boolean(import.meta.env.DEV);
                const ok = await headquartersDoorPhraseMatches(candidate, Date.now(), {
                    allowDevShortcut,
                });
                if (!ok || releasedRef.current) return;
                const viaDevShortcut = allowDevShortcut && isHeadquartersDevDoorToken(candidate);
                viaDevShortcutRef.current = viaDevShortcut;
                if (viaDevShortcut) {
                    releasedRef.current = true;
                    onUnlock(true);
                    return;
                }
                beginHold();
            } finally {
                if (!releasedRef.current) busyRef.current = false;
            }
        },
        [beginHold, holdActive, onUnlock, unlocked],
    );

    const writeBuffer = useCallback(
        (next: string) => {
            const clipped = next.slice(0, 64);
            bufferRef.current = clipped;
            setBuffer(clipped);
            void tryUnlock(clipped);
        },
        [tryUnlock],
    );

    useLayoutEffect(() => {
        if (unlocked) {
            clearPlainDocumentSurface();
            return;
        }
        applyPlainDocumentSurface();
        removeStaticBootShell({ force: true, instant: true });
    }, [unlocked]);

    useEffect(() => {
        if (unlocked || holdActive) return;
        const focus = () => inputRef.current?.focus();
        focus();
        const timer = window.setTimeout(focus, 50);
        return () => window.clearTimeout(timer);
    }, [holdActive, unlocked]);

    useEffect(() => {
        if (unlocked || holdActive) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            if (
                Boolean(import.meta.env.DEV) &&
                !releasedRef.current &&
                (event.code === 'Digit1' ||
                    event.code === 'Numpad1' ||
                    event.key === '1' ||
                    event.key === '١' ||
                    event.key === '۱')
            ) {
                event.preventDefault();
                releasedRef.current = true;
                viaDevShortcutRef.current = true;
                onUnlock(true);
                return;
            }
            if (event.target === inputRef.current) return;
            if (event.key === 'Enter') {
                event.preventDefault();
                const live = inputRef.current?.value || bufferRef.current;
                writeBuffer(live);
                return;
            }
            if (event.key === 'Backspace') {
                event.preventDefault();
                writeBuffer(bufferRef.current.slice(0, -1));
                return;
            }
            if (event.key.length === 1) {
                event.preventDefault();
                writeBuffer(bufferRef.current + event.key);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [holdActive, onUnlock, tryUnlock, unlocked, writeBuffer]);

    if (unlocked) return <>{children}</>;

    return (
        <BlankDocumentLayer lock>
            <input
                ref={inputRef}
                data-testid="doc-surface-input"
                type="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                inputMode="text"
                tabIndex={0}
                value={buffer}
                disabled={holdActive}
                onChange={(event) => writeBuffer(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;
                    event.preventDefault();
                    writeBuffer(inputRef.current?.value || bufferRef.current);
                }}
                style={{
                    position: 'fixed',
                    left: 0,
                    bottom: 0,
                    width: 1,
                    height: 1,
                    minHeight: 1,
                    margin: 0,
                    padding: 0,
                    border: 0,
                    opacity: 0,
                    overflow: 'hidden',
                    clipPath: 'inset(50%)',
                    background: 'transparent',
                    color: 'transparent',
                    caretColor: 'transparent',
                    outline: 'none',
                    fontSize: 16,
                    pointerEvents: holdActive ? 'none' : 'auto',
                }}
            />
        </BlankDocumentLayer>
    );
}

HeadquartersHiddenDoor.displayName = 'Host';
