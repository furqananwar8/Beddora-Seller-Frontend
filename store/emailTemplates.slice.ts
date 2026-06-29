import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface EmailTemplatesState {
  selectedTemplateId?: string
}

const initialState: EmailTemplatesState = {
  selectedTemplateId: undefined,
}

export const emailTemplatesSlice = createSlice({
  name: 'emailTemplates',
  initialState,
  reducers: {
    setSelectedTemplateId: (state, action: PayloadAction<string | undefined>) => {
      state.selectedTemplateId = action.payload
    },
  },
})

export const { setSelectedTemplateId } = emailTemplatesSlice.actions

export default emailTemplatesSlice.reducer

