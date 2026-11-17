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

// Everyone who works in the admin panel. `editor` manages catalog and content but
// not commerce data, so it is included here and excluded from isStaffUser.
export const isBackOfficeUser = (user: unknown): boolean => {
  const role = roleOf(user)
  return role === 'admin' || role === 'staff' || role === 'editor'
}

export const adminOnly: Access = ({ req: { user } }) => isAdminUser(user)
export const staffOnly: Access = ({ req: { user } }) => isStaffUser(user)
export const backOfficeOnly: Access = ({ req: { user } }) => isBackOfficeUser(user)
export const adminOnlyField: FieldAccess = ({ req: { user } }) => isAdminUser(user)

// For collections that had no access block: Payload's default lets any logged-in
// principal (including customers) read and write them.
export const staffCollectionAccess = {
  read: staffOnly,
  create: staffOnly,
  update: staffOnly,
  delete: adminOnly,
}

// For publicly readable catalog/content collections and globals. Spread next to a
// `read` rule: without explicit write rules Payload falls back to "any logged-in
// principal", and a `customers` login is one.
export const backOfficeWriteAccess = {
  create: backOfficeOnly,
  update: backOfficeOnly,
  delete: backOfficeOnly,
}
