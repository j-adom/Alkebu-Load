import assert from 'node:assert/strict'
import test from 'node:test'

import { chooseAuthorMatch, findOrCreateAuthor } from '../../src/app/utils/authorMatching'

const authors = [
  { id: 148, name: 'Henry Louis Gates, Jr.' },
  { id: 2259, name: 'Henry Louis Gates Jr.' },
  { id: 463, name: 'Angela Y. Davis' },
  { id: 2545, name: 'Angela J. Davis' },
  { id: 2092, name: 'Martin Luther King Sr.' },
  { id: 2870, name: 'King, Martin Luther Jr.' },
]

test('same name written differently links to the oldest record', () => {
  assert.equal(chooseAuthorMatch('Gates, Henry Louis Jr.', authors)?.id, 148)
  assert.equal(chooseAuthorMatch('Dr. Martin Luther King, Jr.', authors)?.id, 2870)
})

test('a unique compatible name links; an ambiguous one creates', () => {
  assert.equal(chooseAuthorMatch('Angela Yvonne Davis', authors)?.id, 463)
  assert.equal(chooseAuthorMatch('Angela Davis', authors), null, 'Y. and J. both fit: do not guess')
})

test('Jr never links to Sr, and an unknown name creates', () => {
  assert.equal(chooseAuthorMatch('Martin Luther King Jr.', authors)?.id, 2870)
  assert.equal(chooseAuthorMatch('Toni Morrison', authors), null)
})

test('findOrCreateAuthor never renames an existing author', async () => {
  const calls: string[] = []
  const payload = {
    find: async () => ({ docs: authors }),
    update: async () => {
      calls.push('update')
    },
    create: async () => {
      calls.push('create')
      return { id: 1 }
    },
  }
  const result = await findOrCreateAuthor(payload, 'Henry L. Gates, Jr.')
  assert.equal(result.id, 148)
  assert.equal(result.wasCreated, false)
  assert.deepEqual(calls, [])
})

test('findOrCreateAuthor recovers when a concurrent link created the same name', async () => {
  let finds = 0
  const payload = {
    find: async () => (++finds === 1 ? { docs: [] } : { docs: [{ id: 9, name: 'Toni Morrison' }] }),
    create: async () => {
      throw new Error('duplicate key value violates unique constraint "authors_name_idx"')
    },
  }
  assert.deepEqual(await findOrCreateAuthor(payload, 'Toni Morrison'), { id: 9, name: 'Toni Morrison', wasCreated: false })
})
