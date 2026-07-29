import type { SubscriptionStatus } from "./types";

export const ENTITLED_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ["active", "trialing"];

export function hasEntitledSubscription(subscription: {
  plan: unknown | null;
  status: SubscriptionStatus | string;
}): boolean {
  return (
    Boolean(subscription.plan) &&
    ENTITLED_SUBSCRIPTION_STATUSES.includes(subscription.status as SubscriptionStatus)
  );
}
