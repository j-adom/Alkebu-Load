/**
 * Test script to demonstrate smart author name matching
 * Shows how different name variations are matched to the same author
 */

import { parseAuthorName, namesMatch, getMostCompleteName } from '../src/app/utils/authorMatching';

console.log('🧪 Testing Smart Author Name Matching\n');
console.log('=' .repeat(60));

// Test cases
const testCases = [
  ['Martin Luther King Jr.', 'Dr. Martin Luther King Jr.'],
  ['Martin Luther King', 'Martin Luther King Jr.'],
  ['Maya Angelou', 'Dr. Maya Angelou'],
  ['Malcolm X', 'Malcolm Little'],  // Should NOT match (different last name)
  ['James Baldwin', 'Baldwin, James'],
  ['Toni Morrison', 'Chloe Anthony Wofford'],  // Should NOT match (different name)
  ['W.E.B. Du Bois', 'W. E. B. Du Bois'],
  ['W.E.B. Du Bois', 'William Edward Burghardt Du Bois'],
];

console.log('\n📝 Name Parsing Examples:\n');

const parseExamples = [
  'Dr. Martin Luther King Jr.',
  'Maya Angelou',
  'W.E.B. Du Bois',
  'Rev. Jesse Jackson Sr.'
];

for (const name of parseExamples) {
  const parsed = parseAuthorName(name);
  console.log(`Input: "${name}"`);
  console.log(`  First: "${parsed.first}"`);
  console.log(`  Middle: "${parsed.middle}"`);
  console.log(`  Last: "${parsed.last}"`);
  console.log(`  Title: "${parsed.title}"`);
  console.log(`  Suffix: "${parsed.suffix}"`);
  console.log(`  Normalized: "${parsed.normalized}"`);
  console.log(`  Sort Key: "${parsed.sortKey}"`);
  console.log('');
}

console.log('\n🔍 Name Matching Tests:\n');

for (const [name1, name2] of testCases) {
  const matches = namesMatch(name1, name2);
  const betterName = matches ? getMostCompleteName(name1, name2) : null;

  console.log(`"${name1}" vs "${name2}"`);
  console.log(`  Match: ${matches ? '✅ YES' : '❌ NO'}`);
  if (matches && betterName) {
    console.log(`  Best version: "${betterName}"`);
  }
  console.log('');
}

console.log('=' .repeat(60));
console.log('\n✅ Smart matching will prevent duplicate authors!');
console.log('   Example: "Dr. Martin Luther King Jr." will match "Martin Luther King"\n');
