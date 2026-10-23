import { redirect } from 'next/navigation'
import { CONTAINER_ROUTES } from '@/features/procurement/containers/routes'

/** Containers moved to their own section; old links land there. */
export default function LegacyContainerPage({ params }: { params: { id: string } }) {
  redirect(CONTAINER_ROUTES.detail(params.id))
}
