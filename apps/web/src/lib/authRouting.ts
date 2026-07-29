import { api } from "@/lib/api";
import type { AuthUser } from "@aeo-pcs/shared";
import { hasEntitledSubscription } from "@aeo-pcs/shared";

export { hasEntitledSubscription as hasActiveSubscription };

export async function resolvePostAuthPath(user?: AuthUser | null): Promise<string> {
  try {
    const { subscription } = await api.getMySubscription();
    if (!hasEntitledSubscription(subscription)) {
      return "/app/onboarding/plan";
    }
  } catch {
    return "/app/onboarding/plan";
  }

  if (!user?.business?.profileCompletedAt) {
    return "/app/onboarding/profile";
  }

  return "/app";
}
