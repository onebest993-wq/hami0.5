/**
 * Debug Utility — opt-in verbose logging in development.
 * Default dev console stays clean; enable via hamiVerboseConsole(true) or debug_mode in localStorage.
 */

import { isVerboseConsoleEnabled } from '@/app/utils/consoleHygiene';
import { isBenignSecureFetchError } from '@/app/services/secureFetchErrors';

const isDev = import.meta.env.DEV === true;
const isTest =
    import.meta.env.MODE === 'test' ||
    (typeof process !== 'undefined' && process.env.NODE_ENV === 'test');

function allowVerboseConsole(): boolean {
    return isDev && !isTest && isVerboseConsoleEnabled();
}

export { isVerboseConsoleEnabled, setVerboseConsoleEnabled } from '@/app/utils/consoleHygiene';

export const debug = {
    log: (...args: unknown[]) => {
        if (allowVerboseConsole()) {
            console.log(...args);
        }
    },

    warn: (...args: unknown[]) => {
        if (allowVerboseConsole()) {
            console.warn(...args);
        }
    },

    error: (...args: unknown[]) => {
        if (args.some((arg) => isBenignSecureFetchError(arg))) {
            if (allowVerboseConsole()) {
                console.log(...args);
            }
            return;
        }
        console.error(...args);
    },

    info: (...args: unknown[]) => {
        if (allowVerboseConsole()) {
            console.info(...args);
        }
    },

    time: (label: string) => {
        if (allowVerboseConsole()) {
            console.time(label);
        }
    },

    timeEnd: (label: string) => {
        if (allowVerboseConsole()) {
            console.timeEnd(label);
        }
    },
};
