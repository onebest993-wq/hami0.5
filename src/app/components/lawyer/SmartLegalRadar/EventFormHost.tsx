import React from 'react';
import { EventForm } from '@/app/components/lawyer/SmartLegalRadar/EventForm';

type EventFormProps = React.ComponentProps<typeof EventForm>;

export function EventFormHost(props: EventFormProps): React.ReactElement | null {
    return <EventForm {...props} />;
}
