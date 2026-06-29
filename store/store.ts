import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { persistReducer, persistStore } from 'redux-persist'
import { authPersistConfig } from './persist.config'
import { baseApi } from '@/services/api/baseApi'
import authReducer from './auth.slice'
import accountsReducer from './accounts.slice'
import permissionsReducer from './permissions.slice'
import uiReducer from './ui.slice'
import manualImportReducer from './manualImport.slice'
import profitReducer from './profit.slice'
import profitKpisReducer from './profitKpis.slice'
import profitCogsReducer from './profitCogs.slice'
import profitExpensesReducer from './profitExpenses.slice'
import profitReturnsReducer from './profitReturns.slice'
import profitChartsReducer from './profitCharts.slice'
import reportsReducer from './reports.slice'
import inventoryStockReducer from './inventoryStock.slice'
import inventoryForecastReducer from './inventoryForecast.slice'
import inventoryPOsReducer from './inventoryPOs.slice'
import inventoryKpiReducer from './inventoryKPI.slice'
import ppcDashboardReducer from './ppcDashboard.slice'
import ppcMetricsReducer from './ppcMetrics.slice'
import ppcOptimizationReducer from './ppcOptimization.slice'
import ppcBulkReducer from './ppcBulk.slice'
import ppcProfitMetricsReducer from './ppcProfitMetrics.slice'
import listingAlertsReducer from './listingAlerts.slice'
import buyBoxAlertsReducer from './buyBoxAlerts.slice'
import feeChangeAlertsReducer from './feeChangeAlerts.slice'
import feedbackAlertsReducer from './feedbackAlerts.slice'
import emailTemplatesReducer from './emailTemplates.slice'
import refundDiscrepanciesReducer from './refundDiscrepancies.slice'
import reimbursementCasesReducer from './reimbursementCases.slice'
import marketplacesReducer from './marketplaces.slice'
import currenciesReducer from './currencies.slice'
import amazonReducer from './amazon.slice'

const rootReducer = combineReducers({
  [baseApi.reducerPath]: baseApi.reducer,
  auth: persistReducer(authPersistConfig, authReducer),
  accounts: accountsReducer,
  permissions: permissionsReducer,
  ui: uiReducer,
  manualImport: manualImportReducer,
  profit: profitReducer,
  profitKpis: profitKpisReducer,
  profitCogs: profitCogsReducer,
  profitExpenses: profitExpensesReducer,
  profitReturns: profitReturnsReducer,
  profitCharts: profitChartsReducer,
  reports: reportsReducer,
  inventoryStock: inventoryStockReducer,
  inventoryForecast: inventoryForecastReducer,
  inventoryPOs: inventoryPOsReducer,
  inventoryKpi: inventoryKpiReducer,
  ppcDashboard: ppcDashboardReducer,
  ppcMetrics: ppcMetricsReducer,
  ppcOptimization: ppcOptimizationReducer,
  ppcBulk: ppcBulkReducer,
  ppcProfitMetrics: ppcProfitMetricsReducer,
  listingAlerts: listingAlertsReducer,
  buyBoxAlerts: buyBoxAlertsReducer,
  feeChangeAlerts: feeChangeAlertsReducer,
  feedbackAlerts: feedbackAlertsReducer,
  emailTemplates: emailTemplatesReducer,
  refundDiscrepancies: refundDiscrepanciesReducer,
  reimbursementCases: reimbursementCasesReducer,
  marketplaces: marketplacesReducer,
  currencies: currenciesReducer,
  amazon: amazonReducer,
})

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(baseApi.middleware),
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch