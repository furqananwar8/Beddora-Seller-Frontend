'use client'

import React from 'react'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import type { ManagerChannel, ProductManager } from '@/services/api/productManagers.api'

interface ViewProductsDialogProps {
  /** The manager whose products are listed; null closes the dialog. */
  manager: ProductManager | null
  channels: ManagerChannel[]
  onClose: () => void
}

/** The SKUs a manager looks after, grouped by sales channel. */
export const ViewProductsDialog: React.FC<ViewProductsDialogProps> = ({ manager, channels, onClose }) => (
  <Modal isOpen={manager !== null} onClose={onClose} title={manager ? `${manager.name}'s products` : 'Products'} size="md">
    {manager &&
      (manager.products.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">No products assigned yet.</p>
      ) : (
        <div className="flex max-h-[60vh] flex-col gap-5 overflow-y-auto">
          {manager.products.map(({ channel, skus }) => (
            <section key={channel}>
              <h3 className="mb-2 text-sm font-semibold text-text-primary">
                {channels.find((item) => item.id === channel)?.name ?? channel} <span className="font-normal text-text-muted">({skus.length})</span>
              </h3>
              <ul className="flex flex-wrap gap-1.5">
                {skus.map((sku) => (
                  <li key={sku} className="rounded border border-border bg-surface-secondary px-2 py-1 font-mono text-xs text-text-primary">
                    {sku}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ))}
    <div className="mt-6 flex justify-end">
      <Button type="button" variant="outline" onClick={onClose}>
        Close
      </Button>
    </div>
  </Modal>
)
