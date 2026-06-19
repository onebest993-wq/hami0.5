export interface PartyItemProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    party: any;
    isEditing: boolean;
    align?: 'right' | 'left';
    notificationBadge?: React.ReactNode;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    provisionalOrders?: any[];
}
