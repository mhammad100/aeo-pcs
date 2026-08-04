import crypto from "crypto";
import Razorpay from "razorpay";
import { COPY } from "@aeo-pcs/shared";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

let client: Razorpay | null = null;

export function isRazorpayConfigured() {
  return Boolean(env.razorpayKeyId && env.razorpayKeySecret);
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

export async function ensureRazorpayCustomer(input: {
  existingCustomerId?: string;
  name: string;
  email: string;
  notes?: Record<string, string>;
}): Promise<string> {
  if (input.existingCustomerId) return input.existingCustomerId;

  const rzp = getClient();
  const customer = (await rzp.customers.create({
    name: input.name.slice(0, 50) || input.email,
    email: input.email,
    fail_existing: 0,
    notes: input.notes,
  } as Parameters<typeof rzp.customers.create>[0])) as { id: string };
  return String(customer.id);
}

export async function createRazorpaySubscription(input: {
  planId: string;
  customerId: string;
  totalCount?: number;
  notes?: Record<string, string>;
}) {
  const rzp = getClient();
  // customer_id is supported by the API but missing from the SDK request typings.
  const subscription = (await rzp.subscriptions.create({
    plan_id: input.planId,
    customer_id: input.customerId,
    total_count: input.totalCount ?? 120,
    quantity: 1,
    customer_notify: 1,
    notes: input.notes,
  } as Parameters<typeof rzp.subscriptions.create>[0])) as { id: string };
  return subscription;
}

export async function cancelRazorpaySubscription(
  razorpaySubscriptionId: string,
  cancelAtCycleEnd: boolean
) {
  const rzp = getClient();
  return rzp.subscriptions.cancel(razorpaySubscriptionId, cancelAtCycleEnd);
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
    throw new AppError(COPY.billing.paymentInvalid, 400);
  }
}

export function unixToDate(seconds?: number | null): Date | null {
  if (seconds == null || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000);
}
