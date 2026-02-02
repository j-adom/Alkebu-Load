import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const parseFullName = require('parse-full-name').parseFullName

// Test the name parsing and matching functionality
function testNameMatching() {
  console.log('🧪 Testing name parsing and matching...\n')

  // Test cases based on your example
  const testNames = [
    'Dr. Martin Luther King Jr.',
    'Martin Luther King Jr',
    'Martin Luther King',
    'Dr Martin Luther King',
    'M.L. King',
    'Maya Angelou',
    'Dr. Maya Angelou',
    'Langston Hughes',
    'James Baldwin',
    'W.E.B. Du Bois',
    'W E B Du Bois',
    'William Edward Burghardt Du Bois'
  ]

  console.log('📝 Parsing test names:\n')
  
  testNames.forEach(name => {
    const parsed = parseFullName(name, 'all', 1)
    
    // Format name similar to your code
    const formattedName = [
      parsed.title,
      parsed.first,
      parsed.middle,
      parsed.last,
      parsed.suffix
    ]
      .filter(Boolean)
      .join(' ')
      .trim()
    
    // Create slug
    const slug = formattedName
      .toLowerCase()
      .replace(/[*+~.(),'"!:@]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
    
    console.log(`"${name}"`)
    console.log(`  → Formatted: "${formattedName}"`)
    console.log(`  → Slug: "${slug}"`)
    console.log(`  → Parsed:`, {
      title: parsed.title,
      first: parsed.first,
      middle: parsed.middle,
      last: parsed.last,
      suffix: parsed.suffix
    })
    console.log('')
  })

  // Test matching scenarios
  console.log('🎯 Testing matching scenarios:\n')
  
  const matchingTests = [
    {
      existing: 'Martin Luther King Jr.',
      incoming: 'Dr. Martin Luther King Jr.',
      shouldMatch: true
    },
    {
      existing: 'Maya Angelou',
      incoming: 'Dr. Maya Angelou',
      shouldMatch: true
    },
    {
      existing: 'W.E.B. Du Bois',
      incoming: 'William Edward Burghardt Du Bois',
      shouldMatch: true
    },
    {
      existing: 'James Baldwin',
      incoming: 'James Arthur Baldwin',
      shouldMatch: true
    },
    {
      existing: 'Langston Hughes',
      incoming: 'James Mercer Langston Hughes',
      shouldMatch: true
    }
  ]

  matchingTests.forEach(test => {
    const existingParsed = parseFullName(test.existing, 'all', 1)
    const incomingParsed = parseFullName(test.incoming, 'all', 1)
    
    const score = calculateNameMatchScore(existingParsed, incomingParsed)
    const wouldMatch = score > 0.7
    
    console.log(`Existing: "${test.existing}"`)
    console.log(`Incoming: "${test.incoming}"`)
    console.log(`Score: ${score.toFixed(3)} | Would match: ${wouldMatch} | Should match: ${test.shouldMatch}`)
    console.log(`${wouldMatch === test.shouldMatch ? '✅' : '❌'} Test ${wouldMatch === test.shouldMatch ? 'passed' : 'failed'}`)
    console.log('')
  })
}

// Copy the scoring function for testing
function calculateNameMatchScore(name1: any, name2: any): number {
  let score = 0
  let maxScore = 0
  
  // Last name is most important (weight: 0.5)
  if (name1.last && name2.last) {
    maxScore += 0.5
    if (name1.last.toLowerCase() === name2.last.toLowerCase()) {
      score += 0.5
    } else if (name1.last.toLowerCase().includes(name2.last.toLowerCase()) || 
               name2.last.toLowerCase().includes(name1.last.toLowerCase())) {
      score += 0.3
    }
  }
  
  // First name is second most important (weight: 0.3)
  if (name1.first && name2.first) {
    maxScore += 0.3
    const first1 = name1.first.toLowerCase()
    const first2 = name2.first.toLowerCase()
    
    if (first1 === first2) {
      score += 0.3
    } else if (first1[0] === first2[0]) { // Same initial
      score += 0.15
    } else if (first1.includes(first2) || first2.includes(first1)) {
      score += 0.2
    }
  }
  
  // Middle name/initial (weight: 0.1)
  if (name1.middle && name2.middle) {
    maxScore += 0.1
    const middle1 = name1.middle.toLowerCase()
    const middle2 = name2.middle.toLowerCase()
    
    if (middle1 === middle2) {
      score += 0.1
    } else if (middle1[0] === middle2[0]) { // Same initial
      score += 0.05
    }
  }
  
  // Suffix (weight: 0.1)
  if (name1.suffix && name2.suffix) {
    maxScore += 0.1
    if (name1.suffix.toLowerCase() === name2.suffix.toLowerCase()) {
      score += 0.1
    }
  }
  
  // Title (weight: 0.05)
  if (name1.title && name2.title) {
    maxScore += 0.05
    if (name1.title.toLowerCase() === name2.title.toLowerCase()) {
      score += 0.05
    }
  }
  
  // Normalize score by maximum possible score
  return maxScore > 0 ? score / maxScore : 0
}

// Run the test
testNameMatching()