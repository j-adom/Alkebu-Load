// webhooks/square/syncLoyalty.ts
import type { Payload } from 'payload';

interface SquareLoyaltyWebhook {
  type: 'loyalty.account.updated';
  data: {
    id: string; // Loyalty account ID
    customer_id: string; // Square customer ID
    balance: number;
    lifetime_spend_money?: {
      amount: number;
      currency: string;
    };
  };
}

export async function syncSquareLoyalty(
  payload: Payload,
  webhookData: SquareLoyaltyWebhook
) {
  const { data } = webhookData;

  try {
    // Find user by Square customer ID
    const users = await payload.find({
      collection: 'users',
      where: {
        'square.customerId': {
          equals: data.customer_id,
        },
      },
      limit: 1,
    });

    if (users.docs.length === 0) {
      console.log(`No user found for Square customer ${data.customer_id}`);
      return;
    }

    const user = users.docs[0];

    // Update loyalty points
    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        loyaltyPoints: data.balance,
        square: {
          ...user.square,
          loyaltyId: data.id,
          lastSync: new Date().toISOString(),
        },
      },
    });

    console.log(`Updated loyalty points for ${user.email}: ${data.balance} points`);
  } catch (error) {
    console.error(`Error syncing loyalty for customer ${data.customer_id}:`, error);
    throw error;
  }
}