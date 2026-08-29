/**
 * مفاتيح التخزين المحلي التي تُشفَّر عند الراحة (at rest).
 * استثناء: hami:criminal:* — حجم ضخم؛ يُخزَّن مشفراً على مستوى shard لاحقاً أو plaintext للأداء.
 * استثناء التنفيذ/المعاملات اليومي: plaintext محلي — الشبكة وWIFE فقط عند مزامنة العمل
 * (`isLawyerWorkCloudLive` → kv-proxy). تشفير حمولة إضبارة الدعاوى/التنفيذ عند السحابة
 * يبقى في SupabaseService منفصلاً.
 */

/** لا تُشفَّر — حجم أو أداء أو سياسة offline-first للتنفيذ/المعاملات */
export const NEVER_ENCRYPT_KEYS = new Set<string>([
    'hami:criminal:store',
    '__hami_secure_store_keys__',
    'hami_cache_version',
    /** صورة خلفية كبيرة — plaintext لقراءة sync فورية وعرض CSS */
    'lawyer_wallpaper',
    /** فهرس التنفيذ — plaintext محلي؛ السحابة تُشفَّر في encrypted_data */
    'executionFiles',
    'lawyer_execution_files',
    'lawyer-execution-files',
    'hami:execution-dashboard',
    'execution-dashboard-storage',
    'hami:execution:dossier-tombstones:v1',
    /** سجل المعاملات — plaintext محلي؛ KV خلف مزامنة العمل فقط */
    'hami:transactions:v1',
]);

export const ENCRYPTED_EXACT_KEYS = new Set<string>([
    'lawyer_settings',
    'lawyer_files',
    'lawyer_files_active',
    'lawyer_files_archived',
    'lawyer_files_trash',
    'lawyer_files_index',
    'lawyer_notes',
    'legal-cases-storage',
    'hami:workspace:pins:v1',
    'hami:case-shares:v1',
    'hami:lawsuit:dossier-tombstones:v1',
    /*
     * فهرس المخزن الذكي. كان مستثنى من التشفير بمسوّغ «metadata خفيف؛ blobs في IDB
     * منفصل» — والمسوّغ يخطئ في تقدير ما هو السرّ. المحتوى مشفَّر ومفصول نعم، لكن
     * الفهرس يحمل أسماء المستندات وتصنيفاتها وارتباطها بالإضابير، و«شكوى جناية —
     * المتهم فلان» يكشف علاقة موكّل بقضية دون فتح ملف واحد. الاسم في تطبيق محاماة
     * سرٌّ بذاته لا عنوانٌ للسرّ.
     *
     * القراءة المتزامنة لم تُفقَد: المفتاح في `BOOT_SHELL_WARM_KEYS`، فيُفكّ مرّة
     * في تسخين ما بعد أوّل إطار ويسكن `decryptedCache` — و`getItemSync` تقرأ منها.
     * وشاشة المخزن محمَّلة تحميلاً متأخّراً، فلا تُفتح قبل انتهاء التسخين عملياً.
     * وإن قُرئ الفهرس فارغاً في تلك النافذة، فحارس المسح يرفض كتابة `[]` فوقه.
     */
    'hami:smartvault:docs:v1',
    /*
     * تقويم / منتدى / مستودع — كانت محميّة من المسح فقط. المرآة في localStorage
     * بقيت نصاً صريحاً (عناوين جلسات، منشورات، أسماء مستندات) فالتشفير في IDB
     * دون محو المرآة زينة. تُشفَّر هنا؛ القراءة ترحّل المرآة ثم تمحوها
     * (`readSecureOrDrainLegacySync`).
     *
     * القراءة المتزامنة: التقويم في `BOOT_SHELL_WARM_KEYS` (رادار الرئيسية).
     * المنتدى والمستودع في `PROTECTED_WARM_KEYS` — يُفتحان بعد الإقلاع.
     */
    'hami:calendar:events:v1',
    'hami:community:posts:v1',
    'hami:repository:docs:v1',
    'hami:calendar:tombstones:v1',
    'hami:community:deleted-ids:v1',
    'hami:smartvault:deleted:v1',
    'hami:repository:deleted:v1',
    'hami:lawyer-notes:deleted:v1',
    'hami:forum:groups:v1',
    'hami:forum:group-members:v1',
    'hami:forum:follow:prefs:v1',
    'hami:forum:post-sub:v1',
    'hami:forum:repo-reports:v1',
    'hami_task_help_requests_v1',
    'hami_lawsuit_write_journal_v1',
    'hami_lawsuit_pending_creates_v1',
    'hami_quantum_legal_tasks_v1',
    'hami:auth:lawyer-verification:v1',
    'hami:manual-classification-templates',
    'hami:session-judge-decision-templates',
    'hami-calendar-reminder-snooze-v1',
    'hami-calendar-reminder-fired-v1',
]);

export const ENCRYPTED_KEY_PREFIXES = [
    'auth_',
    'token_',
    'session_',
    'wife_',
    'hami:sovereign-quick-note-draft:',
    'hami:device',
    'hami:csrf',
    'hami_notes_sync_map_',
    'client_',
    'lawsuit_',
    /*
     * إشعارات المحامي حسب المستخدم. العنوان والرسالة وحمولة الفعل يحملون أسماء
     * موكّلين ومعرّفات قضايا — «ردّ جديد على سؤالك» أو mention يكشف علاقة موكّل
     * بقضية دون فتح ملف واحد، بنفس منطق فهرس المخزن الذكي.
     */
    'hami:notifications:v1:',
    /** استعلامات البحث الأخيرة — عناوين قضايا وموكّلين */
    'lawyer_recent_searches',
    /*
     * ملف المحامي المحلي (hami:profile:v1:<userId>) — الاسم والهاتف والصورة.
     * القراءة المتزامنة بعد التسخين: `warmBootLawyerProfile` يفكّ المفتاح قبل Frame-1.
     */
    'hami:profile:v1:',
    /*
     * غرف المستودع وتصنيفات المخزن تحمل أسماء موكّلين وملفات.
     * كانت نصاً صريحاً رغم تشفير فهرس المستندات.
     */
    'hami:repository:rooms:',
    'hami:smartvault:custom-categories:v1',
    'hami:lawyerdb:',
    'hami:urgentActions:v1:',
    'hami:forum:muted-users:v1:',
    'hami:fast-track-request-type-templates',
    'hami:home-hub-radar-dismissed:v1:',
] as const;


/**
 * حد حجم التشفير الافتراضي (يمنع تجمّد PBKDF2/AES على ملفات ضخمة).
 * فوقه: معظم المفاتيح الحساسة تسقط إلى plaintext عبر `fallsBackToPlaintextBySize`.
 * استثناء: مفاتيح الدعاوى المُسخَّنة، ومفاتيح التسخين الحسّاسة
 * (`isWarmEncryptAlwaysKey`) تُشفَّر أو تفشل — لا نصّ صريح.
 * التنفيذ/المعاملات: plaintext محلي عبر `isExecutionLocalPlaintextKey` /
 * `isTransactionsLocalPlaintextKey` (السحابة منفصلة خلف بوابة المزامنة).
 */
export const ENCRYPT_MAX_BYTES = 512 * 1024;

/** shards القضايا الجنائية — تشفير فقط تحت هذا الحد */
export const CRIMINAL_SHARD_ENCRYPT_MAX_BYTES = 256 * 1024;

/**
 * مفاتيح دعاوى تُسخَّن في `PROTECTED_WARM_KEYS` / `DOSSIER_WARM_KEYS`
 * أو عند فتح مساحة الدعاوى (`warmLawsuitWorkspace` → archived/trash).
 * فوق `ENCRYPT_MAX_BYTES` يبقى التشفير آمناً نسبياً: بعد التسخين تقرأها
 * `getItemSync` من `decryptedCache`.
 */
const LAWSUIT_ENCRYPT_ALWAYS_KEYS = new Set<string>([
    'lawyer_files',
    'lawyer_files_active',
    'lawyer_files_index',
    'lawyer_files_archived',
    'lawyer_files_trash',
    'lawsuitFiles',
    'hami-lawsuit-files',
    'lawsuit_files',
]);

export function isNeverEncryptedKey(key: string): boolean {
    if (NEVER_ENCRYPT_KEYS.has(key)) return true;
    if (isExecutionLocalPlaintextKey(key)) return true;
    if (isTransactionsLocalPlaintextKey(key)) return true;
    return false;
}

/**
 * مسار التنفيذ اليومي — بلا تشفير محلي (فتح/حفظ/فهرس/أقمار).
 * التشفير يبقى فقط عند المزامنة السحابية (`SupabaseService.encryptJsonPayload`).
 * يقرأ `hami_enc_v2:` القديم مرة واحدة عند التسخين ثم يُعاد كتابته نصاً صريحاً.
 */
export function isExecutionLocalPlaintextKey(key: string): boolean {
    if (key === 'executionFiles' || key.startsWith('executionFiles:')) return true;
    if (key === 'lawyer_execution_files' || key === 'lawyer-execution-files') return true;
    if (key === 'hami:execution-dashboard' || key === 'execution-dashboard-storage') return true;
    if (key.startsWith('hami:execution:dossier-tombstones:v1')) return true;
    if (key.startsWith('hami_unified_funds_ledger_')) return true;
    if (key.startsWith('garnishment_') || key.startsWith('hami_garnishment_')) return true;
    if (key.startsWith('hami_party_badges_hidden_')) return true;
    if (key.startsWith('hami_eviction_grace_')) return true;
    if (key.startsWith('hami:employee_personal_unlock:')) return true;
    const base = key.replace(/:u:[^:]+$/, '');
    return base.startsWith('execution_');
}

/**
 * مسار المعاملات اليومي — بلا تشفير محلي ولا WIFE.
 * الشبكة فقط عند `isLawyerWorkCloudLive` عبر `lawyerCloudKv` (transactions: / threading).
 * ciphertext قديم `hami_enc_v2:` يُرحَّل إلى plaintext عند التسخين.
 */
export function isTransactionsLocalPlaintextKey(key: string): boolean {
    if (key === 'hami:transactions:v1') return true;
    if (key.startsWith('hami:transactions:')) return true;
    if (key.startsWith('hami:transactionsThreading:v1:')) return true;
    return false;
}

export function isCriminalShardKey(key: string): boolean {
    if (key === 'hami:criminal:store') return false;
    return key.startsWith('hami:criminal:');
}

/** بلوبات/مقاطع دعاوى قانونية — `lawyer_files*` أو سابقة `lawsuit_` */
export function isLawsuitLegalStorageKey(key: string): boolean {
    if (LAWSUIT_ENCRYPT_ALWAYS_KEYS.has(key)) return true;
    if (key.includes('lawyer_files')) return true;
    return key.startsWith('lawsuit_');
}

/**
 * تشفير فوق حدّ الحجم — لا plaintext fallback.
 * يشمل المفاتيح المُسخَّنة عند الإقلاع + archived/trash بعد تسخين مساحة الدعاوى.
 */
export function isLawsuitEncryptAlwaysKey(key: string): boolean {
    return LAWSUIT_ENCRYPT_ALWAYS_KEYS.has(key);
}

/**
 * @deprecated كان يفرض تشفير بلوبات التنفيذ فوق حد الحجم.
 * السياسة الحالية: plaintext محلي (`isExecutionLocalPlaintextKey`) —
 * الدالة تبقى للتوافق مع اختبارات الاستيراد وتُرجع دائماً false.
 */
export function isExecutionEncryptAlwaysKey(_key: string): boolean {
    return false;
}

/**
 * مفاتيح حسّاسة تُسخَّن في `BOOT_SHELL_WARM_KEYS` / `PROTECTED_WARM_KEYS`.
 * بعد التسخين تقرأها `getItemSync` من `decryptedCache` — نفس مسوّغ الدعاوى.
 * بلا هذا الاستثناء تعود أكبر القوائم (جلسات، منشورات، أسماء مستندات) نصاً صريحاً
 * فوق 512KB، وهو أثقل ما في الجهاز وأغناه بالأسماء.
 *
 * لا يشمل: المونولث الجنائي (`NEVER_ENCRYPT` — لم يعد يُكتب؛ البقايا تُرحَّل
 * إلى شظايا بعد القراءة دون تشفير الملف الكامل على مسار أول إطار).
 * الإشعارات وملف المحامي: تُسخَّن/تُقرأ async أو قبل الإطار؛ فوق الحدّ تُشفَّر
 * لا تُترك نصاً صريحاً (ملف المحامي يُسخَّن في `warmBootLawyerProfile`).
 * المعاملات: plaintext محلي (`isTransactionsLocalPlaintextKey`) — تُسخَّن عند فتح القسم.
 */
const WARM_ENCRYPT_ALWAYS_EXACT_KEYS = new Set<string>([
    'lawyer_notes',
    'lawyer_settings',
    'hami:community:posts:v1',
    'hami:smartvault:docs:v1',
    'hami:repository:docs:v1',
    'hami:calendar:events:v1',
    'hami:lawsuit:dossier-tombstones:v1',
    'hami:calendar:tombstones:v1',
    'hami:community:deleted-ids:v1',
    'hami:smartvault:deleted:v1',
    'hami:repository:deleted:v1',
    'hami:lawyer-notes:deleted:v1',
    'hami:forum:groups:v1',
    'hami:forum:group-members:v1',
    'hami:forum:follow:prefs:v1',
    'hami:forum:post-sub:v1',
    'hami:forum:repo-reports:v1',
    'hami_task_help_requests_v1',
    'hami_lawsuit_write_journal_v1',
    'hami_lawsuit_pending_creates_v1',
    'hami_quantum_legal_tasks_v1',
    'hami:auth:lawyer-verification:v1',
    'hami:manual-classification-templates',
    'hami:session-judge-decision-templates',
    'hami-calendar-reminder-snooze-v1',
    'hami-calendar-reminder-fired-v1',
    'legal-cases-storage',
    'hami:workspace:pins:v1',
]);

export function isWarmEncryptAlwaysKey(key: string): boolean {
    if (isTransactionsLocalPlaintextKey(key)) return false;
    if (WARM_ENCRYPT_ALWAYS_EXACT_KEYS.has(key)) return true;
    if (key.startsWith('hami:profile:v1:')) return true;
    if (key.startsWith('hami:notifications:v1:')) return true;
    if (key.startsWith('hami:lawyerdb:')) return true;
    if (key.startsWith('hami:urgentActions:v1:')) return true;
    if (key.startsWith('hami:forum:muted-users:v1:')) return true;
    if (key.startsWith('hami:repository:rooms:')) return true;
    if (key.startsWith('hami:smartvault:custom-categories:v1')) return true;
    if (key.startsWith('hami:fast-track-request-type-templates')) return true;
    if (key.startsWith('hami:home-hub-radar-dismissed:v1:')) return true;
    return false;
}

export function isSensitiveStorageKey(key: string): boolean {
    if (isNeverEncryptedKey(key)) return false;
    if (isCriminalShardKey(key)) return true;
    if (ENCRYPTED_EXACT_KEYS.has(key)) return true;
    return ENCRYPTED_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function encryptionSizeLimitFor(key: string): number {
    return isCriminalShardKey(key) ? CRIMINAL_SHARD_ENCRYPT_MAX_BYTES : ENCRYPT_MAX_BYTES;
}

/**
 * مفتاح حسّاس تجاوزت حمولته الحدّ فتُخزَّن **نصّاً صريحاً**.
 *
 * هذا هو الفرع الذي يُسقط التشفير عن أكبر الحمولات — أي عن الإضابير الأثقل، وهي
 * غالباً الأغنى بأسماء الموكّلين وأرقامهم الوطنية.
 *
 * **استثناء الدعاوى المُسخَّنة:** `lawyer_files` / `_active` / `_index` /
 * `_archived` / `_trash` (+ legacy) لا تسقط إلى plaintext — تُشفَّر حتى فوق الحدّ
 * (encrypt-or-fail عبر CryptoService). archived/trash تُسخَّن عند فتح مساحة
 * الدعاوى عبر `warmLawsuitWorkspace` حتى تبقى `getItemSync` صالحة بعد الفتح.
 *
 * بلوبات التنفيذ والمعاملات: plaintext محلي — لا تشفير فوق الحدّ.
 * مفاتيح التسخين الحسّاسة (`isWarmEncryptAlwaysKey`) — لا مرآة صريحة فوق الحدّ.
 * شظايا القضايا الجنائية: تشفير أو فشل (التجزئة تُبقي كل جزء تحت حدّ التشفير).
 */
export function fallsBackToPlaintextBySize(key: string, value: string): boolean {
    if (!isSensitiveStorageKey(key)) return false;
    if (isLawsuitEncryptAlwaysKey(key)) return false;
    if (isExecutionEncryptAlwaysKey(key)) return false;
    if (isWarmEncryptAlwaysKey(key)) return false;
    if (isCriminalShardKey(key)) return false;
    return value.length > encryptionSizeLimitFor(key);
}

export function shouldEncryptValue(key: string, value: string): boolean {
    if (!isSensitiveStorageKey(key)) return false;
    return !fallsBackToPlaintextBySize(key, value);
}
