'use client'

import React, { useState } from 'react'
import { Container } from '@/components/layout'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/design-system/tables'
import { Badge } from '@/design-system/badges'
import { Button } from '@/design-system/buttons'
import { mockAutoresponderCampaigns } from './mockCampaigns'

export const CampaignsScreen = React.memo(() => {
  const [campaigns] = useState(mockAutoresponderCampaigns)
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false)

  const handleNewCampaign = () => {
    setShowNewCampaignModal(true)
  }

  return (
    <Container size="full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Campaigns</h1>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Priority</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last status change</TableHead>
              <TableHead className="text-right">Sent today</TableHead>
              <TableHead className="text-right">Sent last 30 days</TableHead>
              <TableHead className="w-20 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="text-text-muted">No campaigns found</div>
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.priority}</TableCell>
                  <TableCell>
                    <button className="text-primary hover:underline font-medium">
                      {campaign.name}
                    </button>
                  </TableCell>
                  <TableCell className="text-text-muted">{campaign.products}</TableCell>
                  <TableCell>
                    <Badge
                      variant={campaign.status === 'active' ? 'success' : 'secondary'}
                      className="capitalize"
                    >
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-text-muted">{campaign.lastStatusChange}</TableCell>
                  <TableCell className="text-right">{campaign.sentToday}</TableCell>
                  <TableCell className="text-right">{campaign.sentLast30Days}</TableCell>
                  <TableCell className="text-center">
                    <button className="p-1 hover:bg-surface-secondary rounded transition-colors">
                      <svg
                        className="w-5 h-5 text-text-muted"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* New Campaign Button */}
      <div className="fixed bottom-8 right-8">
        <Button
          variant="primary"
          onClick={handleNewCampaign}
          className="shadow-lg"
        >
          New campaign
        </Button>
      </div>
    </Container>
  )
})

CampaignsScreen.displayName = 'CampaignsScreen'
