import { fieldClass } from '@/components/form-field/FormField'
import { cn } from '@/utils/cn'

/** A form input; `fromProduct` gives it the subtle grey fill of a value prefilled from the product master. */
export const shippingField = (error?: string, fromProduct?: boolean) => cn(fieldClass(error), fromProduct && !error && 'bg-secondary-50')

/** A number input aligned for figures. */
export const numberField = (error?: string, fromProduct?: boolean) => cn(shippingField(error, fromProduct), 'tabular-nums')
