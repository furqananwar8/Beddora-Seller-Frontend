import { baseApi } from './baseApi'
import { Envelope, unwrap } from './finance.api'

/** Departments and approval rules (Settings > Approvals). */

export interface PersonRef {
  id: number
  name: string | null
  email: string
}

export type Platform = 'RETAIL' | 'ECOMMERCE'

export interface Department {
  id: number
  name: string
  /** The team that approves products on this platform, if any. */
  platform: Platform | null
  members: Array<PersonRef & { isHead: boolean }>
}

export interface DepartmentBody {
  name: string
  platform: Platform | null
  members: Array<{ userId: number; isHead: boolean }>
}

/** An approvable button, fixed in code. `steps` 0 means it still uses the old behavior. */
export interface ApprovalActionSummary {
  key: string
  label: string
  group: string
  steps: number
  isActive: boolean
  supportsPlatform: boolean
  /** False for flows that are designed but not wired yet. */
  available: boolean
}

/** ANY: the first approval moves on. ALL: everyone must approve. PER_GROUP: one person from each team. */
export type Completion = 'ANY' | 'ALL' | 'PER_GROUP'

export type RuleAssignee =
  | { kind: 'USER'; userId: number }
  | { kind: 'DEPARTMENT'; departmentId: number }
  | { kind: 'PLATFORM' }

export interface ApprovalRule {
  key: string
  label: string
  group: string
  /** Runs when the buttonLabel button on where is used. */
  buttonLabel: string
  where: string
  /** What finishing the chain does (PO is approved and locked). */
  outcome: string
  supportsPlatform: boolean
  isActive: boolean
  steps: Array<{ completion: Completion; assignees: Array<RuleAssignee & { label: string; people: string[] }> }>
}

export interface RuleBody {
  isActive: boolean
  steps: Array<{ completion: Completion; assignees: RuleAssignee[] }>
}

export type RecipientLine =
  | { kind: 'CREATOR' }
  | { kind: 'TAB_ACCESS'; permissionPage: string }
  | { kind: 'DEPARTMENT'; departmentId: number }
  | { kind: 'USER'; userId: number }

export interface NotificationEventSummary {
  key: string
  group: string
  label: string
  customised: boolean
}

export interface NotificationEvent {
  key: string
  group: string
  label: string
  description: string
  /** What is sent now: the admin's own wording, or the event's. Placeholders look like {shipment}. */
  wording: { title: string; body: string }
  /** The event's own wording, for "Reset to default". */
  defaultWording: { title: string; body: string }
  /** The words that can be dropped into the wording, with an example each for the preview. */
  placeholders: Array<{ token: string; label: string; example: string }>
  /** False until an admin saves it: the event then uses the defaults written in code. */
  customised: boolean
  isActive: boolean
  inApp: boolean
  email: boolean
  recipients: Array<RecipientLine & { label: string; count: number | null }>
  /** For events that run on a schedule: which days (counted down to the event's date) it is sent on. */
  schedule: { label: string; note: string; max: number; extra: { value: number; label: string; hint: string } | null; days: number[] } | null
}

/** The email as it would be sent, shown for one of the people who receive it (each gets their own name). */
export interface NotificationEmailPreview {
  subject: string
  html: string
  shownFor: { id: number | null; name: string }
  /** Nobody is picked yet, so the viewer's own name stands in. */
  usesYourName: boolean
  people: Array<{ id: number; name: string }>
  total: number
  includesCreator: boolean
}

export interface NotificationBody {
  isActive: boolean
  inApp: boolean
  email: boolean
  recipients: RecipientLine[]
  title: string
  body: string
  /** For scheduled events: the days it is sent on. */
  days?: number[]
}

export interface TabOption {
  permissionPage: string
  label: string
  group: string
}

export const approvalsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getApprovalUsers: b.query<PersonRef[], void>({
      query: () => '/settings/approvals/users',
      transformResponse: (response: Envelope<PersonRef[]>) => unwrap(response),
    }),
    getDepartments: b.query<Department[], void>({
      query: () => '/settings/approvals/departments',
      transformResponse: (response: Envelope<Department[]>) => unwrap(response),
      providesTags: ['Departments'],
    }),
    createDepartment: b.mutation<Department, DepartmentBody>({
      query: (body) => ({ url: '/settings/approvals/departments', method: 'POST', body }),
      transformResponse: (response: Envelope<Department>) => unwrap(response),
      invalidatesTags: ['Departments', 'ApprovalRules'],
    }),
    updateDepartment: b.mutation<Department, { id: number; body: DepartmentBody }>({
      query: ({ id, body }) => ({ url: `/settings/approvals/departments/${id}`, method: 'PUT', body }),
      transformResponse: (response: Envelope<Department>) => unwrap(response),
      // The screen changes at once and the server's answer only confirms it: no reload of the list, so nothing jumps
      async onQueryStarted({ id, body }, { dispatch, getState, queryFulfilled }) {
        const users = approvalsApi.endpoints.getApprovalUsers.select()(getState() as never).data ?? []
        const patch = dispatch(
          approvalsApi.util.updateQueryData('getDepartments', undefined, (draft) => {
            const department = draft.find((item) => item.id === id)
            if (!department) return
            const known = new Map(department.members.map((member) => [member.id, member]))
            department.name = body.name
            department.platform = body.platform
            department.members = body.members.map(({ userId, isHead }) => {
              const person = known.get(userId) ?? users.find((user) => user.id === userId)
              return { id: userId, name: person?.name ?? null, email: person?.email ?? '', isHead }
            })
          })
        )
        try {
          await queryFulfilled
        } catch {
          patch.undo()
        }
      },
    }),
    deleteDepartment: b.mutation<void, number>({
      query: (id) => ({ url: `/settings/approvals/departments/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Departments'],
    }),
    getApprovalActions: b.query<ApprovalActionSummary[], void>({
      query: () => '/settings/approvals/actions',
      transformResponse: (response: Envelope<ApprovalActionSummary[]>) => unwrap(response),
      providesTags: ['ApprovalRules'],
    }),
    getNotificationEvents: b.query<NotificationEventSummary[], void>({
      query: () => '/settings/approvals/notifications',
      transformResponse: (response: Envelope<NotificationEventSummary[]>) => unwrap(response),
      providesTags: ['NotificationRules'],
    }),
    getNotificationEvent: b.query<NotificationEvent, string>({
      query: (key) => `/settings/approvals/notifications/${key}`,
      transformResponse: (response: Envelope<NotificationEvent>) => unwrap(response),
      providesTags: ['NotificationRules'],
    }),
    getNotificationTabs: b.query<TabOption[], void>({
      query: () => '/settings/approvals/notifications/tabs',
      transformResponse: (response: Envelope<TabOption[]>) => unwrap(response),
    }),
    saveNotificationEvent: b.mutation<NotificationEvent, { key: string; body: NotificationBody }>({
      query: ({ key, body }) => ({ url: `/settings/approvals/notifications/${key}`, method: 'PUT', body }),
      transformResponse: (response: Envelope<NotificationEvent>) => unwrap(response),
      invalidatesTags: ['NotificationRules'],
    }),
    /** The email as the wording being typed would send it (the real template, filled with the event's examples). */
    previewNotificationEmail: b.mutation<NotificationEmailPreview, { key: string; title: string; body: string; recipients: RecipientLine[]; asUserId?: number }>({
      query: ({ key, ...body }) => ({ url: `/settings/approvals/notifications/${key}/preview`, method: 'POST', body }),
      transformResponse: (response: Envelope<NotificationEmailPreview>) => unwrap(response),
    }),
    getApprovalRule: b.query<ApprovalRule, string>({
      query: (key) => `/settings/approvals/rules/${key}`,
      transformResponse: (response: Envelope<ApprovalRule>) => unwrap(response),
      providesTags: ['ApprovalRules'],
    }),
    saveApprovalRule: b.mutation<ApprovalRule, { key: string; body: RuleBody }>({
      query: ({ key, body }) => ({ url: `/settings/approvals/rules/${key}`, method: 'PUT', body }),
      transformResponse: (response: Envelope<ApprovalRule>) => unwrap(response),
      invalidatesTags: ['ApprovalRules'],
    }),
  }),
})

export const {
  useGetApprovalUsersQuery,
  useGetDepartmentsQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  useGetApprovalActionsQuery,
  useGetApprovalRuleQuery,
  useGetNotificationEventsQuery,
  useGetNotificationEventQuery,
  useGetNotificationTabsQuery,
  useSaveNotificationEventMutation,
  usePreviewNotificationEmailMutation,
  useSaveApprovalRuleMutation,
} = approvalsApi
