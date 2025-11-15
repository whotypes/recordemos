import { type Product } from "autumn-js";
import type { Customer } from "autumn-js/react";

export const getPricingTableContent = (
  product: Product,
  customer?: Customer | null,
) => {
  const { scenario, properties } = product;
  const { is_one_off, updateable, has_trial } = properties;

  if (has_trial) {
    return {
      buttonText: <p>Start Free Trial</p>,
    };
  }

  const isCustomerOnThisProduct =
    customer?.products?.some((p) => p.id === product.id) ?? false;

  switch (scenario) {
    case "scheduled":
      return {
        buttonText: <p>Plan Scheduled</p>,
      };

    case "active":
      if (updateable) {
        return {
          buttonText: <p>Update Plan</p>,
        };
      }

      return {
        buttonText: <p>Current Plan</p>,
      };

    case "new":
      if (is_one_off) {
        return {
          buttonText: <p>Purchase</p>,
        };
      }

      return {
        buttonText: <p>Get started</p>,
      };

    case "renew":
      return {
        buttonText: <p>Renew</p>,
      };

    case "upgrade":
      return {
        buttonText: <p>Upgrade</p>,
      };

    case "downgrade":
      return {
        buttonText: <p>Downgrade</p>,
      };

    case "cancel":
      if (isCustomerOnThisProduct) {
        return {
          buttonText: <p>Cancel Plan</p>,
        };
      }
      return {
        buttonText: <p>Get started</p>,
      };

    default:
      return {
        buttonText: <p>Get Started</p>,
      };
  }
};
