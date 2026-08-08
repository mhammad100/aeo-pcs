/** User-facing product copy — keep API errors and UI in sync. */
export const COPY = {
  auth: {
    sessionRevoked:
      "You were signed out because this account was used on another device.",
    sessionActive: "This account is already signed in on another device.",
    signInHereTitle: "Sign in on this device?",
    signInHereBody:
      "This account is already signed in somewhere else. Signing in here will sign you out on that device.",
    signInHereConfirm: "Sign in here",
    signInHereCancel: "Cancel",
    visibilityCheckRunningTitle: "A visibility check is still running",
    visibilityCheckRunningBody:
      "It will continue in the background. Open Visibility on this device to see progress or pick up where you left off.",
  },
  visibility: {
    inProgressTitle: "Visibility check in progress",
    inProgressDescription:
      "You can leave and come back anytime — progress is saved on your account. To stop early, use Cancel check (this still uses one of your monthly checks).",
    cancelConfirmTitle: "Cancel this visibility check?",
    cancelConfirmBody:
      "Stopping now won't refund a check — this still counts toward your monthly limit. You can start a new check when you're ready.",
    cancelConfirmOk: "Cancel check",
    cancelConfirmCancel: "Keep going",
    cancelledMessage:
      "Visibility check cancelled. This still counts toward your monthly limit.",
    alreadyInProgress:
      "You already have a visibility check in progress. Open the Visibility page to continue it.",
    cancelFailed: "Could not cancel check",
  },
  profile: {
    targetLocationsTooltip:
      "Areas where you want to appear in AI search results. Country is required; state and city are optional (country, country + state, or country + state + city). We use only these in visibility checks, not your registered business address.",
  },
  billing: {
    subscribeRequired: "Choose a plan to use this feature.",
    freeRunsExhausted:
      "You've used your free visibility check. Choose a plan to run more.",
    actionPlanRequiresPlan:
      "Action plans aren't included with free visibility checks. Choose a plan to unlock them.",
    planUnavailable:
      "This plan is no longer available. Please choose another plan.",
    planNotReady:
      "This plan isn't available for purchase yet. Please try another plan or contact support.",
    alreadyOnPlan: "You're already on this plan.",
    billingUnavailable:
      "Billing is temporarily unavailable. Please try again later or contact support.",
    checkoutRequired: "Complete checkout to activate your plan.",
    checkoutDismissed: "Checkout was closed before payment finished.",
    checkoutLoadFailed:
      "We couldn't open the payment window. Please refresh and try again.",
    paymentInvalid: "We couldn't verify this payment. Please try again or contact support.",
    subscribeSuccess: "Your plan is active.",
    planChangeSuccess: "Your plan has been updated.",
    cancelSuccess: "Your subscription is set to end at the close of the current billing period.",
    cancelNone: "You don't have an active subscription to cancel.",
    cancelConfirmTitle: "Cancel your subscription?",
    cancelConfirmBody:
      "You'll keep access until the end of your current billing period. After that, renewals stop and paid features will be unavailable until you choose a plan again.",
    cancelConfirmOk: "Cancel subscription",
    cancelConfirmKeep: "Keep subscription",
    cancelScheduled: (periodEnd: string) =>
      `Your subscription ends on ${periodEnd}. You'll keep access until then.`,
    periodEnds: (periodEnd: string) => `Current billing period ends ${periodEnd}.`,
    selectPlanPrompt: "Choose a plan to run visibility checks.",
    freeRunPrompt: (remaining: number, limit: number) =>
      remaining > 0
        ? `You have ${remaining} of ${limit} free visibility ${remaining === 1 ? "check" : "checks"} left.`
        : `You've used your ${limit} free visibility ${limit === 1 ? "check" : "checks"}. Choose a plan to continue.`,
    noPlans: "No plans are available right now. Please check back soon.",
    loadSubscriptionFailed: "We couldn't load your subscription. Please try again.",
    loadBillingFailed: "We couldn't load your billing history. Please try again.",
    updatePlanFailed: "We couldn't update your plan. Please try again.",
    cancelFailed: "We couldn't cancel your subscription. Please try again.",
    subscriptionNotFound: "We couldn't find that subscription.",
    invoiceEmpty: "No invoices yet.",
    paymentReference: "Payment reference",
  },
} as const;
