import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux'
import type { RootState, AppDispatch } from './store'

/**
 * Typed Redux hooks
 * 
 * Use these instead of plain useDispatch and useSelector
 * for better TypeScript support
 */

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

