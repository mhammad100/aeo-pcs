import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type PromptsState = {
  original: string[];
  prompts: string[];
};

const initialState: PromptsState = {
  original: [],
  prompts: [],
};

const promptsSlice = createSlice({
  name: "prompts",
  initialState,
  reducers: {
    setPrompts(state, action: PayloadAction<string[]>) {
      state.original = action.payload;
      state.prompts = action.payload;
    },
    updatePrompt(state, action: PayloadAction<{ index: number; value: string }>) {
      state.prompts[action.payload.index] = action.payload.value;
    },
    resetPrompts(state) {
      state.prompts = [...state.original];
    },
    clearPrompts(state) {
      state.original = [];
      state.prompts = [];
    },
  },
});

export const { setPrompts, updatePrompt, resetPrompts, clearPrompts } = promptsSlice.actions;
export default promptsSlice.reducer;
