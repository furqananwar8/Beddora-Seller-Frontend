import React from 'react'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { STATUS_META, type NodeStatus } from './constants'

export const MappingStatusBadge: React.FC<{ status: NodeStatus; className?: string }> = ({ status, className }) => (
  <StatusBadge label={STATUS_META[status].label} tone={STATUS_META[status].tone} className={className} />
)
