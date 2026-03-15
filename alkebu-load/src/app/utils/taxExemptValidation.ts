import type { Payload } from 'payload';

export type TaxExemptValidationResult = {
  valid: boolean;
  reason?: string;
};

type TaxExemptAccount = {
  taxExempt: boolean;
  institution?: number | string | Record<string, unknown> | null;
};

async function findUserAccount(
  payload: Payload,
  userId: number | string,
): Promise<TaxExemptAccount | null> {
  if (typeof payload.findByID !== 'function') {
    return null;
  }

  try {
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
      depth: 1,
    });

    if (!user) {
      return null;
    }

    return {
      taxExempt: Boolean((user as any).taxExempt),
      institution: (user as any).institution,
    };
  } catch {
    return null;
  }
}

async function findLegacyCustomerAccount(
  payload: Payload,
  userId: number | string,
): Promise<TaxExemptAccount | null> {
  if (typeof payload.find !== 'function') {
    return null;
  }

  const customers = await payload.find({
    collection: 'customers',
    where: {
      id: { equals: userId },
    },
    depth: 2,
  });

  if (!customers.docs.length) {
    return null;
  }

  const customer = customers.docs[0];

  return {
    taxExempt: Boolean((customer as any).accountStatus?.taxExempt),
    institution: (customer as any).accountStatus?.institution,
  };
}

export async function validateTaxExemptStatus(
  payload: Payload,
  userId: number | string | null | undefined,
  requestedTaxExempt: boolean,
): Promise<TaxExemptValidationResult> {
  if (!requestedTaxExempt) {
    return { valid: false };
  }

  if (!userId) {
    return { valid: false, reason: 'Guest users cannot claim tax-exempt status' };
  }

  const account =
    (await findUserAccount(payload, userId)) ||
    (await findLegacyCustomerAccount(payload, userId));

  if (!account) {
    return { valid: false, reason: 'Customer account not found' };
  }

  if (!account.taxExempt) {
    return { valid: false, reason: 'Customer is not marked as tax-exempt' };
  }

  if (account.institution) {
    const institution = typeof account.institution === 'object'
      ? account.institution
      : await payload.findByID({
        collection: 'institutional-accounts',
        id: account.institution,
      });

    if (!institution) {
      return { valid: false, reason: 'Linked institutional account not found' };
    }

    if (institution.status !== 'active') {
      return { valid: false, reason: 'Institutional account is not active' };
    }

    if (!institution.taxInfo?.taxExempt) {
      return { valid: false, reason: 'Institutional account is not tax-exempt' };
    }

    if (institution.taxInfo?.exemptionValidUntil) {
      const expirationDate = new Date(institution.taxInfo.exemptionValidUntil);
      if (expirationDate < new Date()) {
        return { valid: false, reason: 'Tax exemption has expired' };
      }
    }
  }

  return { valid: true };
}
