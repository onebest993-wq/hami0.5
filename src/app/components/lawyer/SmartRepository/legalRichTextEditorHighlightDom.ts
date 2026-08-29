export function nodeInEditor(node: Node | null, editor: HTMLElement | null): boolean {
    if (!node || !editor) return false;
    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
    return Boolean(el && editor.contains(el));
}

export function unwrapElement(el: Element): void {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
}

export function pruneFormatResetSpans(editor: HTMLElement): void {
    editor.querySelectorAll('[data-fmt-reset="1"]').forEach((node) => {
        const text = (node.textContent ?? '').replace(/\u200b/g, '').trim();
        if (!text) node.remove();
    });
}

export function collapseCaretAfter(node: Node): void {
    const sel = window.getSelection();
    if (!sel) return;
    const next = document.createRange();
    next.setStartAfter(node);
    next.collapse(true);
    sel.removeAllRanges();
    sel.addRange(next);
}

export function collapseCaretInsideText(node: Text, offset: number): void {
    const sel = window.getSelection();
    if (!sel) return;
    const next = document.createRange();
    next.setStart(node, safeTextOffset(node, offset));
    next.collapse(true);
    sel.removeAllRanges();
    sel.addRange(next);
}

function safeTextOffset(node: Node, preferred: number): number {
    if (node.nodeType !== Node.TEXT_NODE) return 0;
    const len = (node as Text).length;
    return Math.max(0, Math.min(preferred, len));
}
