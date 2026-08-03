import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { BusinessCandidate } from "@aeo-pcs/shared";

type BusinessState = {
  city: string;
  country: string;
  selected: BusinessCandidate | null;
  category: string;
  websiteUrl: string;
  profileLoaded: boolean;
};

const initialState: BusinessState = {
  city: "",
  country: "",
  selected: null,
  category: "",
  websiteUrl: "",
  profileLoaded: false,
};

const businessSlice = createSlice({
  name: "business",
  initialState,
  reducers: {
    hydrateFromProfile(
      state,
      action: PayloadAction<{
        name: string;
        category: string;
        city: string;
        country: string;
        description?: string;
        customCategory?: string;
        nameAliases?: string[];
        targetLocations?: string[];
        targetItems?: string[];
        websiteUrl?: string;
      }>
    ) {
      const p = action.payload;
      state.selected = {
        name: p.name,
        category: p.category || "Other",
        address: [p.city, p.country].filter(Boolean).join(", "),
        description: p.description || "",
        customCategory: p.customCategory,
        nameAliases: p.nameAliases || [],
        targetLocations: p.targetLocations || [],
        targetItems: p.targetItems || [],
      };
      state.category = p.category || "Other";
      state.city = p.city || "";
      state.country = p.country || "";
      state.websiteUrl = p.websiteUrl || "";
      state.profileLoaded = true;
    },
    setCategory(state, action: PayloadAction<string>) {
      state.category = action.payload;
      if (state.selected) {
        state.selected.category = action.payload;
      }
    },
    clearBusiness(state) {
      Object.assign(state, initialState);
    },
  },
});

export const { hydrateFromProfile, setCategory, clearBusiness } = businessSlice.actions;

export default businessSlice.reducer;
