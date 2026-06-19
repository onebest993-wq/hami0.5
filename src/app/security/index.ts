/** WIFE — client-side security surface (single import path) */
export { SecurityInitializer } from './SecurityInitializer';
export { installWifeFetchGuard, resetWifeFetchGuardForTests, isWifeProtectedApiUrl } from './wifeFetchGuard';
export {
  applyCsrfTokenToDocument,
  clearCsrfSessionToken,
  getOrCreateCsrfSessionToken,
  readCsrfTokenFromDocument,
  setCsrfSessionTokenFromServer,
  CSRF_COOKIE_NAME,
  CSRF_META_NAME,
} from './csrfSession';
export { getOrCreateDeviceId } from './deviceId';
export { registerTokenSession, detectStolenToken } from './stolenTokenClient';
export { decodeJwtPayloadBase64, extractJwtSessionFields } from './jwtFields';
export type { JwtSessionFields } from './jwtFields';
export { isKeyOwnedBy, isPrefixOwnedBy } from './kvProxyKeyOwnership';
