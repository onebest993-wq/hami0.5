/** علم BFF فقط — بدون سحب bffAuthClient/Crypto إلى مسار الإقلاع */
export function isBffAuthEnabled(): boolean {
    return import.meta.env.VITE_BFF_AUTH === 'true';
}
