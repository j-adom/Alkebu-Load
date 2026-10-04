import assert from 'node:assert/strict'
import test from 'node:test'

import { authorSlug, planAuthorMerges } from '../../src/app/utils/authorMergePlan'

const row = (group: string, action: string, role: string, id: number, name: string, suggested = '') => ({
  group,
  action,
  role,
  author_id: String(id),
  name,
  suggested_name: suggested,
})

test('a merge group plans keep, duplicates and the suggested final name', () => {
  const { groups, skipped } = planAuthorMerges([
    row('1', 'merge', 'KEEP', 1951, 'Dr. Jawanza Kunjufu PhD', 'Jawanza Kunjufu'),
    row('1', 'merge', 'merge into keep', 318, 'Jawanza Kunjufu'),
    row('1', 'merge', 'merge into keep', 317, 'Dr. Jawanza Kunjufu'),
  ])
  assert.deepEqual(skipped, [])
  assert.deepEqual(groups[0], {
    group: '1',
    keep: { id: 1951, name: 'Dr. Jawanza Kunjufu PhD' },
    merge: [
      { id: 318, name: 'Jawanza Kunjufu' },
      { id: 317, name: 'Dr. Jawanza Kunjufu' },
    ],
    finalName: 'Jawanza Kunjufu',
  })
})

test('review groups, missing or double KEEP, and singletons are skipped with a reason', () => {
  const { groups, skipped } = planAuthorMerges([
    row('2', 'review', 'KEEP', 1, 'A'),
    row('2', 'review', 'merge into keep', 2, 'B'),
    row('3', 'merge', 'merge into keep', 3, 'C'),
    row('3', 'merge', 'merge into keep', 4, 'D'),
    row('4', 'merge', 'KEEP', 5, 'E'),
    row('4', 'merge', 'KEEP', 6, 'F'),
    row('5', 'merge', 'KEEP', 7, 'G'),
  ])
  assert.equal(groups.length, 0)
  assert.deepEqual(
    skipped.map((s) => s.reason),
    ['action is not merge', 'no KEEP row', 'more than one KEEP row', 'nothing to merge into KEEP'],
  )
})

test('an author listed in two groups is refused in the second', () => {
  const { groups, skipped } = planAuthorMerges([
    row('1', 'merge', 'KEEP', 10, 'X'),
    row('1', 'merge', 'merge into keep', 11, 'X.'),
    row('2', 'merge', 'KEEP', 11, 'X'),
    row('2', 'merge', 'merge into keep', 12, 'X,'),
  ])
  assert.equal(groups.length, 1)
  assert.match(skipped[0].reason, /author 11 also appears in group 1/)
})

test('authorSlug', () => {
  assert.equal(authorSlug('Henry Louis Gates, Jr.'), 'henry-louis-gates-jr')
  assert.equal(authorSlug("Awo Fá'Lokun Fatunmbi"), 'awo-fa-lokun-fatunmbi')
})
