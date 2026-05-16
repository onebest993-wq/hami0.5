/**
 * 🔍 Smart File Analyzer
 * @description نظام ذكي لقراءة وتحليل الملفات الضخمة تلقائياً
 * 
 * @features
 * - قراءة الملفات الضخمة (+15,000 سطر) بأجزاء
 * - تحليل تلقائي للبنية (imports, exports, functions, components)
 * - إنشاء خريطة كاملة للكود
 * - اكتشاف Dependencies تلقائياً
 * - توليد تقارير مفصلة
 * 
 * @usage
 * ```bash
 * npm run analyze:file -- path/to/large-file.tsx
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// 📊 Types & Interfaces
// ============================================

interface FileAnalysis {
    path: string;
    totalLines: number;
    size: string;
    chunks: ChunkInfo[];
    structure: CodeStructure;
    dependencies: Dependency[];
    complexity: ComplexityMetrics;
    suggestions: string[];
}

interface ChunkInfo {
    index: number;
    startLine: number;
    endLine: number;
    lines: number;
    content: string;
}

interface CodeStructure {
    imports: ImportStatement[];
    exports: ExportStatement[];
    functions: FunctionInfo[];
    components: ComponentInfo[];
    interfaces: InterfaceInfo[];
    constants: ConstantInfo[];
}

interface ImportStatement {
    line: number;
    source: string;
    imports: string[];
    type: 'default' | 'named' | 'namespace' | 'side-effect';
}

interface ExportStatement {
    line: number;
    name: string;
    type: 'function' | 'component' | 'const' | 'interface' | 'type';
}

interface FunctionInfo {
    name: string;
    line: number;
    params: string[];
    isAsync: boolean;
    complexity: number;
}

interface ComponentInfo {
    name: string;
    line: number;
    props: string[];
    hooks: string[];
    isMemoed: boolean;
    hasDisplayName: boolean;
}

interface InterfaceInfo {
    name: string;
    line: number;
    properties: string[];
}

interface ConstantInfo {
    name: string;
    line: number;
    type: string;
}

interface Dependency {
    name: string;
    type: 'internal' | 'external';
    usageCount: number;
}

interface ComplexityMetrics {
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
    linesOfCode: number;
    commentLines: number;
    blankLines: number;
    maintainabilityIndex: number;
}

// ============================================
// 🔧 Core Analyzer Class
// ============================================

export class SmartFileAnalyzer {
    private readonly CHUNK_SIZE = 500; // أسطر لكل جزء
    private readonly MAX_FILE_SIZE = 1024 * 1024 * 5; // 5MB

    /**
     * تحليل ملف ضخم بالكامل
     * @param filePath - مسار الملف
     * @returns تحليل شامل للملف
     */
    async analyzeFile(filePath: string): Promise<FileAnalysis> {
        console.log(`🔍 تحليل الملف: ${filePath}`);

        // 1. قراءة الملف
        const content = await this.readFile(filePath);
        const lines = content.split('\n');

        console.log(`📊 عدد الأسطر: ${lines.length}`);

        // 2. تقسيم إلى أجزاء
        const chunks = this.splitIntoChunks(lines);
        console.log(`📦 عدد الأجزاء: ${chunks.length}`);

        // 3. تحليل البنية
        console.log(`🏗️ تحليل البنية...`);
        const structure = await this.analyzeStructure(content, lines);

        // 4. تحليل الـ Dependencies
        console.log(`🔗 تحليل الـ Dependencies...`);
        const dependencies = this.analyzeDependencies(structure.imports);

        // 5. حساب التعقيد
        console.log(`📈 حساب التعقيد...`);
        const complexity = this.calculateComplexity(content, lines);

        // 6. اقتراحات التحسين
        console.log(`💡 توليد الاقتراحات...`);
        const suggestions = this.generateSuggestions(structure, complexity, lines.length);

        return {
            path: filePath,
            totalLines: lines.length,
            size: this.formatFileSize(content.length),
            chunks,
            structure,
            dependencies,
            complexity,
            suggestions
        };
    }

    /**
     * قراءة الملف مع التحقق من الحجم
     */
    private async readFile(filePath: string): Promise<string> {
        const stats = fs.statSync(filePath);
        
        if (stats.size > this.MAX_FILE_SIZE) {
            throw new Error(`❌ الملف كبير جداً (${this.formatFileSize(stats.size)}). الحد الأقصى: 5MB`);
        }

        return fs.readFileSync(filePath, 'utf-8');
    }

    /**
     * تقسيم الملف إلى أجزاء قابلة للإدارة
     */
    private splitIntoChunks(lines: string[]): ChunkInfo[] {
        const chunks: ChunkInfo[] = [];
        
        for (let i = 0; i < lines.length; i += this.CHUNK_SIZE) {
            const chunkLines = lines.slice(i, i + this.CHUNK_SIZE);
            chunks.push({
                index: chunks.length,
                startLine: i,
                endLine: Math.min(i + this.CHUNK_SIZE - 1, lines.length - 1),
                lines: chunkLines.length,
                content: chunkLines.join('\n')
            });
        }

        return chunks;
    }

    /**
     * تحليل البنية الكاملة للكود
     */
    private async analyzeStructure(content: string, lines: string[]): Promise<CodeStructure> {
        return {
            imports: this.extractImports(lines),
            exports: this.extractExports(lines),
            functions: this.extractFunctions(lines),
            components: this.extractComponents(lines),
            interfaces: this.extractInterfaces(lines),
            constants: this.extractConstants(lines)
        };
    }

    /**
     * استخراج جميع الـ imports
     */
    private extractImports(lines: string[]): ImportStatement[] {
        const imports: ImportStatement[] = [];
        const importRegex = /^import\s+(.+?)\s+from\s+['"](.+?)['"]/;

        lines.forEach((line, index) => {
            const match = line.match(importRegex);
            if (match) {
                const [, importPart, source] = match;
                
                let type: 'default' | 'named' | 'namespace' | 'side-effect' = 'named';
                let importNames: string[] = [];

                if (importPart.includes('{')) {
                    // Named imports
                    type = 'named';
                    const namedImports = importPart.match(/\{(.+?)\}/);
                    if (namedImports) {
                        importNames = namedImports[1].split(',').map(i => i.trim());
                    }
                } else if (importPart.includes('* as')) {
                    // Namespace import
                    type = 'namespace';
                    importNames = [importPart.trim()];
                } else {
                    // Default import
                    type = 'default';
                    importNames = [importPart.trim()];
                }

                imports.push({
                    line: index + 1,
                    source,
                    imports: importNames,
                    type
                });
            }
        });

        return imports;
    }

    /**
     * استخراج جميع الـ exports
     */
    private extractExports(lines: string[]): ExportStatement[] {
        const exports: ExportStatement[] = [];
        
        lines.forEach((line, index) => {
            if (line.includes('export')) {
                let type: ExportStatement['type'] = 'const';
                let name = '';

                if (line.includes('export const')) {
                    type = 'const';
                    const match = line.match(/export const (\w+)/);
                    name = match ? match[1] : '';
                } else if (line.includes('export function')) {
                    type = 'function';
                    const match = line.match(/export function (\w+)/);
                    name = match ? match[1] : '';
                } else if (line.includes('export interface')) {
                    type = 'interface';
                    const match = line.match(/export interface (\w+)/);
                    name = match ? match[1] : '';
                } else if (line.includes('React.FC') || line.includes('React.memo')) {
                    type = 'component';
                    const match = line.match(/export const (\w+)/);
                    name = match ? match[1] : '';
                }

                if (name) {
                    exports.push({
                        line: index + 1,
                        name,
                        type
                    });
                }
            }
        });

        return exports;
    }

    /**
     * استخراج جميع الدوال
     */
    private extractFunctions(lines: string[]): FunctionInfo[] {
        const functions: FunctionInfo[] = [];
        const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/;

        lines.forEach((line, index) => {
            const match = line.match(functionRegex);
            if (match) {
                const [, name, paramsStr] = match;
                const params = paramsStr.split(',').map(p => p.trim()).filter(p => p);
                const isAsync = line.includes('async');

                functions.push({
                    name,
                    line: index + 1,
                    params,
                    isAsync,
                    complexity: this.calculateFunctionComplexity(lines, index)
                });
            }
        });

        return functions;
    }

    /**
     * استخراج جميع المكونات React
     */
    private extractComponents(lines: string[]): ComponentInfo[] {
        const components: ComponentInfo[] = [];
        const componentRegex = /(?:export\s+)?const\s+(\w+):\s*React\.FC<(\w+)>/;

        lines.forEach((line, index) => {
            const match = line.match(componentRegex);
            if (match) {
                const [, name, propsType] = match;
                
                // البحث عن الـ hooks المستخدمة
                const componentCode = this.extractComponentCode(lines, index);
                const hooks = this.extractHooks(componentCode);
                
                // التحقق من React.memo
                const isMemoed = componentCode.includes('React.memo');
                
                // التحقق من displayName
                const hasDisplayName = lines.some((l, i) => 
                    i > index && l.includes(`${name}.displayName`)
                );

                components.push({
                    name,
                    line: index + 1,
                    props: [propsType],
                    hooks,
                    isMemoed,
                    hasDisplayName
                });
            }
        });

        return components;
    }

    /**
     * استخراج كود المكون الكامل
     */
    private extractComponentCode(lines: string[], startIndex: number): string {
        let braceCount = 0;
        let code = '';
        let started = false;

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            code += line + '\n';

            for (const char of line) {
                if (char === '{') {
                    braceCount++;
                    started = true;
                } else if (char === '}') {
                    braceCount--;
                }
            }

            if (started && braceCount === 0) {
                break;
            }
        }

        return code;
    }

    /**
     * استخراج الـ React hooks المستخدمة
     */
    private extractHooks(code: string): string[] {
        const hooks = new Set<string>();
        const hookRegex = /use[A-Z]\w+/g;
        const matches = code.match(hookRegex);

        if (matches) {
            matches.forEach(hook => hooks.add(hook));
        }

        return Array.from(hooks);
    }

    /**
     * استخراج جميع الـ Interfaces
     */
    private extractInterfaces(lines: string[]): InterfaceInfo[] {
        const interfaces: InterfaceInfo[] = [];
        
        lines.forEach((line, index) => {
            const match = line.match(/(?:export\s+)?interface\s+(\w+)/);
            if (match) {
                const name = match[1];
                const properties = this.extractInterfaceProperties(lines, index);
                
                interfaces.push({
                    name,
                    line: index + 1,
                    properties
                });
            }
        });

        return interfaces;
    }

    /**
     * استخراج خصائص الـ Interface
     */
    private extractInterfaceProperties(lines: string[], startIndex: number): string[] {
        const properties: string[] = [];
        let braceCount = 0;
        let started = false;

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.includes('{')) {
                braceCount++;
                started = true;
                continue;
            }

            if (started && line.includes('}')) {
                braceCount--;
                if (braceCount === 0) break;
            }

            if (started && braceCount > 0 && line && !line.startsWith('//')) {
                const propMatch = line.match(/(\w+)[\?:]?\s*:/);
                if (propMatch) {
                    properties.push(propMatch[1]);
                }
            }
        }

        return properties;
    }

    /**
     * استخراج جميع الثوابت
     */
    private extractConstants(lines: string[]): ConstantInfo[] {
        const constants: ConstantInfo[] = [];
        
        lines.forEach((line, index) => {
            const match = line.match(/const\s+(\w+):\s*(\w+(?:<[^>]+>)?)/);
            if (match && !line.includes('React.FC')) {
                constants.push({
                    name: match[1],
                    line: index + 1,
                    type: match[2]
                });
            }
        });

        return constants;
    }

    /**
     * تحليل الـ Dependencies
     */
    private analyzeDependencies(imports: ImportStatement[]): Dependency[] {
        const depMap = new Map<string, { type: 'internal' | 'external', count: number }>();

        imports.forEach(imp => {
            const type = imp.source.startsWith('.') || imp.source.startsWith('/') 
                ? 'internal' 
                : 'external';
            
            if (depMap.has(imp.source)) {
                depMap.get(imp.source)!.count++;
            } else {
                depMap.set(imp.source, { type, count: 1 });
            }
        });

        return Array.from(depMap.entries()).map(([name, info]) => ({
            name,
            type: info.type,
            usageCount: info.count
        }));
    }

    /**
     * حساب تعقيد الدالة
     */
    private calculateFunctionComplexity(lines: string[], startIndex: number): number {
        let complexity = 1;
        let braceCount = 0;
        let started = false;

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];

            if (line.includes('{')) {
                braceCount++;
                started = true;
            }
            if (line.includes('}')) {
                braceCount--;
            }

            if (started) {
                // زيادة التعقيد لكل decision point
                if (line.includes('if ') || line.includes('else if')) complexity++;
                if (line.includes('switch')) complexity++;
                if (line.includes('case ')) complexity++;
                if (line.includes('for ') || line.includes('while ')) complexity++;
                if (line.includes('&&') || line.includes('||')) complexity++;
                if (line.includes('?')) complexity++;
            }

            if (started && braceCount === 0) break;
        }

        return complexity;
    }

    /**
     * حساب مقاييس التعقيد الشاملة
     */
    private calculateComplexity(content: string, lines: string[]): ComplexityMetrics {
        let cyclomaticComplexity = 0;
        let commentLines = 0;
        let blankLines = 0;

        lines.forEach(line => {
            const trimmed = line.trim();
            
            // حساب التعقيد الحلقي
            if (trimmed.includes('if ') || trimmed.includes('else if')) cyclomaticComplexity++;
            if (trimmed.includes('case ')) cyclomaticComplexity++;
            if (trimmed.includes('for ') || trimmed.includes('while ')) cyclomaticComplexity++;
            if (trimmed.includes('&&') || trimmed.includes('||')) cyclomaticComplexity++;
            
            // حساب التعليقات
            if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
                commentLines++;
            }
            
            // حساب الأسطر الفارغة
            if (!trimmed) {
                blankLines++;
            }
        });

        const linesOfCode = lines.length - commentLines - blankLines;
        
        // حساب مؤشر القابلية للصيانة (Maintainability Index)
        // MI = 171 - 5.2 * ln(V) - 0.23 * G - 16.2 * ln(LOC)
        // V = Halstead Volume (نستخدم تقدير)
        // G = Cyclomatic Complexity
        const halsteadVolume = Math.log(linesOfCode) * 50; // تقدير مبسط
        const maintainabilityIndex = Math.max(0, 
            171 - 5.2 * Math.log(halsteadVolume) - 0.23 * cyclomaticComplexity - 16.2 * Math.log(linesOfCode)
        );

        return {
            cyclomaticComplexity,
            cognitiveComplexity: cyclomaticComplexity * 1.5, // تقدير
            linesOfCode,
            commentLines,
            blankLines,
            maintainabilityIndex: Math.round(maintainabilityIndex)
        };
    }

    /**
     * توليد اقتراحات التحسين
     */
    private generateSuggestions(
        structure: CodeStructure, 
        complexity: ComplexityMetrics,
        totalLines: number
    ): string[] {
        const suggestions: string[] = [];

        // تحقق من حجم الملف
        if (totalLines > 1000) {
            suggestions.push(`⚠️ الملف كبير جداً (${totalLines} سطر). يُنصح بتقسيمه إلى ملفات أصغر (<500 سطر لكل ملف).`);
        }

        // تحقق من التعقيد
        if (complexity.cyclomaticComplexity > 50) {
            suggestions.push(`🔴 التعقيد الحلقي مرتفع جداً (${complexity.cyclomaticComplexity}). يُنصح بتبسيط المنطق وتقسيم الدوال المعقدة.`);
        } else if (complexity.cyclomaticComplexity > 20) {
            suggestions.push(`🟡 التعقيد الحلقي متوسط (${complexity.cyclomaticComplexity}). يمكن تحسينه.`);
        }

        // تحقق من القابلية للصيانة
        if (complexity.maintainabilityIndex < 20) {
            suggestions.push(`🔴 مؤشر القابلية للصيانة منخفض جداً (${complexity.maintainabilityIndex}/100). الكود صعب الصيانة!`);
        } else if (complexity.maintainabilityIndex < 40) {
            suggestions.push(`🟡 مؤشر القابلية للصيانة متوسط (${complexity.maintainabilityIndex}/100). يحتاج تحسين.`);
        }

        // تحقق من المكونات غير المُحسّنة
        const unmemoedComponents = structure.components.filter(c => !c.isMemoed);
        if (unmemoedComponents.length > 0) {
            suggestions.push(`💡 ${unmemoedComponents.length} مكونات بدون React.memo: ${unmemoedComponents.map(c => c.name).join(', ')}`);
        }

        // تحقق من المكونات بدون displayName
        const noDisplayName = structure.components.filter(c => !c.hasDisplayName);
        if (noDisplayName.length > 0) {
            suggestions.push(`💡 ${noDisplayName.length} مكونات بدون displayName: ${noDisplayName.map(c => c.name).join(', ')}`);
        }

        // تحقق من الدوال المعقدة
        const complexFunctions = structure.functions.filter(f => f.complexity > 10);
        if (complexFunctions.length > 0) {
            suggestions.push(`⚠️ ${complexFunctions.length} دوال معقدة جداً (complexity > 10): ${complexFunctions.map(f => `${f.name}(${f.complexity})`).join(', ')}`);
        }

        // تحقق من نسبة التعليقات
        const commentRatio = (complexity.commentLines / complexity.linesOfCode) * 100;
        if (commentRatio < 5) {
            suggestions.push(`📝 نسبة التعليقات منخفضة جداً (${commentRatio.toFixed(1)}%). يُنصح بإضافة توثيق JSDoc.`);
        }

        if (suggestions.length === 0) {
            suggestions.push('✅ الملف في حالة ممتازة! لا توجد اقتراحات للتحسين.');
        }

        return suggestions;
    }

    /**
     * تنسيق حجم الملف
     */
    private formatFileSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    /**
     * طباعة التقرير الكامل
     */
    printReport(analysis: FileAnalysis): void {
        console.log('\n' + '='.repeat(80));
        console.log('📊 SMART FILE ANALYSIS REPORT');
        console.log('='.repeat(80));
        
        // معلومات عامة
        console.log(`\n📁 الملف: ${analysis.path}`);
        console.log(`📏 الحجم: ${analysis.size}`);
        console.log(`📊 الأسطر: ${analysis.totalLines.toLocaleString()}`);
        console.log(`📦 الأجزاء: ${analysis.chunks.length}`);

        // البنية
        console.log(`\n🏗️ البنية:`);
        console.log(`   ├─ Imports: ${analysis.structure.imports.length}`);
        console.log(`   ├─ Exports: ${analysis.structure.exports.length}`);
        console.log(`   ├─ Functions: ${analysis.structure.functions.length}`);
        console.log(`   ├─ Components: ${analysis.structure.components.length}`);
        console.log(`   ├─ Interfaces: ${analysis.structure.interfaces.length}`);
        console.log(`   └─ Constants: ${analysis.structure.constants.length}`);

        // Dependencies
        console.log(`\n🔗 Dependencies:`);
        console.log(`   ├─ External: ${analysis.dependencies.filter(d => d.type === 'external').length}`);
        console.log(`   └─ Internal: ${analysis.dependencies.filter(d => d.type === 'internal').length}`);

        // التعقيد
        console.log(`\n📈 مقاييس التعقيد:`);
        console.log(`   ├─ Cyclomatic: ${analysis.complexity.cyclomaticComplexity}`);
        console.log(`   ├─ Cognitive: ${Math.round(analysis.complexity.cognitiveComplexity)}`);
        console.log(`   ├─ Lines of Code: ${analysis.complexity.linesOfCode.toLocaleString()}`);
        console.log(`   ├─ Comment Lines: ${analysis.complexity.commentLines}`);
        console.log(`   ├─ Blank Lines: ${analysis.complexity.blankLines}`);
        console.log(`   └─ Maintainability: ${analysis.complexity.maintainabilityIndex}/100`);

        // الاقتراحات
        console.log(`\n💡 اقتراحات التحسين:`);
        analysis.suggestions.forEach((s, i) => {
            console.log(`   ${i + 1}. ${s}`);
        });

        console.log('\n' + '='.repeat(80) + '\n');
    }

    /**
     * حفظ التقرير في ملف JSON
     */
    async saveReport(analysis: FileAnalysis, outputPath: string): Promise<void> {
        const reportData = {
            ...analysis,
            generatedAt: new Date().toISOString(),
            version: '1.0.0'
        };

        fs.writeFileSync(outputPath, JSON.stringify(reportData, null, 2));
        console.log(`✅ تم حفظ التقرير في: ${outputPath}`);
    }
}

// ============================================
// 🚀 CLI Interface
// ============================================

export async function analyzeLargeFile(filePath: string): Promise<FileAnalysis> {
    const analyzer = new SmartFileAnalyzer();
    const analysis = await analyzer.analyzeFile(filePath);
    analyzer.printReport(analysis);
    
    // حفظ التقرير
    const reportPath = filePath.replace(/\.(tsx?|jsx?)$/, '.analysis.json');
    await analyzer.saveReport(analysis, reportPath);
    
    return analysis;
}

// استخدام مباشر
if (require.main === module) {
    const filePath = process.argv[2];
    
    if (!filePath) {
        console.error('❌ الاستخدام: ts-node file-analyzer.ts <path-to-file>');
        process.exit(1);
    }

    analyzeLargeFile(filePath).catch(console.error);
}
