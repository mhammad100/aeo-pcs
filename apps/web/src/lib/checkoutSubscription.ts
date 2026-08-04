import { COPY } from "@aeo-pcs/shared";
import { api } from "@/lib/api";
import { openRazorpayCheckout } from "@/lib/razorpay";
import type { SubscriptionInfo } from "@aeo-pcs/shared";

export const CHECKOUT_DISMISSED = COPY.billing.checkoutDismissed;

/**
 * Runs stub activate or payment checkout for a plan.
 * Resolves with the updated subscription when payment succeeds (or stub completes).
 */
export async function checkoutPlan(planId: string): Promise<SubscriptionInfo> {
  const result = await api.checkoutSubscription(planId);

  if (result.mode === "stub") {
    return result.subscription;
  }

  const key =
    result.keyId ||
    (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID : "") ||
    "";

  return new Promise<SubscriptionInfo>((resolve, reject) => {
    void openRazorpayCheckout({
      key,
      subscription_id: result.razorpaySubscriptionId,
      name: "Master AEO",
      description: result.planName,
      theme: { color: "#C45C26" },
      handler: (response) => {
        void (async () => {
          try {
            const verified = await api.verifyCheckout({
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySubscriptionId: response.razorpay_subscription_id,
              razorpaySignature: response.razorpay_signature,
            });
            resolve(verified.subscription);
          } catch (err) {
            reject(err);
          }
        })();
      },
      modal: {
        ondismiss: () => {
          reject(new Error(CHECKOUT_DISMISSED));
        },
      },
    }).catch(reject);
  });
}
