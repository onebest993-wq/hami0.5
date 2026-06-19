import { CryptoService } from './CryptoService';
import { SecureAPIClient, getCurrentAccessToken } from './SecureAPIClient';
import { RequestStatus, type LegalRequest, type LegalRequestAIMetadata } from '../types/admin-types';

const DEV_REQUESTS_SESSION_KEY = 'hami:dev:requests:v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function getSessionStorage(): Storage | null {
  if (!import.meta.env.DEV) return null;
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function loadDevRequestsFromSession(): LegalRequest[] {
  const ss = getSessionStorage();
  if (!ss) return [];
  const raw = ss.getItem(DEV_REQUESTS_SESSION_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isLegalRequest) as LegalRequest[];
  } catch {
    return [];
  }
}

function saveDevRequestsToSession(requests: LegalRequest[]): void {
  const ss = getSessionStorage();
  if (!ss) return;
  try {
    ss.setItem(DEV_REQUESTS_SESSION_KEY, JSON.stringify(requests));
  } catch {
    return;
  }
}

function buildRequestMetadata(plainDetails: string): LegalRequestAIMetadata {
  const normalized = plainDetails.trim();
  const hay = normalized.toLowerCase();
  const isCritical =
    hay.includes('عاجل') ||
    hay.includes('غدا') ||
    hay.includes('غداً') ||
    hay.includes('طرد') ||
    hay.includes('سجن') ||
    hay.includes('محكمة');

  if (isCritical) {
    return {
      summary: 'طلب عالي الحساسية يتطلب إجراء فوري لتفادي ضرر قانوني.',
      urgency: 'CRITICAL',
      suggested_action: 'قبول فوري + تواصل سريع مع الموكل',
    };
  }

  return {
    summary: 'استشارة قانونية عادية قابلة للمتابعة ضمن الجدول.',
    urgency: 'NORMAL',
    suggested_action: 'مراجعة أولية ثم تحديد الخطوة التالية',
  };
}

function buildSmartSummary(title: string, plainDetails: string): string {
  const t = title.trim();
  const d = plainDetails.trim();
  const hay = `${t} ${d}`.toLowerCase();

  const kind =
    hay.includes('عقار') || hay.includes('تمليك') || hay.includes('طابو')
      ? 'نزاع عقاري'
      : hay.includes('نفقة') || hay.includes('حضانة') || hay.includes('طلاق')
        ? 'أحوال شخصية'
        : hay.includes('شركة') || hay.includes('عقد') || hay.includes('تجاري')
          ? 'نزاع تجاري'
          : 'استشارة قانونية';

  const urgency =
    hay.includes('طعن') || hay.includes('تمييز') || hay.includes('استئناف') || hay.includes('مهلة') || hay.includes('عاجل')
      ? 'يتطلب رد عاجل'
      : 'قابل للمتابعة';

  const core = t || kind;
  return `${kind} - ${core} - ${urgency}`;
}

function computeDueAtIso(title: string, plainDetails: string): string {
  const now = Date.now();
  const hay = `${title} ${plainDetails}`.toLowerCase();
  const hours =
    hay.includes('طعن') || hay.includes('تمييز') || hay.includes('مهلة') || hay.includes('عاجل') ? 4 : 48;
  return new Date(now + hours * 60 * 60 * 1000).toISOString();
}

function isLegalRequest(value: unknown): value is LegalRequest {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.client_id === 'string' &&
    typeof value.lawyer_id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.encrypted_details === 'string' &&
    typeof value.data_signature === 'string' &&
    typeof value.status === 'string' &&
    typeof value.created_at === 'string'
  );
}

function isRequestStatus(value: string): value is RequestStatus {
  return value in RequestStatus;
}

export class ClientRequestService {
  static async decryptDetails(request: Pick<LegalRequest, 'encrypted_details' | 'data_signature'>): Promise<string | null> {
    try {
      await CryptoService.initialize();
      const plain = await CryptoService.decryptData(request.encrypted_details);
      return plain;
    } catch {
      return null;
    }
  }

  static async createRequest(
    clientId: string,
    lawyerId: string,
    title: string,
    plainDetails: string,
  ): Promise<boolean> {
    try {
      await CryptoService.initialize();
      const ai_metadata = buildRequestMetadata(plainDetails);
      const encrypted_details = await CryptoService.encryptData(plainDetails);
      const data_signature = await CryptoService.generateDataSignature(encrypted_details);
      const smart_summary = buildSmartSummary(title, plainDetails);
      const due_at = ai_metadata.deadline ?? computeDueAtIso(title, plainDetails);
      const request: LegalRequest = {
        id: crypto.randomUUID(),
        client_id: clientId,
        lawyer_id: lawyerId,
        title,
        encrypted_details,
        data_signature,
        smart_summary,
        due_at,
        opened_at: null,
        ai_metadata: { ...ai_metadata, deadline: due_at },
        status: RequestStatus.PENDING,
        created_at: new Date().toISOString(),
      };

      await SecureAPIClient.fetchSecure(
        '/api/requests/create',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: new Blob([JSON.stringify(request)], { type: 'application/json' }),
        }
      );

      if (import.meta.env.DEV) {
        const existing = loadDevRequestsFromSession();
        const next = [request, ...existing.filter((r) => r.id !== request.id)];
        saveDevRequestsToSession(next);
      }

      return true;
    } catch {
      return false;
    }
  }

  static async updateRequestStatus(lawyerId: string, requestId: string, newStatus: RequestStatus): Promise<boolean> {
    try {
      await SecureAPIClient.fetchSecure(
        '/api/requests/update',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: new Blob([JSON.stringify({ lawyer_id: lawyerId, request_id: requestId, status: newStatus })], {
            type: 'application/json',
          }),
        }
      );

      if (import.meta.env.DEV) {
        const existing = loadDevRequestsFromSession();
        const next = existing.map((r) => (r.id === requestId ? { ...r, status: newStatus } : r));
        saveDevRequestsToSession(next);
      }

      return true;
    } catch {
      return false;
    }
  }

  static async getLawyerRequests(lawyerId: string): Promise<LegalRequest[]> {
    const devOnly = (): LegalRequest[] =>
      import.meta.env.DEV ? loadDevRequestsFromSession().filter((r) => r.lawyer_id === lawyerId) : [];

    try {
      const token = await getCurrentAccessToken();
      if (!token) return devOnly();

      const data = await SecureAPIClient.fetchSecure(
        '/api/requests/list',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: new Blob([JSON.stringify({ lawyer_id: lawyerId })], { type: 'application/json' }),
        },
      );

      const list = Array.isArray(data) ? data : isRecord(data) && Array.isArray(data.requests) ? data.requests : [];
      const devList = import.meta.env.DEV ? loadDevRequestsFromSession().filter((r) => r.lawyer_id === lawyerId) : [];
      const mergedById = new Map<string, unknown>();
      for (const item of list) {
        if (isLegalRequest(item)) mergedById.set(item.id, item);
      }
      for (const item of devList) {
        mergedById.set(item.id, item);
      }

      const out: LegalRequest[] = [];

      for (const item of mergedById.values()) {
        if (!isLegalRequest(item)) continue;
        if (!isRequestStatus(item.status)) continue;
        out.push(item);
      }

      return out;
    } catch {
      return devOnly();
    }
  }
}
