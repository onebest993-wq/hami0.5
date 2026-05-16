/**
 * Debug Utility - Console Logging Helper
 * Automatically disables debug logs in production build
 */

const isDev = import.meta.env.DEV === true;
const isTest =
    import.meta.env.MODE === 'test' ||
    (typeof process !== 'undefined' && process.env.NODE_ENV === 'test');

/** تطوير حقيقي فقط — لا إنتاج ولا Vitest (يقلل آلاف السطور في CI) */
const allowVerboseConsole = isDev && !isTest;

export const debug = {
    /**
     * Log messages only in development mode
     */
    log: (...args: any[]) => {
        if (allowVerboseConsole) {
            console.log(...args);
        }
    },

    /**
     * Warning messages only in development mode
     */
    warn: (...args: any[]) => {
        if (allowVerboseConsole) {
            console.warn(...args);
        }
    },

    /**
     * Error messages (always logged, even in production)
     */
    error: (...args: any[]) => {
        console.error(...args);
    },

    /**
     * Info messages only in development mode
     */
    info: (...args: any[]) => {
        if (isDev) {
            console.info(...args);
        }
    },

    /**
     * Performance timing helper
     */
    time: (label: string) => {
        if (allowVerboseConsole) {
            console.time(label);
        }
    },

    timeEnd: (label: string) => {
        if (allowVerboseConsole) {
            console.timeEnd(label);
        }
    },
};
