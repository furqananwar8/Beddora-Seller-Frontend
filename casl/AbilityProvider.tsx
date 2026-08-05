'use client'

import React, { useMemo } from 'react'
import { Ability } from '@casl/ability'
import { useAppSelector } from '@/store/hooks'
import { AbilityContext } from './Can'

export function AbilityProvider({ children }: { children: React.ReactNode }) {
  const rules = useAppSelector((state) => state.permissions.rules)
  const ability = useMemo(() => new Ability(rules), [rules])

  return (
    <AbilityContext.Provider value={ability}>
      {children}
    </AbilityContext.Provider>
  )
}