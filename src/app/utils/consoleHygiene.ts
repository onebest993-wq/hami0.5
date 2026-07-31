/**
 * Console hygiene — suppresses benign browser noise; verbose logs are opt-in in dev.
 * Enable verbose: sessionStorage.setItem('hami:verbose-console', '1') then reload
 * Or in console: hamiVerboseConsole(true)
 */

const VERBOSE_CONSOLE_KEY = 'hami:verbose-console';
const DEBUG_MODE_KEY = 'debug_mode';

const BENIGN_ERROR_PATTERNS: RegExp[] = [
    /ResizeObserver loop/i,
    /ResizeObserver loop completed with undelivered notifications/i,
];

const BENIGN_INFO_PATTERNS: RegExp[] = [
    /Download the React DevTools for a better development experience/i,
    /\[CursorBrowser\]/i,
    /Native dialog overrides installed/i,
];

const BENIGN_DEBUG_PATTERNS: RegExp[] = [/^\[vite\] connecting/i, /^\[vite\] connected/i, /^\[vite\] hot updated/i];

const BENIGN_WARN_PATTERNS: RegExp[] = [
    /was preloaded using link preload but not used within a few seconds/i,
    /Reduced Motion enabled on your device/i,
    /motion\.dev\/troubleshooting\/reduced-motion/i,
    /\[CursorBrowser\]/i,
    /Native dialog overrides installed/i,
    /\[SecureStore\].*Refused empty overwrite/i,
    /\[KvGuard\]/i,
    /\[Violation\].*non-passive event listener/i,
    /\[Violation\].*scroll-blocking/i,
    /\[Violation\].*notification permission/i,
    /@supabase\/gotrue-js: Lock .* was not released within/i,
];

const BENIGN_LOG_PATTERNS: RegExp[] = [
    /\[CursorBrowser\]/i,
    /Native dialog overrides installed/i,
];

function messageText(args: unknown[]): string {
    return args
        .map((arg) => {
            if (typeof arg === 'string') return arg;
            if (arg instanceof Error) return arg.message;
            try {
                return JSON.stringify(arg);
            } catch {
                return String(arg);
            }
        })
        .join(' ');
}

export function isBenignConsoleMessage(text: string, level: 'error' | 'warn' | 'info' | 'debug' | 'log'): boolean {
    if (level === 'error') return BENIGN_ERROR_PATTERNS.some((pattern) => pattern.test(text));
    if (level === 'warn') return BENIGN_WARN_PATTERNS.some((pattern) => pattern.test(text));
    if (level === 'info') return BENIGN_INFO_PATTERNS.some((pattern) => pattern.test(text));
    if (level === 'debug') return BENIGN_DEBUG_PATTERNS.some((pattern) => pattern.test(text));
    if (level === 'log') return BENIGN_LOG_PATTERNS.some((pattern) => pattern.test(text));
    return false;
}

export function isVerboseConsoleEnabled(): boolean {
    if (!import.meta.env.DEV || import.meta.env.MODE === 'test') return false;
    if (typeof window === 'undefined') return false;
    try {
        if (sessionStorage.getItem(VERBOSE_CONSOLE_KEY) === '1') return true;
        if (localStorage.getItem(DEBUG_MODE_KEY) === 'true') return true;
    } catch {
        /* ignore */
    }
    return false;
}

export function setVerboseConsoleEnabled(enabled: boolean): void {
    try {
        if (enabled) sessionStorage.setItem(VERBOSE_CONSOLE_KEY, '1');
        else sessionStorage.removeItem(VERBOSE_CONSOLE_KEY);
    } catch {
        /* ignore */
    }
}

let installed = false;

export function installConsoleHygiene(): void {
    if (installed || typeof window === 'undefined') return;
    installed = true;

    window.addEventListener(
        'error',
        (event) => {
            const msg = event.message ?? '';
            if (isBenignConsoleMessage(msg, 'error')) {
                event.preventDefault();
            }
        },
        true,
    );

    if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
        const nativeInfo = console.info.bind(console);
        const nativeDebug = console.debug.bind(console);
        const nativeWarn = console.warn.bind(console);
        const nativeLog = console.log.bind(console);

        console.info = (...args: unknown[]) => {
            const text = messageText(args);
            if (isBenignConsoleMessage(text, 'info')) return;
            nativeInfo(...args);
        };

        console.debug = (...args: unknown[]) => {
            const text = messageText(args);
            if (isBenignConsoleMessage(text, 'debug')) return;
            nativeDebug(...args);
        };

        console.warn = (...args: unknown[]) => {
            const text = messageText(args);
            if (isBenignConsoleMessage(text, 'warn')) return;
            nativeWarn(...args);
        };

        console.log = (...args: unknown[]) => {
            const text = messageText(args);
            if (isBenignConsoleMessage(text, 'log')) return;
            nativeLog(...args);
        };

        (window as Window & { hamiVerboseConsole?: (enabled?: boolean) => void }).hamiVerboseConsole = (
            enabled = true,
        ) => {
            setVerboseConsoleEnabled(enabled);
            nativeInfo(
                `[Hami] verbose console ${enabled ? 'enabled' : 'disabled'} — reload the page to apply`,
            );
        };
    }
}
