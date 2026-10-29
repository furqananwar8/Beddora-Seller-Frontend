import { z } from 'zod'
import type { ProductManager, ProductManagerInput } from '@/services/api/productManagers.api'

export const productManagerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Keep the name under 120 characters'),
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email')),
  skus: z.array(z.string()).min(1, 'Pick at least one product'),
})

export type ProductManagerFormValues = ProductManagerInput

export const emptyProductManagerValues: ProductManagerFormValues = { name: '', email: '', skus: [] }

export const productManagerFormValues = ({ name, email, skus }: ProductManager): ProductManagerFormValues => ({ name, email, skus })
