import React from 'react';
import { Mail, MapPin, MessageCircle, Phone, Globe } from 'lucide-react';
import type { ProfileAction } from '@/app/services/lawyer-cloud';

export function ActionIcon({ type }: { type: ProfileAction['type'] }) {
    const cls = 'shrink-0';
    if (type === 'whatsapp') return <MessageCircle size={18} className={cls} />;
    if (type === 'call') return <Phone size={18} className={cls} />;
    if (type === 'email') return <Mail size={18} className={cls} />;
    if (type === 'website') return <Globe size={18} className={cls} />;
    return <MapPin size={18} className={cls} />;
}
