/// <reference types="@capacitor-community/privacy-screen" />
/// <reference types="@capacitor/keyboard" />

import type { CapacitorConfig } from '@capacitor/cli';

/** حامٍ: تطبيق يد (هاتف/لوحي) عبر Capacitor — ليست تجربة سطح مكتب تُكيَّف لاحقاً. */
const nativeHostname = String(process.env.HAMI_NATIVE_HOSTNAME ?? '').trim();

const config: CapacitorConfig = {
    appId: 'iq.hami.legal',
    appName: 'Hami Legal',
    webDir: 'dist',
    server: {
        androidScheme: 'https',
        allowNavigation: [],
        /*
         * مضيف الـWebView. الافتراضي `localhost` فأصل الوثيقة `https://localhost`.
         *
         * وكوكيز الجلسة `SameSite=Strict` (sessionCookie.ts:77)، و`Strict` لا يعبر
         * **المواقع** — فطلبٌ من `https://localhost` إلى `https://api.example.com`
         * لا تُرسَل معه الكوكيز مهما ضُبط CORS.
         *
         * لكن `SameSite` يقيس **النطاق المسجَّل** لا الأصل: `app.example.com` و
         * `api.example.com` نفس الموقع وإن اختلف الأصل. فضبط هذا على مضيف تحت نطاق
         * الإنتاج يجعل الكوكيز `Strict` تعبر إلى الـAPI **بلا إضعافها إلى `None`**؛
         * ترتيبُ نطاقات لا تنازلٌ أمني.
         *
         *     HAMI_NATIVE_HOSTNAME=app.example.com
         *     VITE_API_ORIGIN=https://api.example.com    ← النطاق المسجَّل نفسه
         *
         * وتركه فارغاً يُبقي السلوك كما هو حرفياً. FINDING-010.
         */
        ...(nativeHostname ? { hostname: nativeHostname } : {}),
    },
    ios: {
        contentInset: 'automatic',
        scrollEnabled: true,
    },
    android: {
        allowMixedContent: false,
        backgroundColor: '#0A0F1C',
        hardwareAccelerated: true,
        webContentsDebuggingEnabled: false,
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
