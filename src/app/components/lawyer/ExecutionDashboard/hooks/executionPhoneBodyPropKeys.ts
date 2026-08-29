/** مفاتيح جسم الدashboard — مُولَّد/مُزامَن عبر scripts/sync-phone-body-missing-keys.mjs */
import { EXECUTION_PHONE_BODY_PROP_KEYS_HEAD } from './executionPhoneBodyPropKeys.head';
import { EXECUTION_PHONE_BODY_PROP_KEYS_TAIL } from './executionPhoneBodyPropKeys.tail';

export const EXECUTION_PHONE_BODY_PROP_KEYS = [
    ...EXECUTION_PHONE_BODY_PROP_KEYS_HEAD,
    ...EXECUTION_PHONE_BODY_PROP_KEYS_TAIL,
] as const;

export type ExecutionPhoneBodyPropKey = (typeof EXECUTION_PHONE_BODY_PROP_KEYS)[number];
