import type { AppDispatch } from "@/store";
import { persistor } from "@/store";
import { logout } from "@/store/authSlice";
import { clearBusiness } from "@/store/businessSlice";
import { clearPrompts } from "@/store/promptsSlice";
import { resetVisibility } from "@/store/visibilitySlice";

export function logoutAndReset() {
  return async (dispatch: AppDispatch) => {
    dispatch(logout());
    dispatch(clearBusiness());
    dispatch(clearPrompts());
    dispatch(resetVisibility());
    await persistor.purge();
  };
}
