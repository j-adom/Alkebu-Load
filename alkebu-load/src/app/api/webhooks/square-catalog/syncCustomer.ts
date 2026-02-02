// webhooks/square/syncCustomer.ts
import type { Payload } from 'payload';

interface SquareCustomerWebhook {
  type: 'customer.created' | 'customer.updated';
  data: {
    id: string;
    email_address?: string;
    given_name?: string;
    family_name?: string;
    phone_number?: string;
  };
}

export async function syncSquareCustomer(
  payload: Payload,
  webhookData: SquareCustomerWebhook
) {
  const { type, data } = webhookData;
  
  // Skip if no email (can't create Payload user without email)
  if (!data.email_address) {
    console.log(`Skipping Square customer ${data.id} - no email address`);
    return;
  }
  
  try {
    // Check if user already exists (by email OR Square ID)
    const existingUsers = await payload.find({
      collection: 'users',
      where: {
        or: [
          { email: { equals: data.email_address } },
          { 'square.customerId': { equals: data.id } },
        ],
      },
      limit: 1,
    });
    
    if (existingUsers.docs.length > 0) {
      // UPDATE existing user
      const user = existingUsers.docs[0];
      
      await payload.update({
        collection: 'users',
        id: user.id,
        data: {
          firstName: data.given_name || user.firstName,
          lastName: data.family_name || user.lastName,
          phone: data.phone_number || user.phone,
          square: {
            customerId: data.id,
            lastSync: new Date(),
          },
          // Update source if needed
          source: user.source === 'online' ? 'both' : 'in-store',
        },
      });
      
      console.log(`Updated user ${user.email} from Square webhook`);
    } else {
      // CREATE new user
      const newUser = await payload.create({
        collection: 'users',
        data: {
          email: data.email_address,
          firstName: data.given_name,
          lastName: data.family_name,
          phone: data.phone_number,
          square: {
            customerId: data.id,
            lastSync: new Date(),
          },
          source: 'in-store',
          role: 'customer',
          emailVerified: false, // They'll need to verify when they log in online
        },
      });
      
      console.log(`Created new user ${newUser.email} from Square webhook`);
    }
  } catch (error) {
    console.error(`Error syncing Square customer ${data.id}:`, error);
    throw error; // Re-throw so Square knows to retry
  }
}