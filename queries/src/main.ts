import { open } from "sqlite";
import * as sqlite3 from "sqlite3";

import { getPendingOrders } from "./queries/order_queries";
import { createSchema } from "./schema";
import { getOrderAlertsChannel, sendSlackMessage } from "./slack";

function formatPendingOrderAlertMessage(overdueOrders: {
  orderNumber: string;
  customerName: string;
  phone: string | null;
  pendingDays: number;
}[]): string {
  const lines = overdueOrders.map(
    (order) =>
      `- ${order.customerName} | ${order.phone ?? "No phone on file"} | ${order.orderNumber} | ${order.pendingDays} days pending`
  );

  return [
    `Pending order follow-up needed: ${overdueOrders.length} order(s) are more than 3 days old.`,
    ...lines,
  ].join("\n");
}

async function main() {
  const db = await open({
    filename: "ecommerce.db",
    driver: sqlite3.Database,
  });

  try {
    await createSchema(db, false);

    const overduePendingOrders = await getPendingOrders(db);

    if (overduePendingOrders.length === 0) {
      return;
    }

    await sendSlackMessage({
      channel: getOrderAlertsChannel(),
      text: formatPendingOrderAlertMessage(overduePendingOrders),
    });
  } finally {
    await db.close();
  }
}

main().catch((error: unknown) => {
  console.error("Daily pending-order alert job failed.", error);
  process.exitCode = 1;
});
