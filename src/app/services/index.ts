/**
 * 🔐 HAMI SERVICES v2.0 - Simplified
 * 
 * التبسيط الجذري:
 * - إزالة التعقيد غير الضروري
 * - التركيز على الأساسيات
 * - الأمان في Backend (Supabase RLS)
 */

// === PRIMARY SERVICES ===
export { SupabaseService } from './SupabaseService';
export type { ExecutionFileDTO_Supabase as ExecutionFileDTO, LawsuitFile } from './SupabaseService';
export { RealtimeService } from './RealtimeService';
export { PushNotificationService } from './PushNotificationService';

// === SECURITY SERVICES ===
export { rateLimitService } from './RateLimitService';
export { inputSanitizer } from './InputSanitizerService';
export { securityHeaders } from './SecurityHeadersService';
export { securityAudit } from './SecurityAuditService';
export { default as SecureStoreService } from './SecureStoreService';
// HoneypotService removed — dead code (321 lines, no functional callers)
export { RequestSigningService } from './RequestSigningService';

// === API CLIENT ===
export { SecureAPIClient } from './SecureAPIClient';

// Legacy exports
export { CryptoService } from './CryptoService';
