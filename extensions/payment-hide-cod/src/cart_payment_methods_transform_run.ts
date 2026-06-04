/**
 * Hide Cash on Delivery — Shopify Payment Customization Function
 *
 * Conditionally hides payment methods (e.g. COD) based on:
 *   1. Shipping country — hide COD for orders shipping to blocked countries
 *   2. Cart value — hide COD when subtotal exceeds a maximum amount
 *
 * Either condition alone is enough to trigger the hide.
 * If no shipping address is entered yet, the function does nothing.
 *
 * Config metafield (namespace: "$app:payment-hide-cod", key: "function-configuration"):
 *   {
 *     "hiddenPaymentNames": ["Cash on Delivery (COD)"],
 *     "blockedCountries": ["US", "CA", "GB"],
 *     "maxCartAmount": 500
 *   }
 *
 * hiddenPaymentNames: partial, case-insensitive match against payment method name
 * blockedCountries:   ISO 3166-1 alpha-2 country codes
 * maxCartAmount:      hide COD when subtotal >= this value (null = no limit)
 */

import type {
  CartPaymentMethodsTransformRunInput,
  CartPaymentMethodsTransformRunResult,
} from "../generated/api";

const NO_CHANGES: CartPaymentMethodsTransformRunResult = { operations: [] };

type Configuration = {
  hiddenPaymentNames: string[];
  blockedCountries: string[];
  maxCartAmount: number | null;
};

const DEFAULT_CONFIG: Configuration = {
  hiddenPaymentNames: ["cash on delivery", "cod"],
  blockedCountries: [],
  maxCartAmount: null,
};

export function cartPaymentMethodsTransformRun(
  input: CartPaymentMethodsTransformRunInput
): CartPaymentMethodsTransformRunResult {
  // Parse metafield config, fall back to defaults
  let config: Configuration = DEFAULT_CONFIG;
  try {
    const raw = input?.paymentCustomization?.metafield?.value;
    if (raw) config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    // Invalid JSON — use default config
  }

  // Normalize name patterns to lowercase for case-insensitive matching
  const namePatternsLower = config.hiddenPaymentNames.map((n) =>
    n.toLowerCase()
  );

  // Get shipping country from the first delivery group (null if not entered yet)
  const shippingCountry =
    input.cart.deliveryGroups[0]?.deliveryAddress?.countryCode ?? null;

  const subtotal = parseFloat(input.cart.cost.subtotalAmount.amount);

  // Determine which hide conditions are active
  const countryBlocked =
    shippingCountry !== null &&
    config.blockedCountries.includes(String(shippingCountry));

  const amountExceeded =
    config.maxCartAmount !== null && subtotal >= config.maxCartAmount;

  // Neither condition triggered — leave all payment methods unchanged
  if (!countryBlocked && !amountExceeded) return NO_CHANGES;

  // Find payment methods whose name matches any of the configured patterns
  const methodsToHide = input.paymentMethods.filter((method) => {
    const nameLower = method.name.toLowerCase();
    return namePatternsLower.some((pattern) => nameLower.includes(pattern));
  });

  if (methodsToHide.length === 0) return NO_CHANGES;

  return {
    operations: methodsToHide.map((method) => ({
      paymentMethodHide: {
        paymentMethodId: method.id,
      },
    })),
  };
}
