/**
 * T21 Architectural Boundaries — DEDICATED ESLint flat config
 * لا يحمل أي قواعد lint سوى قواعد طبقات الواجهة المعمارية الثلاث
 * يُستخدم حصرياً من قبل guard-architecture-boundaries.mjs
 * حتى لا يتداخل مع guard:lint العادي الذي يتحمل baseline 177 مستقل.
 *
 * القواعد مطابقة لـ tasks.md T21 verbatim:
 *   (أ) api        ↚  components/hooks/runtime/bootstrap
 *   (ب) services   ↚  components/hooks/runtime/bootstrap
 *   (ج) domain+app ↚  components/services/runtime
 *
 * Note: TypeScript parser مطلوب للملفات .ts/.tsx؛ بدونها تمر parse error
 * ولا تطبّق قواعد no-restricted-imports نهائيًا (سبب فشل TR-21.2 الأولي).
 */
const tsParser = require('@typescript-eslint/parser');

const sharedGlobals = {
    window: 'readonly',
    document: 'readonly',
    navigator: 'readonly',
    localStorage: 'readonly',
    sessionStorage: 'readonly',
    fetch: 'readonly',
    File: 'readonly',
    Blob: 'readonly',
    FormData: 'readonly',
    URL: 'readonly',
    URLSearchParams: 'readonly',
    CustomEvent: 'readonly',
    HTMLElement: 'readonly',
    HTMLInputElement: 'readonly',
    HTMLTextAreaElement: 'readonly',
    HTMLButtonElement: 'readonly',
    KeyboardEvent: 'readonly',
    MouseEvent: 'readonly',
    DragEvent: 'readonly',
    requestAnimationFrame: 'readonly',
    cancelAnimationFrame: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
    setInterval: 'readonly',
    clearInterval: 'readonly',
    performance: 'readonly',
    console: 'readonly',
    process: 'readonly',
    module: 'readonly',
    require: 'readonly',
    __dirname: 'readonly',
};

module.exports = [
    {
        ignores: [
            'dist/**',
            'node_modules/**',
            '.next/**',
            'coverage/**',
            'api/handler.js',
        ],
    },
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaFeatures: { jsx: true },
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
            globals: sharedGlobals,
        },
    },
    {
        files: ['**/*.{js,jsx,mjs,cjs}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: sharedGlobals,
        },
    },
    {
        files: ['src/app/api/**/*.{ts,tsx,js,jsx,mjs,cjs}'],
        rules: {
            'no-restricted-imports': ['error', {
                patterns: [
                    {
                        group: ['**/components/**', '**/hooks/**', '**/runtime/**', '**/bootstrap/**'],
                        message: 'T21[api]: src/app/api/** يحظر استيراد components/hooks/runtime/bootstrap (الحافة المنخفضة تعود إلى مستوى أدنى فقط)',
                    },
                ],
            }],
        },
    },
    {
        files: ['src/app/services/**/*.{ts,tsx,js,jsx,mjs,cjs}'],
        rules: {
            'no-restricted-imports': ['error', {
                patterns: [
                    {
                        group: ['**/components/**', '**/hooks/**', '**/runtime/**', '**/bootstrap/**'],
                        message: 'T21[services]: src/app/services/** يحظر استيراد components/hooks/runtime/bootstrap (خدمات بلا حالة — لا تلمس واجهة المستخدم مباشرة)',
                    },
                ],
            }],
        },
    },
    {
        files: [
            'src/app/domain/**/*.{ts,tsx,js,jsx,mjs,cjs}',
            'src/app/application/**/*.{ts,tsx,js,jsx,mjs,cjs}',
        ],
        rules: {
            'no-restricted-imports': ['error', {
                patterns: [
                    {
                        group: ['**/components/**', '**/services/**', '**/runtime/**'],
                        message: 'T21[pure]: src/app/domain + application طبقات منطقية نقية — يحظر استيراد components/services/runtime (حقن الاعتماديات عند حافة الـ hooks فقط)',
                    },
                ],
            }],
        },
    },
];
