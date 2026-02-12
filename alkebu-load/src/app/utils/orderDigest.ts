import type { Payload } from 'payload';
import { sendDailyOrderDigest, type DailyDigestData } from './emailService';

/**
 * Generate and send daily outstanding orders digest email.
 * Called by Payload scheduled job at 7:00 AM CT (12:00 UTC).
 */
export async function generateDailyOrderDigest(payload: Payload): Promise<void> {
  try {
    const outstandingOrders = await payload.find({
      collection: 'orders',
      where: {
        status: {
          in: ['paid', 'processing'],
        },
      },
      sort: 'createdAt', // Oldest first
      limit: 100,
      depth: 1,
    });

    const now = Date.now();
    const orders = outstandingOrders.docs.map((order: any) => {
      const customerName = order.customer?.displayName
        || order.customer?.email
        || order.guestEmail
        || 'Guest';

      return {
        orderNumber: order.orderNumber,
        customerName,
        status: order.status,
        totalAmount: order.totalAmount,
        itemCount: order.items?.length || 0,
        createdAt: order.createdAt,
        ageHours: Math.round((now - new Date(order.createdAt).getTime()) / (1000 * 60 * 60)),
      };
    });

    const adminUrl = `${process.env.ORDER_ADMIN_BASE_URL || process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'}/admin/order-dashboard`;

    const digestData: DailyDigestData = {
      date: new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      orders,
      totalOrderCount: orders.length,
      totalRevenuePending: orders.reduce((sum, o) => sum + o.totalAmount, 0),
      adminUrl,
    };

    await sendDailyOrderDigest(digestData);
    console.log(`Daily digest: ${orders.length} orders needing attention, $${(digestData.totalRevenuePending / 100).toFixed(2)} pending`);
  } catch (error) {
    console.error('Error generating daily order digest:', error);
  }
}
