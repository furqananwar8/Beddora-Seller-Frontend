import { AutoresponderCampaign } from '@/services/api/autoresponderCampaigns.api'

export const mockAutoresponderCampaigns: AutoresponderCampaign[] = [
  {
    id: '1',
    priority: 1,
    name: 'new emails',
    products: 'All products',
    status: 'active',
    lastStatusChange: '4 September, 2025',
    sentToday: 0,
    sentLast30Days: 0,
  },
  {
    id: '2',
    priority: 2,
    name: 'Beddora review request',
    products: 'All products',
    status: 'inactive',
    lastStatusChange: '12 August, 2025',
    sentToday: 0,
    sentLast30Days: 0,
  },
]
