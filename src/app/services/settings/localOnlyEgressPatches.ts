import {
    isLocalOnlyModeEnabled,
    isNetworkUrlAllowed,
    isSrcsetNetworkAllowed,
    LocalOnlyNetworkError,
} from '@/app/services/settings/localOnlyGuard';

const SRC_TAGS = new Set(['IMG', 'AUDIO', 'VIDEO', 'SCRIPT', 'IFRAME', 'SOURCE']);

let egressInstalled = false;
let nativeSetAttribute: typeof Element.prototype.setAttribute | null = null;
let nativeSetAttributeNS: typeof Element.prototype.setAttributeNS | null = null;
let nativeRtc: typeof RTCPeerConnection | null = null;
let nativeImgSrcDesc: PropertyDescriptor | null = null;
let nativeMediaSrcDesc: PropertyDescriptor | null = null;
let nativeScriptSrcDesc: PropertyDescriptor | null = null;
let nativeIframeSrcDesc: PropertyDescriptor | null = null;
let nativeLinkHrefDesc: PropertyDescriptor | null = null;
let nativeOpen: typeof window.open | null = null;
let nativeAssign: ((url: string | URL) => void) | null = null;
let nativeReplace: ((url: string | URL) => void) | null = null;
let nativeSetProperty: typeof CSSStyleDeclaration.prototype.setProperty | null = null;
let nativeFormSubmit: typeof HTMLFormElement.prototype.submit | null = null;
let nativeHrefDesc: PropertyDescriptor | null = null;
let clickBound = false;
let submitBound = false;
let networkNodeObserver: MutationObserver | null = null;

export function installLocalOnlyEgressPatches(): void {
    if (typeof window === 'undefined' || egressInstalled) return;

    patchSetAttribute();
    patchSetAttributeNS();
    patchSrcAccessor(typeof HTMLImageElement !== 'undefined' ? HTMLImageElement.prototype : null, 'img');
    patchSrcAccessor(typeof HTMLMediaElement !== 'undefined' ? HTMLMediaElement.prototype : null, 'media');
    patchSrcAccessor(typeof HTMLScriptElement !== 'undefined' ? HTMLScriptElement.prototype : null, 'script');
    patchSrcAccessor(typeof HTMLIFrameElement !== 'undefined' ? HTMLIFrameElement.prototype : null, 'iframe');
    patchLinkHref();
    patchRtcPeerConnection();
    patchWindowOpen();
    patchLocationNavigation();
    patchCssSetProperty();
    patchFormSubmit();
    bindNavigationGuards();

    egressInstalled = true;
}

function patchSetAttribute(): void {
    if (typeof Element === 'undefined' || typeof Element.prototype.setAttribute !== 'function' || nativeSetAttribute) {
        return;
    }

    nativeSetAttribute = Element.prototype.setAttribute;

    Element.prototype.setAttribute = function (this: Element, name: string, value: string) {
        if (shouldBlockAttribute(this, name, value)) return;
        return nativeSetAttribute!.call(this, name, value);
    };
}

function patchSetAttributeNS(): void {
    if (
        typeof Element === 'undefined' ||
        typeof Element.prototype.setAttributeNS !== 'function' ||
        nativeSetAttributeNS
    ) {
        return;
    }
    nativeSetAttributeNS = Element.prototype.setAttributeNS;
    Element.prototype.setAttributeNS = function (this: Element, ns: string | null, name: string, value: string) {
        const local = name.includes(':') ? name.slice(name.lastIndexOf(':') + 1) : name;
        if (shouldBlockAttribute(this, local, value)) return;
        return nativeSetAttributeNS!.call(this, ns, name, value);
    };
}

function shouldBlockAttribute(el: Element, name: string, value: string): boolean {
    const attr = name.toLowerCase();
    if (el.tagName === 'LINK' && attr === 'href') {
        return !isNetworkUrlAllowed(value);
    }
    if (el.tagName === 'FORM' && attr === 'action') {
        return !isNetworkUrlAllowed(value);
    }
    if ((el.tagName === 'A' || el.tagName === 'AREA') && attr === 'href') {
        return false;
    }
    if (!SRC_TAGS.has(el.tagName)) return false;
    if (attr === 'srcset') return !isSrcsetNetworkAllowed(value);
    if (attr === 'src' || attr === 'poster') return !isNetworkUrlAllowed(value);
    return false;
}

function patchSrcAccessor(
    proto: { src?: string } | null,
    kind: 'img' | 'media' | 'script' | 'iframe',
): void {
    if (!proto) return;
    const existing =
        kind === 'img'
            ? nativeImgSrcDesc
            : kind === 'media'
              ? nativeMediaSrcDesc
              : kind === 'script'
                ? nativeScriptSrcDesc
                : nativeIframeSrcDesc;
    if (existing) return;

    const desc = Object.getOwnPropertyDescriptor(proto, 'src');
    if (!desc?.set || !desc.get) return;

    if (kind === 'img') nativeImgSrcDesc = desc;
    else if (kind === 'media') nativeMediaSrcDesc = desc;
    else if (kind === 'script') nativeScriptSrcDesc = desc;
    else nativeIframeSrcDesc = desc;

    Object.defineProperty(proto, 'src', {
        configurable: true,
        enumerable: desc.enumerable,
        get() {
            return desc.get!.call(this);
        },
        set(next: string) {
            if (!isNetworkUrlAllowed(String(next))) return;
            desc.set!.call(this, next);
        },
    });
}

function patchLinkHref(): void {
    if (typeof HTMLLinkElement === 'undefined' || nativeLinkHrefDesc) return;
    const desc = Object.getOwnPropertyDescriptor(HTMLLinkElement.prototype, 'href');
    if (!desc?.set || !desc.get) return;
    nativeLinkHrefDesc = desc;
    Object.defineProperty(HTMLLinkElement.prototype, 'href', {
        configurable: true,
        enumerable: desc.enumerable,
        get() {
            return desc.get!.call(this);
        },
        set(next: string) {
            if (!isNetworkUrlAllowed(String(next))) return;
            desc.set!.call(this, next);
        },
    });
}

function patchRtcPeerConnection(): void {
    const Native = window.RTCPeerConnection;
    if (typeof Native !== 'function' || nativeRtc) return;
    nativeRtc = Native;

    const Guarded = function GuardedRtcPeerConnection(
        this: RTCPeerConnection,
        config?: RTCConfiguration,
        _constraints?: unknown,
    ) {
        if (isLocalOnlyModeEnabled()) {
            throw new LocalOnlyNetworkError('قطع الاتصال مفعّل — العمل محلياً فقط');
        }
        return new Native(config);
    } as unknown as typeof RTCPeerConnection;

    Guarded.prototype = Native.prototype;
    window.RTCPeerConnection = Guarded;
}

function patchWindowOpen(): void {
    if (typeof window.open !== 'function' || nativeOpen) return;
    nativeOpen = window.open.bind(window);
    window.open = (url?: string | URL, target?: string, features?: string) => {
        if (url != null && String(url).trim() && !isNetworkUrlAllowed(String(url))) {
            return null;
        }
        return nativeOpen!.call(window, url, target, features);
    };
}

function patchLocationNavigation(): void {
    try {
        const proto = Location.prototype;
        if (!nativeAssign && typeof proto.assign === 'function') {
            nativeAssign = proto.assign;
            proto.assign = function (this: Location, url: string | URL) {
                if (!isNetworkUrlAllowed(String(url))) return;
                return nativeAssign!.call(this, url);
            };
        }
        if (!nativeReplace && typeof proto.replace === 'function') {
            nativeReplace = proto.replace;
            proto.replace = function (this: Location, url: string | URL) {
                if (!isNetworkUrlAllowed(String(url))) return;
                return nativeReplace!.call(this, url);
            };
        }
        if (!nativeHrefDesc) {
            const hrefDesc = Object.getOwnPropertyDescriptor(proto, 'href');
            if (hrefDesc?.set && hrefDesc.get) {
                nativeHrefDesc = hrefDesc;
                Object.defineProperty(proto, 'href', {
                    configurable: true,
                    enumerable: hrefDesc.enumerable,
                    get() {
                        return hrefDesc.get!.call(this);
                    },
                    set(next: string) {
                        if (!isNetworkUrlAllowed(String(next))) return;
                        hrefDesc.set!.call(this, next);
                    },
                });
            }
        }
    } catch {
        /* jsdom Location may be frozen */
    }
}

function extractCssUrls(value: string): string[] {
    const out: string[] = [];
    const re = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(value))) {
        const token = match[2]?.trim();
        if (token) out.push(token);
    }
    return out;
}

function patchCssSetProperty(): void {
    if (typeof CSSStyleDeclaration === 'undefined' || nativeSetProperty) return;
    nativeSetProperty = CSSStyleDeclaration.prototype.setProperty;
    CSSStyleDeclaration.prototype.setProperty = function (prop: string, value?: string, priority?: string) {
        if (isLocalOnlyModeEnabled() && typeof value === 'string' && value.toLowerCase().includes('url(')) {
            if (extractCssUrls(value).some((token) => !isNetworkUrlAllowed(token))) return;
        }
        return nativeSetProperty!.call(this, prop, value ?? '', priority);
    };
}

function patchFormSubmit(): void {
    if (typeof HTMLFormElement === 'undefined' || nativeFormSubmit) return;
    nativeFormSubmit = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function (this: HTMLFormElement) {
        const action = this.getAttribute('action') || this.action || '';
        if (action && !isNetworkUrlAllowed(action)) return;
        return nativeFormSubmit!.call(this);
    };
}

function bindNavigationGuards(): void {
    if (typeof document === 'undefined') return;
    if (!clickBound) {
        document.addEventListener('click', onDocumentClickCapture, true);
        clickBound = true;
    }
    if (!submitBound) {
        document.addEventListener('submit', onDocumentSubmitCapture, true);
        submitBound = true;
    }
}

function onDocumentClickCapture(event: Event): void {
    if (!isLocalOnlyModeEnabled()) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest('a[href], area[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || isNetworkUrlAllowed(href)) return;
    event.preventDefault();
    event.stopPropagation();
}

function onDocumentSubmitCapture(event: Event): void {
    if (!isLocalOnlyModeEnabled()) return;
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const action = form.getAttribute('action') || form.action || '';
    if (!action || isNetworkUrlAllowed(action)) return;
    event.preventDefault();
    event.stopPropagation();
}

const SCRUB_SELECTOR = 'img,audio,video,script,iframe,source,link,form';

function scrubElement(el: Element): void {
    if (!isLocalOnlyModeEnabled()) return;
    const tag = el.tagName;
    if (SRC_TAGS.has(tag)) {
        const src = el.getAttribute('src');
        if (src && !isNetworkUrlAllowed(src)) el.removeAttribute('src');
        const srcset = el.getAttribute('srcset');
        if (srcset && !isSrcsetNetworkAllowed(srcset)) el.removeAttribute('srcset');
        const poster = el.getAttribute('poster');
        if (poster && !isNetworkUrlAllowed(poster)) el.removeAttribute('poster');
    }
    if (tag === 'LINK') {
        const href = el.getAttribute('href');
        if (href && !isNetworkUrlAllowed(href)) el.removeAttribute('href');
    }
    if (tag === 'FORM') {
        const action = el.getAttribute('action');
        if (action && !isNetworkUrlAllowed(action)) el.removeAttribute('action');
    }
}

function scrubTree(root: ParentNode | null): void {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    if (root instanceof Element) scrubElement(root);
    root.querySelectorAll(SCRUB_SELECTOR).forEach(scrubElement);
}

function startNetworkNodeObserver(): void {
    if (networkNodeObserver || typeof MutationObserver === 'undefined' || typeof document === 'undefined') {
        return;
    }
    networkNodeObserver = new MutationObserver((records) => {
        if (!isLocalOnlyModeEnabled()) return;
        for (const rec of records) {
            if (rec.type === 'attributes' && rec.target instanceof Element) {
                scrubElement(rec.target);
            }
            rec.addedNodes.forEach((node) => {
                if (node instanceof Element) scrubTree(node);
            });
        }
    });
    networkNodeObserver.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['src', 'srcset', 'href', 'action', 'poster'],
    });
}

function stopNetworkNodeObserver(): void {
    networkNodeObserver?.disconnect();
    networkNodeObserver = null;
}

/** يُشغَّل المراقب فقط أثناء التسليح — صفر تكلفة وهو مطفأ */
export function setLocalOnlyEgressArmed(enabled: boolean): void {
    if (enabled) {
        startNetworkNodeObserver();
        try {
            scrubTree(document);
        } catch {
            /* ignore */
        }
        return;
    }
    stopNetworkNodeObserver();
}

export function resetLocalOnlyEgressPatchesForTests(): void {
    if (typeof window === 'undefined') return;

    if (nativeSetAttribute) {
        Element.prototype.setAttribute = nativeSetAttribute;
    }
    if (nativeSetAttributeNS) {
        Element.prototype.setAttributeNS = nativeSetAttributeNS;
    }
    restoreSrc('img', typeof HTMLImageElement !== 'undefined' ? HTMLImageElement.prototype : null, nativeImgSrcDesc);
    restoreSrc(
        'media',
        typeof HTMLMediaElement !== 'undefined' ? HTMLMediaElement.prototype : null,
        nativeMediaSrcDesc,
    );
    restoreSrc(
        'script',
        typeof HTMLScriptElement !== 'undefined' ? HTMLScriptElement.prototype : null,
        nativeScriptSrcDesc,
    );
    restoreSrc(
        'iframe',
        typeof HTMLIFrameElement !== 'undefined' ? HTMLIFrameElement.prototype : null,
        nativeIframeSrcDesc,
    );
    if (nativeLinkHrefDesc && typeof HTMLLinkElement !== 'undefined') {
        Object.defineProperty(HTMLLinkElement.prototype, 'href', nativeLinkHrefDesc);
    }
    if (nativeRtc) window.RTCPeerConnection = nativeRtc;
    if (nativeOpen) window.open = nativeOpen;
    try {
        if (nativeAssign) Location.prototype.assign = nativeAssign;
        if (nativeReplace) Location.prototype.replace = nativeReplace;
        if (nativeHrefDesc) Object.defineProperty(Location.prototype, 'href', nativeHrefDesc);
    } catch {
        /* ignore */
    }
    if (nativeSetProperty) CSSStyleDeclaration.prototype.setProperty = nativeSetProperty;
    if (nativeFormSubmit) HTMLFormElement.prototype.submit = nativeFormSubmit;
    if (clickBound) {
        document.removeEventListener('click', onDocumentClickCapture, true);
        clickBound = false;
    }
    if (submitBound) {
        document.removeEventListener('submit', onDocumentSubmitCapture, true);
        submitBound = false;
    }
    stopNetworkNodeObserver();

    egressInstalled = false;
    nativeSetAttribute = null;
    nativeSetAttributeNS = null;
    nativeRtc = null;
    nativeImgSrcDesc = null;
    nativeMediaSrcDesc = null;
    nativeScriptSrcDesc = null;
    nativeIframeSrcDesc = null;
    nativeLinkHrefDesc = null;
    nativeOpen = null;
    nativeAssign = null;
    nativeReplace = null;
    nativeHrefDesc = null;
    nativeSetProperty = null;
    nativeFormSubmit = null;
}

function restoreSrc(
    _kind: string,
    proto: object | null,
    desc: PropertyDescriptor | null,
): void {
    if (proto && desc) Object.defineProperty(proto, 'src', desc);
}
