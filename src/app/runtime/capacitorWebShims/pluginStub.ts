/** ويب فقط — يُستبدل به أي @capacitor/* plugin في بناء الويب. */
export const App = {
    addListener: async () => ({ remove: async () => undefined }),
};
export const Keyboard = {
    setResizeMode: async () => undefined,
    setStyle: async () => undefined,
};
export const KeyboardResize = { Body: 'body', Native: 'native', Ionic: 'ionic', None: 'none' };
export const KeyboardStyle = { Dark: 'DARK', Light: 'LIGHT', Default: 'DEFAULT' };
export const Geolocation = {
    getCurrentPosition: async () => {
        throw new Error('Geolocation unavailable on web build');
    },
};
export const Filesystem = {
    writeFile: async () => undefined,
};
export const Directory = { Documents: 'DOCUMENTS' };
export const Encoding = { UTF8: 'utf8' };
export const Share = {
    share: async () => undefined,
};
export const Haptics = {
    impact: async () => undefined,
    notification: async () => undefined,
    vibrate: async () => undefined,
    selectionStart: async () => undefined,
    selectionChanged: async () => undefined,
    selectionEnd: async () => undefined,
};
export const ImpactStyle = { Heavy: 'HEAVY', Medium: 'MEDIUM', Light: 'LIGHT' };
export const NotificationType = { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' };
