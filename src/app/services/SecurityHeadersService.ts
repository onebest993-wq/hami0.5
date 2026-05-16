interface SecurityHeaders {
  'Content-Security-Policy': string;
  'X-Frame-Options': string;
  'X-Content-Type-Options': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'Strict-Transport-Security': string;
  'X-XSS-Protection': string;
}

class SecurityHeadersService {
  private headers: SecurityHeaders;

  constructor() {
    this.headers = this.getDefaultHeaders();
  }

  private getDefaultHeaders(): SecurityHeaders {
    return {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' https://js.sentry-cdn.com 'report-sample'",
        "style-src 'self' https://fonts.googleapis.com 'report-sample'",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://sentry.io",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),

      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': [
        'geolocation=()',
        'microphone=()',
        'camera=()',
        'payment=()',
        'usb=()',
        'magnetometer=()',
      ].join(', '),
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-XSS-Protection': '1; mode=block',
    };
  }

  getHeaders(): SecurityHeaders {
    return { ...this.headers };
  }

  applyToFetch(headers: HeadersInit = {}): HeadersInit {
    return {
      ...headers,
      ...this.headers,
    };
  }

  applyToResponse(response: Response): Response {
    const newHeaders = new Headers(response.headers);
    Object.entries(this.headers).forEach(([key, value]) => {
      newHeaders.set(key, value);
    });
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }

  addCSPSource(directive: string, source: string): void {
    const csp = this.headers['Content-Security-Policy'];
    const directives = csp.split('; ');
    const index = directives.findIndex(d => d.startsWith(directive));
    if (index !== -1) {
      directives[index] += ` ${source}`;
    } else {
      directives.push(`${directive} ${source}`);
    }
    this.headers['Content-Security-Policy'] = directives.join('; ');
  }

  generateCSRFToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  validateCSRFToken(token: string, storedToken: string): boolean {
    if (!token || !storedToken) return false;
    if (token.length !== storedToken.length) return false;
    let result = 0;
    for (let i = 0; i < token.length; i++) {
      result |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
    }
    return result === 0;
  }

}

export const securityHeaders = new SecurityHeadersService();

// إزالة Monkey Patching بالكامل — لم نعد نعدل window.fetch
// CSRF يُدار الآن عبر wifeValidator (Server-side) + SecurityInitializer (Client-side)
// انظر: SecurityInitializer.tsx -> injectCsrfToken() و wifeValidator.ts -> verifyCsrfToken()

export default securityHeaders;
