import type { VercelRequest, VercelResponse } from '../../../api/_vercelRuntimeTypes.ts';
import { routeLoaders, type RouteModule } from './vercelRouteManifest.ts';
import { applyWebResponseHeadersToNode, createWebRequestFromNode } from './security/nodeWebApiBridge.ts';
import {
    isHeadquartersOnlyApiPath,
    rejectHeadquartersPublicSurface,
} from './security/headquartersOriginGate.ts';
import { resolveVercelApiSlug } from './security/resolveVercelApiSlug.ts';

export const config = {
    api: {
        bodyParser: false,
    },
};

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

function readRawBody(req: VercelRequest): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer | string) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

async function toWebRequest(req: VercelRequest): Promise<Request> {
    const proto = String(req.headers['x-forwarded-proto'] ?? 'https');
    const host = String(req.headers.host ?? 'localhost');
    const pathWithQuery = req.url ?? '/';
    const url = `${proto}://${host}${pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`}`;
    const method = (req.method ?? 'GET').toUpperCase();
    const hasBody = method !== 'GET' && method !== 'HEAD';
    const raw = hasBody ? await readRawBody(req) : Buffer.alloc(0);
    return createWebRequestFromNode(url, req, raw.byteLength > 0 ? new Uint8Array(raw) : undefined);
}

async function pipeWebResponse(res: VercelResponse, webRes: Response): Promise<void> {
    res.statusCode = webRes.status;
    applyWebResponseHeadersToNode(res, webRes);
    if (!webRes.body) {
        res.end();
        return;
    }
    const reader = webRes.body.getReader();
    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value?.byteLength) res.write(Buffer.from(value));
        }
    } finally {
        reader.releaseLock();
    }
    res.end();
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    try {
        const slug = resolveVercelApiSlug(req);
        const pathname = `/api/${slug}`;
        const method = (req.method ?? 'GET').toUpperCase();
        if (isHeadquartersOnlyApiPath(pathname)) {
            const proto = String(req.headers['x-forwarded-proto'] ?? 'https');
            const host = String(req.headers.host ?? 'localhost');
            const pathWithQuery = req.url ?? '/';
            const url = `${proto}://${host}${pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`}`;
            const gateReq = createWebRequestFromNode(url, req);
            const denied = rejectHeadquartersPublicSurface(gateReq);
            if (denied) {
                if (method !== 'GET' && method !== 'HEAD') {
                    await readRawBody(req).catch(() => Buffer.alloc(0));
                }
                await pipeWebResponse(res, denied);
                return;
            }
        }

        const loader = routeLoaders[slug];
        if (!loader) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'Not found' }));
            return;
        }

        if (!METHODS.includes(method as (typeof METHODS)[number])) {
            res.statusCode = 405;
            res.end();
            return;
        }

        const mod = (await loader()) as RouteModule;
        const fn = mod[method as keyof RouteModule];
        if (typeof fn !== 'function') {
            res.statusCode = 405;
            res.end();
            return;
        }

        const webReq = await toWebRequest(req);
        const webRes = await (fn as (request: Request) => Promise<Response>)(webReq);
        await pipeWebResponse(res, webRes);
    } catch (e) {
        console.error('[vercel-api]', e);
        if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'خطأ داخلي في الخادم' }));
        }
    }
}
