import React, { lazy, Suspense } from 'react';
import type { EntryCardInlineEditorProps } from './EntryCardInlineEditor';

const Editor = lazy(() =>
    import('./EntryCardInlineEditor').then((m) => ({ default: m.EntryCardInlineEditor })),
);

export function EntryCardInlineEditorLazy(props: EntryCardInlineEditorProps) {
    return (
        <Suspense fallback={null}>
            <Editor {...props} />
        </Suspense>
    );
}
