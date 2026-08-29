/** جدول iraqi_laws غائب عن بعض البيئات رغم ترحيل 002. */

export const IRAQI_LAWS_TABLE_MISSING =
  'جدول القوانين غير مُنشأ على القاعدة. طبّق ترحيل iraqi_laws ثم أعد المحاولة.';

export function isMissingIraqiLawsRelation(message: string): boolean {
  const hay = message.toLowerCase();
  return hay.includes('does not exist') || hay.includes('schema cache') || hay.includes('relation');
}
