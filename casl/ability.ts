import { Ability } from '@casl/ability'

export type AppRule = { action: string; subject: string }

export function buildAbility(rules: AppRule[]) {
  return new Ability(rules)
}