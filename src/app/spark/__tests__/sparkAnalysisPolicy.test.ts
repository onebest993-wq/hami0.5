import { describe, expect, it } from 'vitest';
import {
    isSparkLiveDebouncedHost,
    SPARK_LIVE_ANALYSIS_DEBOUNCE_MS,
    SPARK_ON_DEMAND_ONLY,
    SPARK_SHELL_REVIEW_DEBOUNCE_MS,
} from '@/app/spark/policy/sparkAnalysisPolicy';

describe('sparkAnalysisPolicy', () => {
    it('يحدّ التحليل الحي بمسودة إنشاء التنفيذ وملف الدعوى فقط', () => {
        expect(isSparkLiveDebouncedHost('execution_creation')).toBe(true);
        expect(isSparkLiveDebouncedHost('lawsuit_open_file')).toBe(true);
        expect(isSparkLiveDebouncedHost('execution_open')).toBe(false);
        expect(isSparkLiveDebouncedHost('criminal_open')).toBe(false);
    });

    it('يبقي مراجعة Shell أبطأ من التنبيهات', () => {
        expect(SPARK_SHELL_REVIEW_DEBOUNCE_MS).toBeGreaterThan(SPARK_LIVE_ANALYSIS_DEBOUNCE_MS);
    });

    it('لا يشغّل Gemini تلقائياً على الكتابة', () => {
        expect(SPARK_ON_DEMAND_ONLY).toBe(true);
    });
});
