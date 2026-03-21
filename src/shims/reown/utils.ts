type FeatureMap = {
  email?: boolean;
  socials?: unknown[];
};

type ConnectorLike = {
  id?: string;
};

export const WalletUtil = {
  getConnectOrderMethod(features: FeatureMap = {}, connectors: ConnectorLike[] = []) {
    const order: string[] = [];

    if (features.email) order.push("email");
    if (Array.isArray(features.socials) && features.socials.length > 0) {
      order.push("social");
    }
    if (connectors.length > 0) order.push("wallet");

    return order;
  },
};
