import React from 'react'
import { PoStatusBadge } from '../shared/poMeta'

const Arrow: React.FC<{ label: string }> = ({ label }) => <span className="font-mono text-xs text-text-muted">— {label} →</span>

/** How a PO moves and when ETD reminders go out, under the list. */
export const PoLegend: React.FC = () => (
  <div className="mt-4 grid gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm lg:grid-cols-2">
    <section>
      <h2 className="mb-2 text-sm font-semibold text-text-primary">PO lifecycle</h2>
      <div className="flex flex-wrap items-center gap-2">
        <PoStatusBadge status="DRAFT" />
        <Arrow label="submit" />
        <PoStatusBadge status="PENDING_APPROVAL" />
        <Arrow label="approve · locked" />
        <PoStatusBadge status="APPROVED" />
        <Arrow label="production date set" />
        <PoStatusBadge status="IN_PROGRESS" />
        <Arrow label="packing" />
        <PoStatusBadge status="PARTIALLY_PACKED" />
        <Arrow label="all units packed" />
        <PoStatusBadge status="FULLY_PACKED" />
        <Arrow label="list in container" />
        <PoStatusBadge status="PARTIALLY_SHIPPED" />
        <Arrow label="every list in a container" />
        <PoStatusBadge status="FULLY_SHIPPED" />
      </div>
      <p className="mt-2 text-xs text-text-muted">
        Editable as a draft or while pending. A rejected PO goes back to draft with the approver’s reason and must be submitted again. Approved POs are locked until an
        approver unlocks them; saving locks them again. The production date is set once a PO is approved; the ARD once it is in production. Closing a PO before every unit has shipped marks it SHORT CLOSED. A closed PO cannot be edited.
      </p>
    </section>
    <section>
      <h2 className="mb-2 text-sm font-semibold text-text-primary">ERD email reminders</h2>
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-success-500 bg-success-50 px-3 py-2 text-xs text-success-700">
          <p className="font-semibold">&gt; 10 days</p>
          <p>Green · no email</p>
        </div>
        <div className="rounded-lg border border-warning-500 bg-warning-50 px-3 py-2 text-xs text-warning-700">
          <p className="font-semibold">10 → 0 days</p>
          <p>Orange · email every day</p>
        </div>
        <div className="rounded-lg border border-danger-500 bg-danger-50 px-3 py-2 text-xs text-danger-700">
          <p className="font-semibold">Past ERD</p>
          <p>Orange-red · overdue email daily</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-text-muted">Stops once every unit is in a shipped container, or the PO is closed.</p>
    </section>
  </div>
)
