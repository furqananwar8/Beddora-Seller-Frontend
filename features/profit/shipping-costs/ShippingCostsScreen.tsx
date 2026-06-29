'use client'

import React, { useState } from 'react'
import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'
import { Card, CardContent } from '@/design-system/cards'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/design-system/tables'
import { ShippingProfileModal } from './ShippingProfileModal'

interface ShippingProfile {
  id: string
  name: string
  period: string
  products: string
  calculationRule: string
}

export const ShippingCostsScreen: React.FC = () => {
  const [profiles, setProfiles] = useState<ShippingProfile[]>([
    {
      id: '1',
      name: 'Default',
      period: 'Unlimited',
      products: 'Selected products: Default',
      calculationRule: 'Shipping cost equals amount client is charged',
    },
  ])

  const [showMenu, setShowMenu] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<ShippingProfile | undefined>(undefined)

  const handleAddProfile = () => {
    setEditingProfile(undefined)
    setIsModalOpen(true)
  }

  const handleEditProfile = (profileId: string) => {
    const profile = profiles.find((p) => p.id === profileId)
    setEditingProfile(profile)
    setIsModalOpen(true)
  }

  const handleSaveProfile = (profileData: Omit<ShippingProfile, 'id'> & { id?: string }) => {
    if (profileData.id) {
      // Edit existing profile
      setProfiles(
        profiles.map((p) => (p.id === profileData.id ? { ...p, ...profileData } : p))
      )
    } else {
      // Add new profile
      const newProfile = {
        ...profileData,
        id: Date.now().toString(),
      }
      setProfiles([...profiles, newProfile])
    }
  }

  const handleDeleteProfile = (profileId: string) => {
    if (confirm('Are you sure you want to delete this shipping profile?')) {
      setProfiles(profiles.filter((p) => p.id !== profileId))
    }
  }

  return (
    <Container size="full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary mb-2">Shipping costs</h1>
      </div>

      {/* Shipping Profiles Section */}
      <div className="mb-6">
        <h2 className="text-lg font-medium text-text-primary mb-4">Shipping profiles</h2>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Shipping profile</TableHead>
                    <TableHead className="whitespace-nowrap">Period</TableHead>
                    <TableHead className="whitespace-nowrap">Products</TableHead>
                    <TableHead className="whitespace-nowrap">Shipping cost calculation rule</TableHead>
                    <TableHead className="w-12 text-center whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.length > 0 ? (
                    profiles.map((profile) => (
                      <TableRow key={profile.id} className="hover:bg-surface-secondary">
                        <TableCell>
                          <button
                            onClick={() => handleEditProfile(profile.id)}
                            className="text-primary-600 hover:text-primary-700 hover:underline font-medium"
                          >
                            {profile.name}
                          </button>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{profile.period}</TableCell>
                        <TableCell>{profile.products}</TableCell>
                        <TableCell>{profile.calculationRule}</TableCell>
                        <TableCell className="text-center">
                          <div className="relative">
                            <button
                              onClick={() =>
                                setShowMenu(showMenu === profile.id ? null : profile.id)
                              }
                              className="p-1 hover:bg-surface-secondary transition-colors"
                              aria-label="More actions"
                            >
                              <svg
                                className="w-5 h-5 text-text-muted"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>

                            {/* Dropdown Menu */}
                            {showMenu === profile.id && (
                              <>
                                {/* Backdrop to close menu */}
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setShowMenu(null)}
                                />

                                {/* Menu */}
                                <div className="absolute right-0 top-full mt-1 bg-surface border border-border shadow-lg z-20 min-w-[160px]">
                                  <button
                                    onClick={() => {
                                      handleEditProfile(profile.id)
                                      setShowMenu(null)
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-surface-secondary transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleDeleteProfile(profile.id)
                                      setShowMenu(null)
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-danger-600 hover:bg-surface-secondary transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-text-muted py-8">
                        No shipping profiles found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Profile Button */}
      <div>
        <Button variant="primary" onClick={handleAddProfile}>
          + Add New Profile
        </Button>
      </div>

      {/* Shipping Profile Modal */}
      <ShippingProfileModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingProfile(undefined)
        }}
        profile={editingProfile}
        onSave={handleSaveProfile}
      />
    </Container>
  )
}
