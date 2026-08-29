/// <reference types="@capacitor-community/privacy-screen" />
/// <reference types="@capacitor/keyboard" />

import type { CapacitorConfig } from '@capacitor/cli';

/** حامٍ: تطبيق يد (هاتف/لوحي) عبر Capacitor — ليست تجربة سطح مكتب تُكيَّف لاحقاً. */
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
        backgroundColor: '#0A0F1C',
    },
    plugins: {
        SplashScreen: {
            launchShowDuration: 0,
            launchAutoHide: false,
            launchFadeOutDuration: 0,
            backgroundColor: '#0A0F1C',
            androidSplashResourceName: 'splash',
            androidScaleType: 'FIT_CENTER',
            showSpinner: false,
            splashFullScreen: false,
            splashImmersive: false,
        },
        Keyboard: {
            resize: 'body',
            style: 'DARK',
            resizeOnFullScreen: true,
            autoBackdropColor: 'auto',
        },
        PrivacyScreen: {
            enable: true,
            preventScreenshots: true,
        },
        LocalNotifications: {
            smallIcon: 'ic_launcher_foreground',
            iconColor: '#E6C673',
            sound: 'hami_arrival.wav',
        },
        PushNotifications: {
            presentationOptions: ['badge', 'sound', 'alert'],
        },
    },
};

export default config;
