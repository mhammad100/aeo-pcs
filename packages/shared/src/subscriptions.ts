import type { SubscriptionStatus } from "./types";

export const ENTITLED_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ["active", "trialing"];

export function hasEntitledSubscription(subscription: {
  plan: unknown | null;
  status: SubscriptionStatus | string;
  currentPeriodEnd?: string;
}): boolean {
  if (
    !subscription.plan ||
    !ENTITLED_SUBSCRIPTION_STATUSES.includes(subscription.status as SubscriptionStatus)
  ) {
    return false;
  }
  if (subscription.currentPeriodEnd) {
    const end = new Date(subscription.currentPeriodEnd).getTime();
    if (Number.isFinite(end) && end <= Date.now()) return false;
  }
  return true;
}
