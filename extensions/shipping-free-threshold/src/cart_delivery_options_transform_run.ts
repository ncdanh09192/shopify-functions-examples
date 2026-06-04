/**
 * Free Shipping Threshold — Shopify Delivery Customization Function
 *
 * When the cart subtotal reaches the configured threshold,
 * all paid shipping options are hidden and the free shipping option
 * is renamed to a custom merchant-defined title.
 *
 * Config metafield (namespace: "$app:shipping-free-threshold", key: "function-configuration"):
 *   { "threshold": 100, "freeShippingTitle": "🎉 Free Shipping" }
 *
 * Behavior:
 *   - subtotal >= threshold → hide paid rates, rename free rate
 *   - subtotal < threshold  → no changes, all options remain visible
 */

import type {
  CartDeliveryOptionsTransformRunInput,
  CartDeliveryOptionsTransformRunResult,
} from "../generated/api";

const NO_CHANGES: CartDeliveryOptionsTransformRunResult = { operations: [] };

type Configuration = {
  threshold: number;
  freeShippingTitle: string;
};

const DEFAULT_CONFIG: Configuration = {
  threshold: 100,
  freeShippingTitle: "Free Shipping",
};

export function cartDeliveryOptionsTransformRun(
  input: CartDeliveryOptionsTransformRunInput
): CartDeliveryOptionsTransformRunResult {
  // Merge metafield config over defaults (metafield values take precedence)
  const config: Configuration = {
    ...DEFAULT_CONFIG,
    ...(input?.deliveryCustomization?.metafield?.jsonValue ?? {}),
  };

  const subtotal = parseFloat(input.cart.cost.subtotalAmount.amount);

  // Subtotal has not reached the threshold — leave all options unchanged
  if (subtotal < config.threshold) return NO_CHANGES;

  // Collect all delivery options across all delivery groups
  const allOptions = input.cart.deliveryGroups.flatMap(
    (group) => group.deliveryOptions
  );

  if (allOptions.length === 0) return NO_CHANGES;

  const operations: CartDeliveryOptionsTransformRunResult["operations"] = [];

  for (const option of allOptions) {
    const isFree = parseFloat(option.cost.amount) === 0;

    if (isFree) {
      // Rename the free option so merchants can customize the label
      operations.push({
        deliveryOptionRename: {
          deliveryOptionHandle: option.handle,
          title: config.freeShippingTitle,
        },
      });
    } else {
      // Hide all paid shipping options
      operations.push({
        deliveryOptionHide: {
          deliveryOptionHandle: option.handle,
        },
      });
    }
  }

  return { operations };
}
