import type { Plugin, PreviewServer, ViteDevServer } from 'vite';

function rewriteAdminUrlToHqHtml(url: string | undefined): string | null {
    if (!url) return null;
    const cut = url.indexOf('?');
    const path = cut === -1 ? url : url.slice(0, cut);
    const query = cut === -1 ? '' : url.slice(cut);
    if (path === '/hq.html') return null;
    if (path === '/admin' || path === '/admin/' || path.startsWith('/admin/')) {
        return `/hq.html${query}`;
    }
    return null;
}

function attachHqRewrite(server: ViteDevServer | PreviewServer): void {
    server.middlewares.use((req, _res, next) => {
        const nextUrl = rewriteAdminUrlToHqHtml(req.url);
        if (nextUrl) req.url = nextUrl;
        next();
    });
}

/** في التطوير: /admin يبقى في شريط العنوان ويُخدم من hq.html لا من لوحة المحامي. */
export function hamiHqDocumentRewrite(): Plugin {
    return {
        name: 'hami-hq-document-rewrite',
        configureServer(server) {
            attachHqRewrite(server);
        },
        configurePreviewServer(server) {
            attachHqRewrite(server);
        },
    };
}
