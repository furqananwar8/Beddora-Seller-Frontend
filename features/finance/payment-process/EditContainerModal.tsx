'use client'

import React from 'react'
import { ContainerFormModal } from '@/features/procurement/containers/ContainerFormModal'
import { useGetContainersQuery } from '@/services/api/procurement.api'
import { containerRefOf } from '../payment-requests/ContainerSelect'

interface EditContainerModalProps {
  /** The container number on the payment; null when closed. */
  containerNo: string | null
  onClose: () => void
}

/**
 * "Edit container" from a payment, whether or not it is paid. The container is looked up by its number; what
 * can change follows the container's own status rules (enforced by the container module).
 */
export const EditContainerModal: React.FC<EditContainerModalProps> = ({ containerNo, onClose }) => {
  const { data } = useGetContainersQuery({ search: containerNo ?? '', page: 1, limit: 10 }, { skip: !containerNo })
  const container = data?.data.find((item) => containerRefOf(item).toUpperCase() === containerNo?.toUpperCase()) ?? null

  return <ContainerFormModal isOpen={Boolean(containerNo && container)} onClose={onClose} container={container} />
}
