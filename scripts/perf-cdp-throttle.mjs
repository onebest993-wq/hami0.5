/**
 * CDP network/CPU throttle profiles for perf probes (shared by boot + lawsuits TTFI).
 */

export function resolvePlaywrightDeviceProfile(device) {
    if (device === 'mobile' || device === 'pixel7') {
        return { name: 'Pixel 7', key: 'pixel7' };
    }
    if (device === 'iphone14') {
        return { name: 'iPhone 14', key: 'iphone14' };
    }
    return { name: 'Desktop Chrome', key: 'desktop' };
}

export async function applyPerfCdpThrottle(context, page, throttle) {
    if (throttle !== 'slow-mobile') return async () => {};

    const session = await context.newCDPSession(page);
    await session.send('Network.enable');
    await session.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 150,
        downloadThroughput: Math.round((1.6 * 1024 * 1024) / 8),
        uploadThroughput: Math.round((0.75 * 1024 * 1024) / 8),
        connectionType: 'cellular4g',
    });
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    return async () => {
        await session.send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => undefined);
        await session.send('Network.disable').catch(() => undefined);
    };
}

export function median(values) {
    const sorted = [...values].filter((v) => typeof v === 'number').sort((a, b) => a - b);
    if (!sorted.length) return null;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}
