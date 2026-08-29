/** غلاف Capacitor — html[data-hami-native=1] من قالب الإقلاع الأصلي (DOM فقط، بلا Capacitor). */
export function isHamiNativeShell(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute('data-hami-native') === '1';
}
