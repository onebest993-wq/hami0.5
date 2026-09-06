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
 */
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
