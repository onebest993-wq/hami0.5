const POST_PREFIX = 'community/post/';

export type CommunityDeepLinkTarget = {
    postId: string;
    openComments: boolean;
};

function parseHashBody(hash: string): string {
    return hash.replace(/^#/, '').replace(/^\//, '');
}

export function parseCommunityDeepLinkFromHash(hash: string): CommunityDeepLinkTarget | null {
    const raw = parseHashBody(hash);
    if (!raw.startsWith(POST_PREFIX)) return null;
    const rest = raw.slice(POST_PREFIX.length);
    const segments = rest.split('/').filter(Boolean);
    const postIdRaw = segments[0]?.split(/[?#]/)[0]?.trim();
    if (!postIdRaw) return null;
    let postId: string;
    try {
        postId = decodeURIComponent(postIdRaw);
    } catch {
        postId = postIdRaw;
    }
    const openComments =
        segments[1] === 'comments' ||
        rest.includes('/comments') ||
        /(?:^|[?&])comments=1(?:&|$)/.test(rest);
    return { postId, openComments };
}

export function parseCommunityPostIdFromHash(hash: string): string | null {
    return parseCommunityDeepLinkFromHash(hash)?.postId ?? null;
}

export function parseCommunityPostIdFromLocation(loc: Pick<Location, 'hash'>): string | null {
    return parseCommunityPostIdFromHash(loc.hash || '');
}

export function parseCommunityDeepLinkFromLocation(loc: Pick<Location, 'hash'>): CommunityDeepLinkTarget | null {
    return parseCommunityDeepLinkFromHash(loc.hash || '');
}

export function buildCommunityPostShareUrl(postId: string, opts?: { openComments?: boolean }): string {
    const suffix = opts?.openComments ? '/comments' : '';
    if (typeof window === 'undefined') {
        return `#${POST_PREFIX}${encodeURIComponent(postId)}${suffix}`;
    }
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}#${POST_PREFIX}${encodeURIComponent(postId)}${suffix}`;
}

export function setCommunityPostHash(postId: string, opts?: { openComments?: boolean }): void {
    if (typeof window === 'undefined') return;
    const suffix = opts?.openComments ? '/comments' : '';
    const next = `#${POST_PREFIX}${encodeURIComponent(postId)}${suffix}`;
    if (window.location.hash === next) return;
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${next}`);
}
