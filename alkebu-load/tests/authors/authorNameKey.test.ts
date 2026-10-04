import assert from 'node:assert/strict'
import test from 'node:test'

import { authorKey, namesCompatible } from '../../src/app/utils/authorNameKey'

test('authorKey: punctuation, case, accents, titles and "Last, First" do not matter', () => {
  const same = (a: string, b: string) => assert.equal(authorKey(a), authorKey(b), `${a} vs ${b}`)
  same('Henry Louis Gates, Jr.', 'Henry Louis Gates (Jr.)')
  same('Henry Louis Gates Jr.', 'Gates, Henry Louis Jr.')
  same('Dr. Jawanza Kunjufu PhD', 'Jawanza Kunjufu')
  same('W.E.B. DuBois', 'W. E. B. DuBois')
  same('Yosef ben- Jochannan', 'Yosef Ben-Jochannan')
  same("Awo Fá'Lokun Fatunmbi", 'Awo Fa Lokun Fatunmbi')
  same('King, Martin Luther Jr.', 'Martin Luther King, Jr.')
})

test('authorKey: Jr and Sr stay distinct, and a missing suffix is a different key', () => {
  assert.notEqual(authorKey('Martin Luther King Jr.'), authorKey('Martin Luther King Sr.'))
  assert.notEqual(authorKey('Henry Louis Gates'), authorKey('Henry Louis Gates, Jr.'))
  assert.equal(authorKey('  '), '')
})

test('namesCompatible: initials match full names, suffix may be missing on one side', () => {
  assert.equal(namesCompatible('Henry L. Gates', 'Henry Louis Gates'), true)
  assert.equal(namesCompatible('J. A. Rogers', 'Joel Augustus Rogers'), true)
  assert.equal(namesCompatible('Henry Louis Gates', 'Henry Louis Gates, Jr.'), true)
})

test('namesCompatible: different middle initials, Jr vs Sr, different surnames are not', () => {
  assert.equal(namesCompatible('Angela Y. Davis', 'Angela J. Davis'), false)
  assert.equal(namesCompatible('Martin Luther King Jr.', 'Martin Luther King Sr.'), false)
  assert.equal(namesCompatible('Angela Davis', 'Angela Jones'), false)
  assert.equal(namesCompatible('Kunjufu', 'Jawanza Kunjufu'), false)
})
