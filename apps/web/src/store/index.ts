import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage";
import businessReducer from "./businessSlice";
import promptsReducer from "./promptsSlice";
import visibilityReducer from "./visibilitySlice";

const rootReducer = combineReducers({
  business: businessReducer,
  prompts: promptsReducer,
  visibility: visibilityReducer,
});

const persistConfig = {
  key: "aeo-pcs",
  storage,
  whitelist: ["business", "prompts", "visibility"],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
