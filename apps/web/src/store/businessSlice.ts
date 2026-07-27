import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { BusinessCandidate } from "@aeo-pcs/shared";

type BusinessState = {
  nameQuery: string;
  city: string;
  country: string;
  candidates: BusinessCandidate[];
  selected: BusinessCandidate | null;
  category: string;
};

const initialState: BusinessState = {
  nameQuery: "",
  city: "Ahmedabad",
  country: "India",
  candidates: [],
  selected: null,
  category: "",
};

const businessSlice = createSlice({
  name: "business",
  initialState,
  reducers: {
    setNameQuery(state, action: PayloadAction<string>) {
      state.nameQuery = action.payload;
    },
    setCity(state, action: PayloadAction<string>) {
      state.city = action.payload;
    },
    setCountry(state, action: PayloadAction<string>) {
      state.country = action.payload;
    },
    setCandidates(state, action: PayloadAction<BusinessCandidate[]>) {
      state.candidates = action.payload;
    },
    setSelected(state, action: PayloadAction<BusinessCandidate | null>) {
      state.selected = action.payload;
    },
    setCategory(state, action: PayloadAction<string>) {
      state.category = action.payload;
    },
    resetBusinessDownstream(state) {
      state.candidates = [];
      state.selected = null;
      state.category = "";
    },
  },
});

export const {
  setNameQuery,
  setCity,
  setCountry,
  setCandidates,
  setSelected,
  setCategory,
  resetBusinessDownstream,
} = businessSlice.actions;

export default businessSlice.reducer;
