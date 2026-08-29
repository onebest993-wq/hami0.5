/**
 * Generic form field / validation types.
 */

export interface FormField {
    key: string;
    label: string;
    type: FormFieldType;
    required?: boolean;
    placeholder?: string;
    options?: FormFieldOption[];
    validation?: FieldValidation;
}

export type FormFieldType =
    | 'text'
    | 'number'
    | 'date'
    | 'select'
    | 'textarea'
    | 'checkbox'
    | 'radio'
    | 'file';

export interface FormFieldOption {
    value: string;
    label: string;
}

export interface FieldValidation {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: RegExp;
    message?: string;
}
