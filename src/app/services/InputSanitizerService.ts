/**
 * Input Sanitizer Service
 * حماية من XSS و SQL Injection والهجمات الأخرى
 * @version 1.0.0
 */

class InputSanitizerService {
  private static readonly MAX_SANITIZE_DEPTH = 50;
  private static readonly MAX_COLLECTION_ITEMS = 1000;

  /**
   * تنظيف HTML من السكريبتات الضارة
   * يستخدم DOMParser المدمج في المتصفح لتحليل HTML وإزالة العناصر الخطرة فقط
   */
  sanitizeHTML(input: string): string {
    if (!input) return '';

    const allowedTags = new Set([
      'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'span', 'div',
      'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'pre', 'code', 'hr', 'sub', 'sup',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ]);
    const allowedAttrs = new Set(['href', 'target', 'rel', 'class', 'dir']);

    const parser = new DOMParser();
    const doc = parser.parseFromString(`<body>${input}</body>`, 'text/html');
    const body = doc.body;

    const clean = (node: Node): Node | null => {
      if (node.nodeType === Node.TEXT_NODE) {
        return document.createTextNode(node.textContent ?? '');
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return null;
      }

      const el = node as Element;
      const tag = el.tagName.toLowerCase();

      if (!allowedTags.has(tag)) {
        return document.createTextNode(el.textContent ?? '');
      }

      const newEl = document.createElement(tag);

      for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i];
        const attrName = attr.name.toLowerCase();
        if (!allowedAttrs.has(attrName)) continue;

        if (attrName === 'href' || attrName === 'src') {
          const val = attr.value.toLowerCase();
          if (val.startsWith('javascript:') || val.startsWith('vbscript:') || val.startsWith('data:')) continue;
        }

        newEl.setAttribute(attr.name, attr.value);
      }

      for (let i = 0; i < el.childNodes.length; i++) {
        const cleaned = clean(el.childNodes[i]);
        if (cleaned) newEl.appendChild(cleaned);
      }

      return newEl;
    };

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < body.childNodes.length; i++) {
      const cleaned = clean(body.childNodes[i]);
      if (cleaned) fragment.appendChild(cleaned);
    }

    const result = document.createElement('div');
    result.appendChild(fragment);
    return result.innerHTML;
  }

  /**
   * تنظيف SQL من الحقن
   */
  sanitizeSQL(input: string): string {
    if (!input) return '';

    // إزالة الأحرف الخطرة
    return input
      .replace(/['";]/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '')
      .replace(/xp_/gi, '')
      .replace(/sp_/gi, '');
  }

  /**
   * تنظيف مسارات الملفات
   */
  sanitizePath(input: string): string {
    if (!input) return '';

    // إزالة محاولات الخروج من المجلد
    return input
      .replace(/\.\./g, '')
      .replace(/\\/g, '/')
      .replace(/\/\//g, '/')
      .replace(/^\//, '');
  }

  /**
   * التحقق من البريد الإلكتروني
   */
  validateEmail(email: string): boolean {
    if (!email) return false;

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  /**
   * التحقق من رقم الهاتف العراقي
   */
  validateIraqiPhone(phone: string): boolean {
    if (!phone) return false;

    // أرقام عراقية: 07XX XXXXXXX
    const iraqiPhoneRegex = /^(07[3-9]\d{8}|7[3-9]\d{8})$/;
    return iraqiPhoneRegex.test(phone.replace(/\s+/g, ''));
  }

  /**
   * تنظيف النصوص العامة
   */
  sanitizeText(input: string, maxLength?: number): string {
    if (!input) return '';

    let sanitized = this.removeInvisibleChars(input).trim();

    // إزالة الأحرف الخطرة
    sanitized = sanitized.replace(/[<>]/g, '');

    // تحديد الطول
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  /**
   * التحقق من الأرقام
   */
  validateNumber(input: string | number, min?: number, max?: number): boolean {
    const num = typeof input === 'string' ? parseFloat(input) : input;

    if (isNaN(num)) return false;
    if (min !== undefined && num < min) return false;
    if (max !== undefined && num > max) return false;

    return true;
  }

  /**
   * تنظيف JSON
   */
  sanitizeJSON(input: string): string | null {
    try {
      const parsed = JSON.parse(input);
      return JSON.stringify(parsed);
    } catch {
      return null;
    }
  }

  /**
   * التحقق من رقم القضية
   */
  validateCaseNumber(caseNumber: string): boolean {
    if (!caseNumber) return false;

    // رقم القضية العراقي: YYYY/number
    const caseRegex = /^\d{4}\/\d+$/;
    return caseRegex.test(caseNumber);
  }

  /**
   * تنظيف اسم الملف
   */
  sanitizeFileName(fileName: string): string {
    if (!fileName) return '';

    return fileName
      .replace(/[^a-zA-Z0-9._\u0600-\u06FF-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 255);
  }

  /**
   * التحقق من URL
   */
  validateURL(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  /**
   * إزالة Unicode الضار
   */
  removeInvisibleChars(input: string): string {
    if (!input) return '';

    // إزالة الأحرف غير المرئية والتحكم
    return input.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '');
  }

  /**
   * التحقق من التاريخ
   */
  validateDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * تنظيف شامل لكائن
   */
  sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
    return this.sanitizeUnknown(obj) as T;
  }

  /**
   * تنظيف نص HTML محتمل من سكربتات خبيثة
   */
  sanitizePotentialHTML(input: string): string {
    if (!input) return '';
    return this.sanitizeHTML(this.removeInvisibleChars(input));
  }

  /**
   * تنظيف قيمة مجهولة مع الحفاظ على البنية المتداخلة
   */
  sanitizeUnknown<T>(value: T): T {
    const seen = new WeakSet<object>();
    return this.sanitizeUnknownInternal(value, 0, seen);
  }

  private sanitizeUnknownInternal<T>(value: T, depth: number, seen: WeakSet<object>): T {
    if (depth > InputSanitizerService.MAX_SANITIZE_DEPTH) {
      if (typeof value === 'object' && value !== null) {
        return '[SanitizationBlocked:MaxDepth]' as T;
      }
      return value;
    }

    if (typeof value === 'string') {
      const maybeHtml = /<[^>]+>/.test(value) || /javascript:/i.test(value);
      const cleaned = maybeHtml
        ? this.sanitizePotentialHTML(value)
        : this.sanitizeText(value);
      return cleaned as T;
    }

    if (Array.isArray(value)) {
      if (seen.has(value)) return '[SanitizationBlocked:Circular]' as T;
      seen.add(value);
      const limited = value.slice(0, InputSanitizerService.MAX_COLLECTION_ITEMS);
      return limited.map((item) => this.sanitizeUnknownInternal(item, depth + 1, seen)) as T;
    }

    if (value && typeof value === 'object') {
      if (seen.has(value)) return '[SanitizationBlocked:Circular]' as T;
      seen.add(value);
      const recordValue = value as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      const limitedEntries = Object.entries(recordValue).slice(
        0,
        InputSanitizerService.MAX_COLLECTION_ITEMS,
      );
      for (const [key, nested] of limitedEntries) {
        out[key] = this.sanitizeUnknownInternal(nested, depth + 1, seen);
      }
      return out as T;
    }

    return value;
  }
}

// Singleton instance
export const inputSanitizer = new InputSanitizerService();

export default inputSanitizer;
