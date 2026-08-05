import { useMemo } from 'react'
import { useAppSelector } from '@/store/hooks'
import { Ability } from '@casl/ability'

export function useAppAbility() {
  const rules = useAppSelector((state) => state.permissions.rules)
  return useMemo(() => new Ability(rules), [rules])
}