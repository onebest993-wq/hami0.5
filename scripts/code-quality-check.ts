/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔍 CODE QUALITY CHECKER - فاحص جودة الكود
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Automated code quality and best practices checker
 * 
 * Usage: npx tsx scripts/code-quality-check.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface QualityIssue {
    file: string;
    line: number;
    type: 'warning' | 'error' | 'info';
    category: string;
    message: string;
}

const issues: QualityIssue[] = [];
let filesScanned = 0;
let totalLines = 0;

/**
 * Scan directory recursively
 */
function scanDirectory(dir: string, extensions: string[] = ['.ts', '.tsx']) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            // Skip node_modules, dist, etc.
            if (!['node_modules', 'dist', 'build', '.git'].includes(file)) {
                scanDirectory(filePath, extensions);
            }
        } else if (extensions.some(ext => file.endsWith(ext))) {
            scanFile(filePath);
        }
    }
}

/**
 * Scan individual file for issues
 */
function scanFile(filePath: string) {
    filesScanned++;
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    totalLines += lines.length;
    
    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        
        // Check 1: console.log (should use logger)
        if (/console\.(log|debug|info)/.test(line) && !line.includes('console.error')) {
            issues.push({
                file: filePath,
                line: lineNumber,
                type: 'warning',
                category: 'Logging',
                message: 'استخدم logger بدلاً من console.log للحصول على production-safe logging'
            });
        }
        
        // Check 2: debugger statements
        if (/debugger;/.test(line)) {
            issues.push({
                file: filePath,
                line: lineNumber,
                type: 'error',
                category: 'Debugging',
                message: 'إزالة debugger statement قبل الإنتاج'
            });
        }
        
        // Check 3: TODO comments
        if (/\/\/\s*TODO:/i.test(line)) {
            issues.push({
                file: filePath,
                line: lineNumber,
                type: 'info',
                category: 'TODO',
                message: `TODO: ${line.trim()}`
            });
        }
        
        // Check 4: FIXME comments
        if (/\/\/\s*FIXME:/i.test(line)) {
            issues.push({
                file: filePath,
                line: lineNumber,
                type: 'warning',
                category: 'FIXME',
                message: `FIXME: ${line.trim()}`
            });
        }
        
        // Check 5: any type usage (TypeScript)
        if (/:\s*any\b/.test(line) && !line.includes('// @ts-ignore')) {
            issues.push({
                file: filePath,
                line: lineNumber,
                type: 'warning',
                category: 'TypeScript',
                message: 'استخدام type "any" - حاول تحديد النوع بدقة'
            });
        }
        
        // Check 6: Long lines (> 120 characters)
        if (line.length > 120 && !line.trim().startsWith('//')) {
            issues.push({
                file: filePath,
                line: lineNumber,
                type: 'info',
                category: 'Formatting',
                message: `سطر طويل (${line.length} حرف) - يُفضل تقسيمه`
            });
        }
        
        // Check 7: Multiple useState in one component (potential optimization)
        const useStateMatches = content.match(/useState/g);
        if (useStateMatches && useStateMatches.length > 10 && lineNumber === 1) {
            issues.push({
                file: filePath,
                line: lineNumber,
                type: 'warning',
                category: 'Performance',
                message: `عدد كبير من useState (${useStateMatches.length}) - فكر في استخدام Zustand`
            });
        }
        
        // Check 8: Unused imports (basic check)
        const importMatch = line.match(/import\s+{([^}]+)}\s+from/);
        if (importMatch) {
            const imports = importMatch[1].split(',').map(i => i.trim());
            imports.forEach(imp => {
                if (!content.includes(imp.replace(/\s+as\s+\w+/, ''))) {
                    issues.push({
                        file: filePath,
                        line: lineNumber,
                        type: 'info',
                        category: 'Imports',
                        message: `استيراد غير مستخدم محتمل: ${imp}`
                    });
                }
            });
        }
        
        // Check 9: Old store path usage
        if (/from\s+['"]@\/app\/store\//.test(line)) {
            issues.push({
                file: filePath,
                line: lineNumber,
                type: 'error',
                category: 'Architecture',
                message: 'استخدام المسار القديم @/app/store/ - استخدم @/app/stores/ بدلاً منه'
            });
        }
    });
}

/**
 * Generate report
 */
function generateReport() {
    console.log('\n' + '═'.repeat(80));
    console.log('🔍 تقرير فحص جودة الكود - Code Quality Report');
    console.log('═'.repeat(80) + '\n');
    
    console.log(`📊 الإحصائيات العامة:`);
    console.log(`   • ملفات تم فحصها: ${filesScanned}`);
    console.log(`   • إجمالي الأسطر: ${totalLines.toLocaleString()}`);
    console.log(`   • مشاكل تم اكتشافها: ${issues.length}\n`);
    
    // Group by category
    const byCategory: Record<string, QualityIssue[]> = {};
    issues.forEach(issue => {
        if (!byCategory[issue.category]) {
            byCategory[issue.category] = [];
        }
        byCategory[issue.category].push(issue);
    });
    
    // Group by type
    const errors = issues.filter(i => i.type === 'error');
    const warnings = issues.filter(i => i.type === 'warning');
    const infos = issues.filter(i => i.type === 'info');
    
    console.log(`🔴 أخطاء: ${errors.length}`);
    console.log(`🟡 تحذيرات: ${warnings.length}`);
    console.log(`🔵 معلومات: ${infos.length}\n`);
    
    // Show top issues by category
    console.log('📋 المشاكل حسب الفئة:\n');
    Object.entries(byCategory).forEach(([category, categoryIssues]) => {
        console.log(`   ${category}: ${categoryIssues.length} مشكلة`);
    });
    
    console.log('\n' + '─'.repeat(80) + '\n');
    
    // Show critical errors first
    if (errors.length > 0) {
        console.log('🔴 أخطاء حرجة:\n');
        errors.slice(0, 10).forEach(issue => {
            console.log(`   ${issue.file}:${issue.line}`);
            console.log(`   → ${issue.message}\n`);
        });
        if (errors.length > 10) {
            console.log(`   ... و ${errors.length - 10} خطأ آخر\n`);
        }
    }
    
    // Show some warnings
    if (warnings.length > 0) {
        console.log('🟡 تحذيرات مهمة:\n');
        warnings.slice(0, 5).forEach(issue => {
            console.log(`   ${issue.file}:${issue.line}`);
            console.log(`   → ${issue.message}\n`);
        });
        if (warnings.length > 5) {
            console.log(`   ... و ${warnings.length - 5} تحذير آخر\n`);
        }
    }
    
    // معلومات التنسيق (أسطر طويلة) كثيرة جداً — لا تُصفّر الدرجة بالكامل
    const infoPenalty = Math.min(30, infos.length * 0.15);
    const qualityScore = Math.max(
        0,
        100 - errors.length * 5 - warnings.length * 2 - infoPenalty
    );
    
    console.log('═'.repeat(80));
    console.log(`\n🎯 درجة الجودة: ${qualityScore.toFixed(1)}/100\n`);
    
    if (qualityScore >= 95) {
        console.log('✅ ممتاز! الكود في حالة ممتازة\n');
    } else if (qualityScore >= 85) {
        console.log('🟢 جيد جداً! بعض التحسينات الطفيفة ممكنة\n');
    } else if (qualityScore >= 70) {
        console.log('🟡 جيد. يحتاج بعض التحسينات\n');
    } else {
        console.log('🔴 يحتاج تحسينات كبيرة\n');
    }
    
    // Save detailed report to file
    const detailedReport = {
        timestamp: new Date().toISOString(),
        stats: {
            filesScanned,
            totalLines,
            issuesFound: issues.length,
            errors: errors.length,
            warnings: warnings.length,
            infos: infos.length,
        },
        qualityScore,
        issues,
        byCategory,
    };
    
    fs.writeFileSync(
        'code-quality-report.json',
        JSON.stringify(detailedReport, null, 2)
    );
    
    console.log('📄 تم حفظ التقرير المفصل في: code-quality-report.json\n');
}

// Run the checker
console.log('🚀 بدء فحص جودة الكود...\n');
scanDirectory('./src');
generateReport();
