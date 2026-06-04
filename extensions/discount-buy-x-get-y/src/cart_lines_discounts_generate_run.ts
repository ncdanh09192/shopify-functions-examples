/**
 * Buy X Get Y — Shopify Discount Function
 *
 * When a customer adds X items tagged "bxgy-eligible" to their cart,
 * the Y cheapest eligible items are discounted 100% (free).
 *
 * Config metafield (namespace: "buy-x-get-y", key: "config"):
 *   { "buyQty": 3, "getQty": 1 }
 *
 * How to tag products: Shopify Admin → Product → Tags → add "bxgy-eligible"
 */

import {
  DiscountClass,
  ProductDiscountSelectionStrategy,
  CartInput,
  CartLinesDiscountsGenerateRunResult,
} from '../generated/api';

type Config = {
  buyQty: number;
  getQty: number;
};

const DEFAULT_CONFIG: Config = { buyQty: 3, getQty: 1 };

export function cartLinesDiscountsGenerateRun(
  input: CartInput,
): CartLinesDiscountsGenerateRunResult {
  const noDiscount: CartLinesDiscountsGenerateRunResult = { operations: [] };

  // Only run when the discount node has a Product discount class
  const hasProductDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Product,
  );
  if (!hasProductDiscountClass) return noDiscount;

  // Read config from metafield, fall back to defaults if missing or invalid
  let config: Config = DEFAULT_CONFIG;
  try {
    if (input.discount.metafield?.value) {
      config = JSON.parse(input.discount.metafield.value) as Config;
    }
  } catch {
    // Invalid JSON — use default config
  }

  const { buyQty, getQty } = config;

  // Filter lines that are ProductVariants with the "bxgy-eligible" tag
  const eligibleLines = input.cart.lines.filter((line) => {
    if (line.merchandise.__typename !== 'ProductVariant') return false;
    return line.merchandise.product.hasAnyTag;
  });

  const totalEligibleQty = eligibleLines.reduce(
    (sum, line) => sum + line.quantity,
    0,
  );

  // Each BXGY set consumes (buyQty + getQty) items
  const freeSetCount = Math.floor(totalEligibleQty / (buyQty + getQty));
  if (freeSetCount === 0) return noDiscount;

  // Sort ascending by unit price — cheapest items get the free discount
  const sortedLines = [...eligibleLines].sort((a, b) => {
    const priceA = parseFloat(a.cost.amountPerQuantity.amount);
    const priceB = parseFloat(b.cost.amountPerQuantity.amount);
    return priceA - priceB;
  });

  // Total free items = number of completed sets × getQty
  const freeItemCount = freeSetCount * getQty;
  const discountedLines = sortedLines.slice(0, freeItemCount);

  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates: [
            {
              message: `Buy ${buyQty} Get ${getQty} Free`,
              targets: discountedLines.map((line) => ({
                cartLine: {
                  id: line.id,
                  quantity: Math.min(line.quantity, getQty),
                },
              })),
              value: {
                percentage: { value: 100 },
              },
            },
          ],
          selectionStrategy: ProductDiscountSelectionStrategy.First,
        },
      },
    ],
  };
}
