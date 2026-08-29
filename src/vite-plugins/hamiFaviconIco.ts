import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

/** Chrome يطلب /favicon.ico تلقائياً — 204 بدل 404 في كونسول التطوير */
function silenceFaviconIco(req: IncomingMessage, res: ServerResponse, next: () => void): void {
    const url = req.url?.split('?')[0];
    if (url !== '/favicon.ico') {
        next();
        return;
    }
    res.statusCode = 204;
    res.end();
}

export function hamiFaviconIco(): Plugin {
    return {
        name: 'hami-favicon-ico',
        configureServer(server) {
            server.middlewares.use(silenceFaviconIco);
        },
        configurePreviewServer(server) {
            server.middlewares.use(silenceFaviconIco);
        },
    };
}
