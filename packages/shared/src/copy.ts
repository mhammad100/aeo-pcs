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
      "Cities or areas where you want to appear in AI search results. Pick country, state, and city for each — we use only these in visibility checks, not your registered business address.",
  },
} as const;
