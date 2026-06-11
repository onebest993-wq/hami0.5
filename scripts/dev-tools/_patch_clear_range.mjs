import fs from 'fs';

const p = 'src/app/components/admin/AdminLawEntry.tsx';
let s = fs.readFileSync(p, 'utf8');

s = s.replace(
    /const CRIMINAL_LAW_TAB_LABELS: Record<CriminalLawTab, string> = \{[\s\S]*?\};/,
    `const CRIMINAL_LAW_TAB_LABELS: Record<CriminalLawTab, string> = {
    penal: "قانون العقوبات",
    procedure: "أصول المحاكمات الجزائية",
    juvenile: "قانون رعاية الأحداث",
};`,
);

s = s.replace(
    /    penal: \"[^\"]+\",\n    procedure: \"[^\"]+\",\n    juvenile: \"[^\"]+\",\n\};\nfunction refreshLegalCodesReaderCache/,
    '    penal: IRAQI_LAW_CANONICAL_NAMES.penal,\n    procedure: IRAQI_LAW_CANONICAL_NAMES.procedure,\n    juvenile: IRAQI_LAW_CANONICAL_NAMES.juvenile,\n};\nfunction refreshLegalCodesReaderCache',
);

if (!s.includes('clearArticleFrom')) {
    s = s.replace(
        '    const [clearLoading, setClearLoading] = useState(false);',
        '    const [clearLoading, setClearLoading] = useState(false);\n    const [clearArticleFrom, setClearArticleFrom] = useState("");\n    const [clearArticleTo, setClearArticleTo] = useState("");',
    );
}

fs.writeFileSync(p, s);
console.log('patched');
