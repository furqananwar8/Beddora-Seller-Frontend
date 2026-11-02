import { z } from 'zod'
import type { ProductManager, ProductManagerInput } from '@/services/api/productManagers.api'

export const productManagerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Keep the name under 120 characters'),
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email')),
})

export type ProductManagerFormValues = ProductManagerInput

export const emptyProductManagerValues: ProductManagerFormValues = { name: '', email: '' }

export const productManagerFormValues = ({ name, email }: ProductManager): ProductManagerFormValues => ({ name, email })
