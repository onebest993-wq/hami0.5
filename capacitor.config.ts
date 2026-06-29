/// <reference types="@capacitor-community/privacy-screen" />

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'iq.hami.legal',
    appName: 'Hami Legal',
    webDir: 'dist',
    server: {
        androidScheme: 'https',
    },
    ios: {
        contentInset: 'automatic',
        scrollEnabled: true,
    },
    android: {
        allowMixedContent: false,
    },
    plugins: {
        Keyboard: {
            resize: 'body',
            resizeOnFullScreen: true,
        },
        StatusBar: {
            style: 'DARK',
            backgroundColor: '#05060D',
        },
        PrivacyScreen: {
            enable: false,
            preventScreenshots: true,
        },
    },
};

export default config;
