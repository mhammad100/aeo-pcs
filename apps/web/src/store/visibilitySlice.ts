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
        progress?: VisibilityJobProgress | null;
        results?: PromptResult[] | null;
        score?: VisibilityScore | null;
        plan?: ActionPlan | null;
        itemOutputs?: Record<string, string> | null;
        error?: string | null;
      }>
    ) {
      state.status = action.payload.status;
      if ("progress" in action.payload) {
        state.progress = action.payload.progress ?? null;
      }
      if ("results" in action.payload) {
        state.results = action.payload.results ?? null;
      }
      if ("score" in action.payload) {
        state.score = action.payload.score ?? null;
      }
      if ("plan" in action.payload) {
        const plan = action.payload.plan ?? null;
        const empty =
          !plan ||
          (!(plan.automatable?.length || 0) && !(plan.manual?.length || 0));
        state.plan = empty ? null : plan;
      }
      if ("itemOutputs" in action.payload) {
        state.itemOutputs = action.payload.itemOutputs || {};
      }
      if ("error" in action.payload) {
        state.error = action.payload.error || null;
      }
    },
    setPlan(state, action: PayloadAction<ActionPlan | null>) {
      const plan = action.payload;
      const empty =
        !plan ||
        (!(plan.automatable?.length || 0) && !(plan.manual?.length || 0));
      state.plan = empty ? null : plan;
      if (empty) state.itemOutputs = {};
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
