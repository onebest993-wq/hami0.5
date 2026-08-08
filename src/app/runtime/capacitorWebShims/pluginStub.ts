/** ويب فقط — يُستبدل به أي @capacitor/* plugin في بناء الويب. */
export const App = {
    addListener: async () => ({ remove: async () => undefined }),
};
export const StatusBar = {
    setStyle: async () => undefined,
    setBackgroundColor: async () => undefined,
};
export const Style = { Dark: 'DARK', Light: 'LIGHT' };
export const Keyboard = {
    setResizeMode: async () => undefined,
};
export const KeyboardResize = { Body: 'body', Native: 'native', Ionic: 'ionic', None: 'none' };
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
