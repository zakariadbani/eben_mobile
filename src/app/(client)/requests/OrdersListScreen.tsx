import React from "react";
import { Redirect } from "expo-router";

export default function OrdersListRedirect(): React.ReactElement {
  return <Redirect href="/(client)/settings/orders" />;
}
