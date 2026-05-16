/**
 * أدوات تجميع تقارير الجودة لسكربت `scripts/run-quality-check.ts`.
 * القيم المُمرَّرة من السكربت ثابتة توضيحية؛ المنطق خفيف وقابل للتوسعة لاحقاً.
 */

export type QualityCheckMetric = {
    category: string;
    score: number;
    summary: string;
};

export type QualityReport = {
    overallScore: number;
    grade: string;
    metrics: QualityCheckMetric[];
};

type ComponentOptimizationRow = {
    name: string;
    hasMemo: boolean;
    hasUseMemo: boolean;
    hasUseCallback: boolean;
    complexity: number;
    linesOfCode: number;
};

function average(nums: number[]): number {
    if (nums.length === 0) return 0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function gradeFromScore(overallScore: number): string {
    if (overallScore >= 97) return 'A+';
    if (overallScore >= 93) return 'A';
    if (overallScore >= 90) return 'A-';
    if (overallScore >= 87) return 'B+';
    if (overallScore >= 83) return 'B';
    if (overallScore >= 80) return 'B-';
    if (overallScore >= 77) return 'C+';
    if (overallScore >= 73) return 'C';
    if (overallScore >= 70) return 'C-';
    if (overallScore >= 60) return 'D';
    return 'F';
}

export class CodeQualityChecker {
    static checkComponentOptimization(
        components: ComponentOptimizationRow[]
    ): QualityCheckMetric {
        const scores = components.map((c) => {
            let s = 40;
            if (c.hasMemo) s += 15;
            if (c.hasUseMemo) s += 15;
            if (c.hasUseCallback) s += 15;
            if (c.complexity <= 10) s += 10;
            if (c.linesOfCode < 500) s += 5;
            return Math.min(100, s);
        });
        const score = Math.round(average(scores));
        return {
            category: 'تحسين المكوّنات',
            score,
            summary: `${components.length} مكوّن`,
        };
    }

    static checkTestCoverage(coverage: {
        lines: number;
        branches: number;
        functions: number;
        statements: number;
    }): QualityCheckMetric {
        const score = Math.round(
            (coverage.lines +
                coverage.branches +
                coverage.functions +
                coverage.statements) /
                4
        );
        return {
            category: 'تغطية الاختبارات',
            score: Math.min(100, score),
            summary: `أسطر ${coverage.lines}%`,
        };
    }

    static checkErrorHandling(h: {
        hasErrorBoundary: boolean;
        errorBoundaryCount: number;
        hasTryCatch: boolean;
        tryCatchCount: number;
    }): QualityCheckMetric {
        let score = 55;
        if (h.hasErrorBoundary) score += 20;
        if (h.errorBoundaryCount >= 3) score += 10;
        if (h.hasTryCatch) score += 10;
        if (h.tryCatchCount >= 10) score += 5;
        return {
            category: 'معالجة الأخطاء',
            score: Math.min(100, score),
            summary: `${h.tryCatchCount} try/catch`,
        };
    }

    static checkLoadingStates(l: {
        loadingComponentsCount: number;
        componentsWithLoading: number;
        totalComponents: number;
    }): QualityCheckMetric {
        const ratio = l.totalComponents
            ? l.componentsWithLoading / l.totalComponents
            : 0;
        const score = Math.min(100, Math.round(35 + ratio * 65));
        return {
            category: 'حالات التحميل',
            score,
            summary: `${l.componentsWithLoading}/${l.totalComponents} مع تحميل`,
        };
    }

    static checkTypeScript(t: {
        strictMode: boolean;
        noImplicitAny: boolean;
        typesCoverage: number;
    }): QualityCheckMetric {
        let score = Math.min(100, t.typesCoverage);
        if (t.strictMode) score = Math.min(100, score + 2);
        if (t.noImplicitAny) score = Math.min(100, score + 2);
        return {
            category: 'TypeScript',
            score,
            summary: `تغطية أنواع ~${t.typesCoverage}%`,
        };
    }

    static checkOrganization(o: {
        avgFileSize: number;
        maxFileSize: number;
        modularity: number;
        componentReuse: number;
    }): QualityCheckMetric {
        const score = Math.round((o.modularity + o.componentReuse) / 2);
        return {
            category: 'تنظيم الكود',
            score: Math.min(100, score),
            summary: `تعددية ${o.modularity}`,
        };
    }

    static checkDocumentation(d: {
        commentedFunctions: number;
        totalFunctions: number;
        hasReadme: boolean;
        hasTests: boolean;
        testDocs: number;
    }): QualityCheckMetric {
        const ratio = d.totalFunctions
            ? d.commentedFunctions / d.totalFunctions
            : 0;
        let score = Math.round(ratio * 85);
        if (d.hasReadme) score += 5;
        if (d.hasTests) score += 10;
        return {
            category: 'التوثيق',
            score: Math.min(100, score),
            summary: `${d.commentedFunctions}/${d.totalFunctions} مع تعليق`,
        };
    }

    static generateReport(metrics: QualityCheckMetric[]): QualityReport {
        const overallScore = Math.round(
            metrics.reduce((a, m) => a + m.score, 0) / metrics.length
        );
        return {
            overallScore,
            grade: gradeFromScore(overallScore),
            metrics,
        };
    }

    static logReport(report: QualityReport): void {
        console.log(`الإجمالي: ${report.overallScore}/100 (${report.grade})`);
        report.metrics.forEach((m) => {
            console.log(`  • ${m.category}: ${m.score} — ${m.summary}`);
        });
    }
}
