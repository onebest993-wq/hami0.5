/**
 * كاش بلاطات المركز — يتجاوز الهيكل إن وصل المقطع بعد طلاء الشبكة.
 */
export type CommandHubTilesModule = typeof import('@/app/components/lawyer/dashboard/commandHub');
type Listener = () => void;

type TilesSnapshot = {
    v: number;
    mod: CommandHubTilesModule;
};

let tilesPromise: Promise<CommandHubTilesModule> | null = null;
let snapshot: TilesSnapshot | null = null;
let tilesSeq = 0;
const listeners = new Set<Listener>();

function emitCommandHubTiles(): void {
    for (const listener of listeners) listener();
}

function publishTiles(mod: CommandHubTilesModule): void {
    tilesSeq += 1;
    snapshot = { v: tilesSeq, mod };
    emitCommandHubTiles();
    /* ربع الملف بعد كشف الشبكة — لا يتسابق مع HomeTab/tiles تحت الشعار */
}

export function getCommandHubTilesSync(): CommandHubTilesModule | null {
    return snapshot?.mod ?? null;
}

/** لقطة للمتجر — تتغيّر الهوية عند كل نشر حتى يعيد React رسم البلاطات بعد HMR */
export function getCommandHubTilesStoreSnapshot(): TilesSnapshot | null {
    return snapshot;
}

export function subscribeCommandHubTiles(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function ensureCommandHubTilesPromise(): Promise<CommandHubTilesModule> {
    if (!tilesPromise) {
        tilesPromise = import('@/app/components/lawyer/dashboard/commandHub').then((mod) => {
            publishTiles(mod);
            return mod;
        });
    }
    return tilesPromise;
}

export function prefetchCommandHubTiles(): void {
    if (typeof window === 'undefined') return;
    void ensureCommandHubTilesPromise().catch(() => undefined);
}

export function loadCommandHubTiles(): Promise<CommandHubTilesModule> {
    return ensureCommandHubTilesPromise();
}

export function resetCommandHubTilesCache(): void {
    tilesPromise = null;
    snapshot = null;
    emitCommandHubTiles();
}

/** بعد تحديث ملف بلاطة: نفس الوحدة مع جيل جديد حتى لا يبقى RouteTile القديم في الشجرة */
export function bumpCommandHubTilesGeneration(): void {
    if (!snapshot) {
        void loadCommandHubTiles();
        return;
    }
    publishTiles(snapshot.mod);
}

export function resetCommandHubTilesCacheForTests(): void {
    tilesPromise = null;
    snapshot = null;
    tilesSeq = 0;
}

if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        resetCommandHubTilesCache();
    });
}
