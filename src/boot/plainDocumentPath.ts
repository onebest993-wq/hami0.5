import { isHqDocumentEntry } from '@/product/hamiProductRuntime';

export function isPlainDocumentPath(pathname?: string): boolean {
    if (isHqDocumentEntry()) return true;
    const raw =
        pathname ??
        (typeof window !== 'undefined' && window.location ? window.location.pathname : '/');
    const path = String(raw).replace(/\/+$/u, '') || '/';
    if (path === '/hq.html' || path === '/hq') return true;
    return path === '/admin' || path.startsWith('/admin/');
}

const COVER_STYLE_MARK = '#hami-static-boot *{visibility:hidden';

type CoverSnap = {
    className: string;
    title: string;
    lang: string;
    dir: string;
    attrs: Record<string, string>;
};

const listeners = new Set<(active: boolean) => void>();

let coverActive =
    typeof window !== 'undefined' && isPlainDocumentPath(window.location.pathname);
let snap: CoverSnap | null = null;

function notifyCover(): void {
    for (const fn of listeners) {
        try {
            fn(coverActive);
        } catch {
            /* ignore */
        }
    }
}

export function isPlainDocumentSurface(): boolean {
    return coverActive;
}

export function subscribePlainDocumentSurface(fn: (active: boolean) => void): () => void {
    listeners.add(fn);
    return () => {
        listeners.delete(fn);
    };
}

export function whenPlainDocumentCoverClears(fn: () => void): () => void {
    if (!coverActive) {
        fn();
        return () => undefined;
    }
    const unsub = subscribePlainDocumentSurface((active) => {
        if (active) return;
        unsub();
        fn();
    });
    return unsub;
}

function snapshotHamiAttrs(root: HTMLElement): Record<string, string> {
    const attrs: Record<string, string> = {};
    for (const attr of Array.from(root.attributes)) {
        if (attr.name.startsWith('data-hami')) attrs[attr.name] = attr.value;
    }
    return attrs;
}

function stripHamiAttrs(root: HTMLElement): void {
    for (const name of Object.keys(snapshotHamiAttrs(root))) {
        root.removeAttribute(name);
    }
}

function injectCoverStyle(): void {
    if (typeof document === 'undefined') return;
    const existing = Array.from(document.querySelectorAll('style')).some((el) =>
        (el.textContent || '').includes(COVER_STYLE_MARK),
    );
    if (existing) return;
    const style = document.createElement('style');
    style.textContent =
        'html,body,#root,#hami-static-boot{background:#fff!important;color-scheme:light!important}' +
        COVER_STYLE_MARK +
        '!important;opacity:0!important}';
    document.documentElement.appendChild(style);
}

function removeCoverStyles(): void {
    if (typeof document === 'undefined') return;
    for (const el of Array.from(document.querySelectorAll('style'))) {
        if (el.id === 'hami-splash-critical') continue;
        if ((el.textContent || '').includes(COVER_STYLE_MARK)) el.remove();
    }
}

export function applyPlainDocumentSurface(): void {
    if (typeof document === 'undefined') return;
    if (!isPlainDocumentPath() && !isHqDocumentEntry()) return;
    const root = document.documentElement;
    if (!snap) {
        snap = {
            className: root.className,
            title: typeof document.title === 'string' ? document.title : '',
            lang: root.getAttribute('lang') || '',
            dir: root.getAttribute('dir') || '',
            attrs: snapshotHamiAttrs(root),
        };
    }
    coverActive = true;
    root.classList.remove('hami-boot-static-active', 'hami-native-shell');
    stripHamiAttrs(root);
    try {
        root.removeAttribute('lang');
        root.setAttribute('dir', 'ltr');
        document.title = '';
        if (document.body) {
            document.body.style.backgroundColor = '#ffffff';
            document.body.style.color = '#111';
            document.body.style.fontFamily = 'Tahoma, Arial, sans-serif';
        }
    } catch {
        /* ignore */
    }
    injectCoverStyle();
    notifyCover();
}

export function clearPlainDocumentSurface(): void {
    if (typeof document === 'undefined') return;
    const wasActive = coverActive;
    coverActive = false;
    const root = document.documentElement;
    if (snap) {
        root.className = snap.className;
        if (snap.lang) root.setAttribute('lang', snap.lang);
        else root.removeAttribute('lang');
        if (snap.dir) root.setAttribute('dir', snap.dir);
        else root.removeAttribute('dir');
        for (const [name, value] of Object.entries(snap.attrs)) {
            root.setAttribute(name, value);
        }
        try {
            document.title = snap.title || 'Hami';
        } catch {
            /* ignore */
        }
        snap = null;
    }
    removeCoverStyles();
    try {
        if (document.body) {
            document.body.style.backgroundColor = '';
            document.body.style.color = '';
            document.body.style.fontFamily = '';
        }
    } catch {
        /* ignore */
    }
    if (wasActive) notifyCover();
}

export function setPlainDocumentCoverForTests(active: boolean): void {
    coverActive = active;
    notifyCover();
}
