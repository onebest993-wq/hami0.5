/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚡ Performance Monitor - Real-time Performance Tracking
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Monitors and tracks application performance metrics
 * مراقبة وتتبع مقاييس أداء التطبيق
 * 
 * @version 1.0.0
 * @author Hami Legal System - Performance Suite
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface PerformanceMetric {
    name: string;
    duration: number;
    timestamp: number;
    metadata?: Record<string, unknown>;
}

interface PerformanceReport {
    metrics: PerformanceMetric[];
    averages: Record<string, number>;
    slowest: PerformanceMetric[];
    fastest: PerformanceMetric[];
}

// ═══════════════════════════════════════════════════════════════════════════
// PERFORMANCE MONITOR CLASS
// ═══════════════════════════════════════════════════════════════════════════

class PerformanceMonitorClass {
    private metrics: PerformanceMetric[] = [];
    private readonly maxMetrics = 1000;
    private marks: Map<string, number> = new Map();

    /**
     * Start measuring a performance metric
     */
    start(name: string): void {
        this.marks.set(name, performance.now());
    }

    /**
     * End measuring and record the metric
     */
    end(name: string, metadata?: Record<string, unknown>): number {
        const startTime = this.marks.get(name);
        if (!startTime) {
            console.warn(`[Performance] No start mark found for: ${name}`);
            return 0;
        }

        const duration = performance.now() - startTime;
        
        this.metrics.push({
            name,
            duration,
            timestamp: Date.now(),
            metadata
        });

        // Cleanup old metrics if we exceed max
        if (this.metrics.length > this.maxMetrics) {
            this.metrics = this.metrics.slice(-this.maxMetrics);
        }

        this.marks.delete(name);
        return duration;
    }

    /**
     * Measure a synchronous function
     */
    measure<T>(name: string, fn: () => T, metadata?: Record<string, unknown>): T {
        this.start(name);
        try {
            const result = fn();
            return result;
        } finally {
            this.end(name, metadata);
        }
    }

    /**
     * Measure an async function
     */
    async measureAsync<T>(
        name: string, 
        fn: () => Promise<T>,
        metadata?: Record<string, unknown>
    ): Promise<T> {
        this.start(name);
        try {
            const result = await fn();
            return result;
        } finally {
            this.end(name, metadata);
        }
    }

    /**
     * Get metrics for a specific name
     */
    getMetrics(name?: string): PerformanceMetric[] {
        if (!name) return [...this.metrics];
        return this.metrics.filter(m => m.name === name);
    }

    /**
     * Get average duration for a metric
     */
    getAverage(name: string): number {
        const metrics = this.getMetrics(name);
        if (metrics.length === 0) return 0;
        
        const sum = metrics.reduce((acc, m) => acc + m.duration, 0);
        return sum / metrics.length;
    }

    /**
     * Get performance report
     */
    getReport(): PerformanceReport {
        // Calculate averages
        const averages: Record<string, number> = {};
        const metricNames = new Set(this.metrics.map(m => m.name));
        
        metricNames.forEach(name => {
            averages[name] = this.getAverage(name);
        });

        // Get slowest and fastest
        const sorted = [...this.metrics].sort((a, b) => b.duration - a.duration);
        const slowest = sorted.slice(0, 10);
        const fastest = sorted.slice(-10).reverse();

        return {
            metrics: [...this.metrics],
            averages,
            slowest,
            fastest
        };
    }

    /**
     * Clear all metrics
     */
    clear(): void {
        this.metrics = [];
        this.marks.clear();
    }

    /**
     * Log performance report to console
     */
    logReport(): void {
        const report = this.getReport();
        
        console.group('📊 Performance Report');
        console.log('Total Metrics:', report.metrics.length);
        
        console.group('⚡ Averages');
        Object.entries(report.averages).forEach(([name, avg]) => {
            console.log(`${name}: ${avg.toFixed(2)}ms`);
        });
        console.groupEnd();
        
        if (report.slowest.length > 0) {
            console.group('🐌 Slowest Operations');
            report.slowest.forEach((m, i) => {
                console.log(`${i + 1}. ${m.name}: ${m.duration.toFixed(2)}ms`);
            });
            console.groupEnd();
        }
        
        if (report.fastest.length > 0) {
            console.group('🚀 Fastest Operations');
            report.fastest.forEach((m, i) => {
                console.log(`${i + 1}. ${m.name}: ${m.duration.toFixed(2)}ms`);
            });
            console.groupEnd();
        }
        
        console.groupEnd();
    }

    /**
     * Get performance score (0-100)
     */
    getScore(): number {
        const report = this.getReport();
        const averages = Object.values(report.averages);
        
        if (averages.length === 0) return 100;
        
        const avgDuration = averages.reduce((a, b) => a + b, 0) / averages.length;
        
        // Score based on average duration
        // < 50ms = 100, > 500ms = 0
        if (avgDuration < 50) return 100;
        if (avgDuration > 500) return 0;
        
        return Math.round(100 - ((avgDuration - 50) / 450) * 100);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

export const PerformanceMonitor = new PerformanceMonitorClass();

// ═══════════════════════════════════════════════════════════════════════════
// REACT HOOKS
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect } from 'react';

/**
 * Hook to measure component render time
 */
export function usePerformanceMonitor(componentName: string, dependencies: unknown[] = []) {
    useEffect(() => {
        PerformanceMonitor.start(`${componentName}-render`);
        return () => {
            PerformanceMonitor.end(`${componentName}-render`);
        };
    }, dependencies);
}

/**
 * Hook to measure component mount time
 */
export function useMountPerformance(componentName: string) {
    useEffect(() => {
        PerformanceMonitor.start(`${componentName}-mount`);
        return () => {
            PerformanceMonitor.end(`${componentName}-mount`);
        };
    }, [componentName]);
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Measure React component render performance
 */
export function measureRender(componentName: string) {
    return {
        start: () => PerformanceMonitor.start(`render-${componentName}`),
        end: () => PerformanceMonitor.end(`render-${componentName}`)
    };
}

/**
 * Measure data fetch performance
 */
export async function measureFetch<T>(
    name: string,
    fetchFn: () => Promise<T>
): Promise<T> {
    return PerformanceMonitor.measureAsync(`fetch-${name}`, fetchFn);
}

/**
 * Measure storage operation performance
 */
export async function measureStorage<T>(
    operation: string,
    fn: () => Promise<T>
): Promise<T> {
    return PerformanceMonitor.measureAsync(`storage-${operation}`, fn);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default PerformanceMonitor;

export type { PerformanceMetric, PerformanceReport };
