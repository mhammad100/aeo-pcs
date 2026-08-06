import crypto from "crypto";
import Razorpay from "razorpay";
import { COPY } from "@aeo-pcs/shared";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

let client: Razorpay | null = null;

export function isRazorpayConfigured() {
  return Boolean(env.razorpayKeyId && env.razorpayKeySecret);
}

/** Extract a readable message from Razorpay SDK errors (often plain objects, not Error). */
export function getRazorpayErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as {
      error?: { description?: string; code?: string; field?: string; reason?: string };
      message?: string;
      statusCode?: number;
    };
    if (e.error?.description) {
      const parts = [
        e.error.code,
        e.error.description,
        e.error.field ? `field=${e.error.field}` : "",
        e.error.reason ? `reason=${e.error.reason}` : "",
      ].filter(Boolean);
      return parts.join(" | ");
    }
    if (typeof e.message === "string" && e.message.trim()) return e.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return "Unknown error";
}

export function logRazorpayError(context: string, err: unknown) {
  console.error(`[razorpay] ${context}: ${getRazorpayErrorMessage(err)}`, err);
}

function getClient() {
  if (!isRazorpayConfigured()) {
    throw new AppError(COPY.billing.billingUnavailable, 503);
  }
  if (!client) {
    client = new Razorpay({
      key_id: env.razorpayKeyId,
      key_secret: env.razorpayKeySecret,
    });
  }
  return client;
}

function throwPublicBillingError(context: string, err: unknown): never {
  if (err instanceof AppError) throw err;
  logRazorpayError(context, err);
  throw new AppError(COPY.billing.billingUnavailable, 502);
}

export async function ensureRazorpayCustomer(input: {
  existingCustomerId?: string;
  name: string;
  email: string;
  notes?: Record<string, string>;
}): Promise<string> {
  if (input.existingCustomerId) return input.existingCustomerId;

  try {
    const rzp = getClient();
    const customer = (await rzp.customers.create({
      name: input.name.slice(0, 50) || input.email,
      email: input.email,
      fail_existing: 0,
      notes: input.notes,
    } as Parameters<typeof rzp.customers.create>[0])) as { id: string };
    return String(customer.id);
  } catch (err) {
    throwPublicBillingError("customers.create", err);
  }
}

export async function createRazorpaySubscription(input: {
  planId: string;
  totalCount?: number;
  notes?: Record<string, string>;
}) {
  try {
    const rzp = getClient();
    // Do not pass customer_id — Razorpay docs: customer is linked after authorisation payment.
    // Extra fields on create are rejected (400 Validation failed).
    const subscription = await rzp.subscriptions.create({
      plan_id: input.planId,
      total_count: input.totalCount ?? 120,
      quantity: 1,
      customer_notify: true,
      notes: input.notes,
    });
    return subscription as { id: string; customer_id?: string | null };
  } catch (err) {
    throwPublicBillingError("subscriptions.create", err);
  }
}

export async function fetchRazorpaySubscription(razorpaySubscriptionId: string) {
  try {
    const rzp = getClient();
    return (await rzp.subscriptions.fetch(razorpaySubscriptionId)) as {
      id: string;
      customer_id?: string | null;
      status?: string;
    };
  } catch (err) {
    throwPublicBillingError("subscriptions.fetch", err);
  }
}

export async function cancelRazorpaySubscription(
  razorpaySubscriptionId: string,
  cancelAtCycleEnd: boolean
) {
  try {
    const rzp = getClient();
    return await rzp.subscriptions.cancel(razorpaySubscriptionId, cancelAtCycleEnd);
  } catch (err) {
    throwPublicBillingError("subscriptions.cancel", err);
  }
}

/** Convert major-unit price (e.g. 999.5) to Razorpay subunit amount (paise/cents). */
export function toRazorpayAmount(price: number): number {
  return Math.round(Number(price) * 100);
}

export async function createRazorpayPlan(input: {
  name: string;
  amountMajor: number;
  currency: string;
  billingPeriod: "monthly" | "yearly";
  notes?: Record<string, string>;
}): Promise<string> {
  try {
    const rzp = getClient();
    const plan = (await rzp.plans.create({
      period: input.billingPeriod,
      interval: 1,
      item: {
        name: input.name.slice(0, 255),
        amount: toRazorpayAmount(input.amountMajor),
        currency: input.currency.toUpperCase(),
        description: `${input.name} (${input.billingPeriod})`,
      },
      notes: input.notes,
    })) as { id: string };
    return String(plan.id);
  } catch (err) {
    if (err instanceof AppError) throw err;
    logRazorpayError("plans.create", err);
    // Admin-facing: include provider detail so operators can fix currency/keys/etc.
    throw new AppError(`Could not create payment plan: ${getRazorpayErrorMessage(err)}`, 502);
  }
}

/** Schedule an existing subscription onto a new Razorpay plan at the end of the current cycle. */
export async function updateRazorpaySubscriptionPlanAtCycleEnd(
  razorpaySubscriptionId: string,
  newRazorpayPlanId: string
) {
  try {
    const rzp = getClient();
    return await rzp.subscriptions.update(razorpaySubscriptionId, {
      plan_id: newRazorpayPlanId,
      schedule_change_at: "cycle_end",
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    logRazorpayError(`subscriptions.update(${razorpaySubscriptionId})`, err);
    throw err;
  }
}

export function verifyWebhookSignature(rawBody: Buffer | string, signature: string) {
  if (!env.razorpayWebhookSecret) {
    throw new AppError(COPY.billing.billingUnavailable, 503);
  }
  const expected = crypto
    .createHmac("sha256", env.razorpayWebhookSecret)
    .update(typeof rawBody === "string" ? rawBody : rawBody)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature || "");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    console.error("[razorpay] webhook signature mismatch");
    throw new AppError("Invalid webhook signature", 400);
  }
}

export function verifySubscriptionPaymentSignature(input: {
  paymentId: string;
  subscriptionId: string;
  signature: string;
}) {
  if (!env.razorpayKeySecret) {
    throw new AppError(COPY.billing.billingUnavailable, 503);
  }
  const body = `${input.paymentId}|${input.subscriptionId}`;
  const expected = crypto
    .createHmac("sha256", env.razorpayKeySecret)
    .update(body)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(input.signature || "");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    console.error("[razorpay] payment signature mismatch", {
      subscriptionId: input.subscriptionId,
    });
    throw new AppError(COPY.billing.paymentInvalid, 400);
  }
}

export function unixToDate(seconds?: number | null): Date | null {
  if (seconds == null || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000);
}
