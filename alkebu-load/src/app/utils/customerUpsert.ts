import crypto from 'crypto'

type OrderShape = {
  customer?: { email?: string } | string | number | null
  guestEmail?: string | null
  shippingAddress?: {
    firstName?: string
    lastName?: string
    company?: string
    street?: string
    street2?: string
    city?: string
    state?: string
    zip?: string
    country?: string
    phone?: string
  } | null
}

type PayloadLike = {
  find: (args: { collection: string; where: unknown; limit?: number }) => Promise<{
    docs: Array<{ id: number | string }>
    totalDocs: number
  }>
  create: (args: {
    collection: string
    data: Record<string, unknown>
    disableVerificationEmail?: boolean
  }) => Promise<{ id: number | string }>
}

function pickEmail(order: OrderShape): string | null {
  if (order.guestEmail) return order.guestEmail
  if (typeof order.customer === 'object' && order.customer?.email) return order.customer.email
  return null
}

export async function upsertCustomerForOrder(
  payload: PayloadLike,
  order: OrderShape,
): Promise<number | string | null> {
  const emailRaw = pickEmail(order)
  if (!emailRaw) return null
  const email = emailRaw.trim().toLowerCase()

  const found = await payload.find({
    collection: 'customers',
    where: { email: { equals: email } },
    limit: 1,
  })
  if (found.docs.length > 0) {
    return found.docs[0].id
  }

  const ship = order.shippingAddress ?? {}
  // Random password — ghost rows cannot log in until they claim the account
  // through the self-registration flow (planned). The password is opaque and
  // exists only because auth-enabled collections require one at create time.
  const password = crypto.randomBytes(32).toString('hex')

  const created = await payload.create({
    collection: 'customers',
    disableVerificationEmail: true,
    data: {
      email,
      password,
      firstName: ship.firstName || 'Customer',
      lastName: ship.lastName || '',
      source: 'ecom',
      lifecycleStatus: 'ghost',
      shippingAddresses: ship.street
        ? [
            {
              label: 'Shipping',
              isDefault: true,
              firstName: ship.firstName || 'Customer',
              lastName: ship.lastName || '',
              company: ship.company,
              street: ship.street,
              street2: ship.street2,
              city: ship.city,
              state: ship.state,
              zip: ship.zip,
              country: ship.country,
              phone: ship.phone,
            },
          ]
        : undefined,
    },
  })

  return created.id
}
