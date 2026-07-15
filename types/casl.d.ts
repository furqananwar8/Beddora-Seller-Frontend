// src/types/casl.d.ts
declare module '@casl/ability' {
  export class Ability<T = any> {
    constructor(rules?: any[])
    can(action: string, subject: any, field?: string): boolean
    cannot(action: string, subject: any, field?: string): boolean
    rules: any[]
  }

  export class PureAbility<T = any> {
    constructor(rules?: any[])
    can(action: string, subject: any, field?: string): boolean
    cannot(action: string, subject: any, field?: string): boolean
    rules: any[]
  }

  export class AbilityBuilder<T = any> {
    constructor(AbilityClass: new (...args: any[]) => T)
    can(action: string, subject: any, conditions?: any): void
    cannot(action: string, subject: any, conditions?: any): void
    build(): T
  }

  export function subject<T extends string>(type: T, object: Record<string, any>): { __type: T } & Record<string, any>
}

declare module '@casl/react' {
  import { ComponentType, Context } from 'react'
  import { Ability } from '@casl/ability'
  
  export function createContextualCan(
    consumer: Context<Ability | null>['Consumer']
  ): ComponentType<{
    I: string
    a?: string | Record<string, any>
    do?: string
    on?: string | Record<string, any>
    this?: string | Record<string, any>
    field?: string
    not?: boolean
    children?: React.ReactNode | ((allowed: boolean) => React.ReactNode)
  }>
}