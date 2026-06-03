/**
 * Buy X Get Y — Shopify Discount Function
 *
 * Logic: Khi customer mua đủ X items có tag "bxgy-eligible",
 *        Y items rẻ nhất sẽ được miễn phí (100% discount).
 *
 * Config metafield (namespace: "buy-x-get-y", key: "config"):
 *   { "buyQty": 3, "getQty": 1 }
 *
 * Cách set tag: Shopify Admin → Product → Tags → thêm "bxgy-eligible"
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

  // Chỉ chạy nếu discount có class Product
  const hasProductDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Product,
  );
  if (!hasProductDiscountClass) return noDiscount;

  // Đọc config từ metafield, fallback về default
  let config: Config = DEFAULT_CONFIG;
  try {
    if (input.discount.metafield?.value) {
      config = JSON.parse(input.discount.metafield.value) as Config;
    }
  } catch {
    // metafield không parse được → dùng default
  }

  const { buyQty, getQty } = config;

  // Lọc eligible lines (có tag "bxgy-eligible" và là ProductVariant)
  const eligibleLines = input.cart.lines.filter((line) => {
    if (line.merchandise.__typename !== 'ProductVariant') return false;
    return line.merchandise.product.hasAnyTag;
  });

  const totalEligibleQty = eligibleLines.reduce(
    (sum, line) => sum + line.quantity,
    0,
  );

  // Cần đủ (buyQty + getQty) items mới kích hoạt discount
  const freeSetCount = Math.floor(totalEligibleQty / (buyQty + getQty));
  if (freeSetCount === 0) return noDiscount;

  // Sort by price ascending → free items rẻ nhất (standard BXGY behavior)
  const sortedLines = [...eligibleLines].sort((a, b) => {
    const priceA = parseFloat(a.cost.amountPerQuantity.amount);
    const priceB = parseFloat(b.cost.amountPerQuantity.amount);
    return priceA - priceB;
  });

  // Số items được free = freeSetCount * getQty
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