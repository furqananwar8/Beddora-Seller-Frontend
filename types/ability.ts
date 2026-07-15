// frontend/src/types/ability.ts
import { PureAbility } from '@casl/ability'

type AppSubjects = 'profit' | 'inventory' | 'alerts' | 'ppc' | 'settings' | 'all'
export type AppAbility = PureAbility<[string, AppSubjects]>