import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  ActionPlan,
  JobStatus,
  PromptResult,
  VisibilityJobProgress,
  VisibilityScore,
} from "@aeo-pcs/shared";

type VisibilityState = {
  jobId: string | null;
  status: JobStatus | null;
  progress: VisibilityJobProgress | null;
  results: PromptResult[] | null;
  score: VisibilityScore | null;
  plan: ActionPlan | null;
  itemOutputs: Record<string, string>;
  error: string | null;
  uiBusy: boolean;
  generatingItemId: string | null;
};

const initialState: VisibilityState = {
  jobId: null,
  status: null,
  progress: null,
  results: null,
  score: null,
  plan: null,
  itemOutputs: {},
  error: null,
  uiBusy: false,
  generatingItemId: null,
};

const visibilitySlice = createSlice({
  name: "visibility",
  initialState,
  reducers: {
    setUiBusy(state, action: PayloadAction<boolean>) {
      state.uiBusy = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    setJobId(state, action: PayloadAction<string | null>) {
      state.jobId = action.payload;
    },
    setJobSnapshot(
      state,
      action: PayloadAction<{
        status: JobStatus;
        progress?: VisibilityJobProgress;
        results?: PromptResult[];
        score?: VisibilityScore;
        plan?: ActionPlan;
        itemOutputs?: Record<string, string>;
        error?: string;
      }>
    ) {
      state.status = action.payload.status;
      if (action.payload.progress) state.progress = action.payload.progress;
      if (action.payload.results) state.results = action.payload.results;
      if (action.payload.score) state.score = action.payload.score;
      if (action.payload.plan) state.plan = action.payload.plan;
      if (action.payload.itemOutputs) state.itemOutputs = action.payload.itemOutputs;
      if (action.payload.error !== undefined) state.error = action.payload.error || null;
    },
    setPlan(state, action: PayloadAction<ActionPlan | null>) {
      state.plan = action.payload;
      if (!action.payload) state.itemOutputs = {};
    },
    setItemOutput(state, action: PayloadAction<{ id: string; content: string }>) {
      state.itemOutputs[action.payload.id] = action.payload.content;
    },
    setGeneratingItemId(state, action: PayloadAction<string | null>) {
      state.generatingItemId = action.payload;
    },
    resetVisibility() {
      return initialState;
    },
  },
});

export const {
  setUiBusy,
  setError,
  setJobId,
  setJobSnapshot,
  setPlan,
  setItemOutput,
  setGeneratingItemId,
  resetVisibility,
} = visibilitySlice.actions;

export default visibilitySlice.reducer;
