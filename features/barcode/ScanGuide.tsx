'use client'

const SCAN_STEPS = [
  'Open this Bar Code page in Chrome on the scanner (Zebra TC57) and sign in.',
  'Check the badge reads "Handheld scanner: connected". If it says disconnected, tap "Connect scanner".',
  'Point the scanner at the barcode and press its yellow side trigger.',
  'The scanner types the code into the field, which clears straight away. The full result (the code and everything it contains) appears under "Latest scan".',
  'The scan is saved and added to the list below for everyone. If it shows "Not saved", check the device is online and scan again.',
]

/** Zebra DataWedge on Android 14 (TC57); done once per device. */
const DATAWEDGE_STEPS = [
  'On the TC57, open the app drawer and open DataWedge.',
  'Tap the ⋮ menu (top right) → New profile. Name it "Beddora" and tap OK.',
  'Open the new profile and make sure "Profile enabled" is ticked.',
  'Tap Associated apps → ⋮ → New app/activity. Choose com.android.chrome, then choose * (all activities).',
  'Back in the profile, under Barcode input: turn Enabled on (1D, 2D and QR codes are on by default).',
  'Under Keystroke output: turn Enabled on. Then open Basic data formatting, turn Enable on and tick "Send ENTER key".',
  'Under Intent output: turn Enabled off.',
  'Close DataWedge, open Chrome, go to this page and scan any barcode to test.',
]

function Steps({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wide text-text-muted">{title}</div>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-text-primary">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </div>
  )
}

/** What whoever is scanning needs: how to scan, and the one-time DataWedge setup on the device. */
export function ScanGuide() {
  return (
    <div className="grid gap-6 rounded-lg bg-surface-secondary p-4 md:grid-cols-2">
      <Steps title="How to scan" steps={SCAN_STEPS} />
      <Steps title="One-time scanner setup (DataWedge)" steps={DATAWEDGE_STEPS} />
    </div>
  )
}
