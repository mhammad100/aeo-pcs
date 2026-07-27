import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type PromptsState = {
  prompts: string[];
};

const initialState: PromptsState = {
  prompts: [],
};

const promptsSlice = createSlice({
  name: "prompts",
  initialState,
  reducers: {
    setPrompts(state, action: PayloadAction<string[]>) {
      state.prompts = action.payload;
    },
    updatePrompt(state, action: PayloadAction<{ index: number; value: string }>) {
      state.prompts[action.payload.index] = action.payload.value;
    },
    clearPrompts(state) {
      state.prompts = [];
    },
  },
});

export const { setPrompts, updatePrompt, clearPrompts } = promptsSlice.actions;
export default promptsSlice.reducer;
