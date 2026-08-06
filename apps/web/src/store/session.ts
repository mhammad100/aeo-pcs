import type { AppDispatch } from "@/store";
import { persistor } from "@/store";
import { revokeServerSession } from "@/lib/authSession";
import { logout } from "@/store/authSlice";
import { clearBusiness } from "@/store/businessSlice";
import { clearPrompts } from "@/store/promptsSlice";
import { resetVisibility } from "@/store/visibilitySlice";

type LogoutOptions = {
  /** When false, only clear local state (e.g. after SESSION_REVOKED or expired token). */
  revokeServer?: boolean;
};

export function logoutAndReset(options: LogoutOptions = {}) {
  const revokeServer = options.revokeServer !== false;

  return async (dispatch: AppDispatch) => {
    if (revokeServer) {
      await revokeServerSession();
    }
    dispatch(logout());
    dispatch(clearBusiness());
    dispatch(clearPrompts());
    dispatch(resetVisibility());
    await persistor.purge();
  };
}
