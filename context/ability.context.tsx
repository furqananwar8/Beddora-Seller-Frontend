import { createContext, useEffect, useState } from 'react'
import { createContextualCan } from '@casl/react'
import { Ability } from '@casl/ability'
import type { AppAbility } from '../types/ability'

const AbilityContext = createContext<AppAbility | null>(null)
export const Can = createContextualCan(AbilityContext.Consumer)

export const AbilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ability, setAbility] = useState<AppAbility | null>(null)

  useEffect(() => {
    fetch('/api/casl/ability')
      .then(r => r.json())
      .then(({ rules }) => setAbility(new Ability(rules)))
  }, [])

  if (!ability) return null

  return (
    <AbilityContext.Provider value={ability}>
      {children}
    </AbilityContext.Provider>
  )
}