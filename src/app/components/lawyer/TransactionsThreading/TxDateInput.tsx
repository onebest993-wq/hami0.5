import type { ChangeEvent, ButtonHTMLAttributes } from 'react';
import { cn } from '@/app/components/ui/utils';
import { HamiDateInput } from '@/app/components/ui/HamiDateInput';
import { GLASS_FIELD } from './transactionsGlassTheme';

type TxDateInputProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'onChange' | 'value' | 'children'> & {
    value?: string;
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

/** تقويم رسومي داخل body — يعمل داخل أوراق hub المعاملات (بدون showPicker) */
export function TxDateInput({ className, disabled, value = '', onChange, ...props }: TxDateInputProps) {
    return (
        <HamiDateInput
            {...props}
            value={value}
            disabled={disabled}
            placeholder="اختر التاريخ"
            className={cn(GLASS_FIELD, 'disabled:opacity-50 text-right', className)}
            onValueChange={(isoYmd) => {
                onChange?.({
                    target: { value: isoYmd },
                    currentTarget: { value: isoYmd },
                } as ChangeEvent<HTMLInputElement>);
            }}
        />
    );
}
