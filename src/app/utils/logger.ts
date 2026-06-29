/**
 * Smart logger — verbose in development only when opt-in console is enabled.
 * Errors always surface. Enable: hamiVerboseConsole(true) then reload.
 */

import { isVerboseConsoleEnabled } from '@/app/utils/consoleHygiene';

const isDevelopment = import.meta.env.DEV;
const isTest =
    import.meta.env.MODE === 'test' ||
    (typeof process !== 'undefined' && process.env.NODE_ENV === 'test');

function allowVerbose(): boolean {
    return isDevelopment && !isTest && isVerboseConsoleEnabled();
}

export const logger = {
    /**
     * Log general information
     */
    log: (...args: unknown[]) => {
        if (allowVerbose()) {
            console.log(...args);
        }
    },

    /**
     * Log warnings
     */
    warn: (...args: unknown[]) => {
        if (allowVerbose()) {
            console.warn(...args);
        }
    },

    /**
     * Log errors (kept in production for monitoring)
     */
    error: (...args: unknown[]) => {
        console.error(...args);
        // في الإنتاج، يمكن إرسال الأخطاء لخدمة monitoring
        if (!isDevelopment) {
            // TODO: Send to error monitoring service (Sentry, etc.)
        }
    },

    /**
     * Log debug information (development only)
     */
    debug: (...args: unknown[]) => {
        if (allowVerbose()) {
            console.debug(...args);
        }
    },

    /**
     * Group logs together
     */
    group: (label: string, ...args: unknown[]) => {
        if (allowVerbose()) {
            console.group(label);
            args.forEach(arg => console.log(arg));
            console.groupEnd();
        }
    },

    /**
     * Log with timestamp
     */
    timestamped: (message: string, ...args: unknown[]) => {
        if (allowVerbose()) {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] ${message}`, ...args);
        }
    },

    /**
     * Performance logging
     */
    performance: (label: string, callback: () => void) => {
        if (allowVerbose()) {
            const start = performance.now();
            callback();
            const end = performance.now();
            console.log(`⏱️ ${label}: ${(end - start).toFixed(2)}ms`);
        } else {
            callback();
        }
    },

    /**
     * Conditional logging based on condition
     */
    logIf: (condition: boolean, ...args: unknown[]) => {
        if (allowVerbose() && condition) {
            console.log(...args);
        }
    },

    /**
     * Log with color (development only)
     */
    colored: (color: string, message: string, ...args: unknown[]) => {
        if (allowVerbose()) {
            console.log(`%c${message}`, `color: ${color}`, ...args);
        }
    },

    /**
     * Success log (green)
     */
    success: (message: string, ...args: unknown[]) => {
        if (allowVerbose()) {
            console.log(`%c✅ ${message}`, 'color: #22c55e', ...args);
        }
    },

    /**
     * Info log (blue)
     */
    info: (message: string, ...args: unknown[]) => {
        if (allowVerbose()) {
            console.log(`%cℹ️ ${message}`, 'color: #3b82f6', ...args);
        }
    },

    /**
     * Table logging for arrays/objects
     */
    table: (data: unknown) => {
        if (allowVerbose()) {
            console.table(data);
        }
    },
};

/**
 * Performance measurement decorator
 */
export function measurePerformance(_target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function (...args: unknown[]) {
        if (allowVerbose()) {
            const start = performance.now();
            const result = originalMethod.apply(this, args);
            const end = performance.now();
            logger.info(`${propertyKey} executed in ${(end - start).toFixed(2)}ms`);
            return result;
        }
        return originalMethod.apply(this, args);
    };
    
    return descriptor;
}

/**
 * Component render logger
 */
export const logRender = (componentName: string, props?: unknown) => {
    if (allowVerbose()) {
        logger.group(`🔄 ${componentName} rendered`, props);
    }
};

/**
 * State change logger
 */
export const logStateChange = (stateName: string, oldValue: unknown, newValue: unknown) => {
    if (allowVerbose()) {
        logger.log(`📊 State "${stateName}" changed:`, {
            from: oldValue,
            to: newValue,
        });
    }
};

export default logger;