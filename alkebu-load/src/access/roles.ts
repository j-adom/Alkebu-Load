import type { Access, FieldAccess } from 'payload'

// Only principals from the `users` auth collection carry a trusted role. A
// `customers` login must never satisfy these checks, even if a role-shaped
// field ever appears on that collection.
const roleOf = (user: unknown): string | undefined => {
  const u = user as { collection?: string; role?: string } | null | undefined
  if (!u || u.collection !== 'users') return undefined
  return u.role
}

export const isAdminUser = (user: unknown): boolean => roleOf(user) === 'admin'

export const isStaffUser = (user: unknown): boolean => {
  const role = roleOf(user)
  return role === 'admin' || role === 'staff'
}

export const adminOnly: Access = ({ req: { user } }) => isAdminUser(user)
export const staffOnly: Access = ({ req: { user } }) => isStaffUser(user)
export const adminOnlyField: FieldAccess = ({ req: { user } }) => isAdminUser(user)

// For collections that had no access block: Payload's default lets any logged-in
// principal (including customers) read and write them.
export const staffCollectionAccess = {
  read: staffOnly,
  create: staffOnly,
  update: staffOnly,
  delete: adminOnly,
}
