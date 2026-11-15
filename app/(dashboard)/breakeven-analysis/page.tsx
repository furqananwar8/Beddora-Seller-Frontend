import { redirect } from 'next/navigation'

// Breakeven Analysis is a parent: it opens its first child. The sidebar links straight to the children.
export default function BreakevenAnalysisIndex() {
  redirect('/breakeven-analysis/period-analysis')
}
