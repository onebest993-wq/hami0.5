/** حجم وشكل موحّد لشارات المدين/الأطراف — تفاعلية وحجز */

/**
 * صندوقُ الشارة وحده: ما يُحدّد ارتفاعَها (الحدّ · الحشو · حجم الخطّ · تباعد الأيقونة).
 * يُشتقّ منه شكلُ الشارة **وهيكلُ انتظارها** في `DebtorCardRowCollapsed`، فيبقى الهيكلُ بارتفاع
 * ما يحلّ محلّه — ويحرس التطابقَ في الصفّ الحيّ `e2e/execution-debtor-badges-slot.spec.ts`.
 */
export const PARTY_BADGE_PILL_BOX_CLASS = 'inline-flex shrink-0 items-center gap-1.5 border px-2.5 py-1 text-[10px]';

export const PARTY_BADGE_PILL_CLASS = `group ${PARTY_BADGE_PILL_BOX_CLASS} flex-row-reverse rounded-full font-bold transition-all hover:brightness-110 hover:shadow-[0_0_16px_rgba(0,0,0,0.2)] cursor-pointer`;

export const PARTY_BADGE_ICON_SIZE = 12;
