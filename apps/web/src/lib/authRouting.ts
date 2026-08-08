import type { AuthUser } from "@aeo-pcs/shared";
import { hasEntitledSubscription } from "@aeo-pcs/shared";

export { hasEntitledSubscription as hasActiveSubscription };

export async function resolvePostAuthPath(user?: AuthUser | null): Promise<string> {
  if (!user?.business?.profileCompletedAt) {
    return "/app/onboarding/profile";
  }
  return "/app";
}
