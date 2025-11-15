export const PRODUCT_IDS = {
  free: "record_demos_free",
  pro: "record_demos_pro",
} as const;

export type PlanId = keyof typeof PRODUCT_IDS;

export const getProductId = (key: PlanId): string => {
  return PRODUCT_IDS[key];
};

export const getProductKey = (id: string): PlanId | null => {
  const entry = Object.entries(PRODUCT_IDS).find(([, value]) => value === id);
  return entry ? (entry[0] as PlanId) : null;
};
