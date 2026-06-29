'use client'

/**
 * Placeholder for future 2FA setup.
 * Currently shows informational text only.
 */
export function TwoFASetup() {
  return (
    <div className="rounded border border-secondary-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-secondary-900">Two-Factor Authentication</h3>
      <p className="mt-2 text-sm text-secondary-700">
        Two-factor authentication is not enforced yet. This placeholder is ready for future
        enrollment (e.g., TOTP QR setup, recovery codes). No action is required right now.
      </p>
    </div>
  )
}
