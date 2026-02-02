/**
 * Toxicity checking utility for comment moderation
 * Uses Google Perspective API to detect toxic content
 * Falls back to basic keyword filtering if API is unavailable
 */

const PERSPECTIVE_API_KEY = process.env.PERSPECTIVE_API_KEY;
const PERSPECTIVE_API_URL = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';

// Basic toxic keywords for fallback filtering
const TOXIC_KEYWORDS = [
  'spam', 'scam', 'fake', 'fraud',
  // Add more as needed, but keep minimal for basic filtering
];

interface ToxicityResult {
  score: number; // 0-1, where 1 is most toxic
  passed: boolean; // true if content is safe to auto-approve
}

/**
 * Check text toxicity using Perspective API
 * @param text - Text to analyze
 * @param threshold - Toxicity threshold (default 0.7)
 * @returns Toxicity score and pass/fail status
 */
export async function checkToxicity(
  text: string,
  threshold: number = 0.7
): Promise<ToxicityResult> {
  // If no API key, use basic keyword filtering
  if (!PERSPECTIVE_API_KEY) {
    console.warn('PERSPECTIVE_API_KEY not set, using basic keyword filtering');
    return basicKeywordFilter(text, threshold);
  }

  try {
    const response = await fetch(`${PERSPECTIVE_API_URL}?key=${PERSPECTIVE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comment: { text },
        languages: ['en'],
        requestedAttributes: {
          TOXICITY: {},
          SEVERE_TOXICITY: {},
          IDENTITY_ATTACK: {},
          INSULT: {},
          PROFANITY: {},
          THREAT: {},
        },
      }),
    });

    if (!response.ok) {
      console.error('Perspective API error:', response.statusText);
      return basicKeywordFilter(text, threshold);
    }

    const data = await response.json();

    // Get the highest toxicity score from all attributes
    const scores = [
      data.attributeScores.TOXICITY?.summaryScore?.value || 0,
      data.attributeScores.SEVERE_TOXICITY?.summaryScore?.value || 0,
      data.attributeScores.IDENTITY_ATTACK?.summaryScore?.value || 0,
      data.attributeScores.INSULT?.summaryScore?.value || 0,
      data.attributeScores.PROFANITY?.summaryScore?.value || 0,
      data.attributeScores.THREAT?.summaryScore?.value || 0,
    ];

    const maxScore = Math.max(...scores);

    return {
      score: maxScore,
      passed: maxScore < threshold,
    };
  } catch (error) {
    console.error('Error checking toxicity:', error);
    // Fallback to basic filtering on error
    return basicKeywordFilter(text, threshold);
  }
}

/**
 * Basic keyword filtering fallback
 * @param text - Text to check
 * @param threshold - Not used in basic filtering, included for API compatibility
 * @returns Toxicity result
 */
function basicKeywordFilter(text: string, threshold: number): ToxicityResult {
  const lowerText = text.toLowerCase();

  // Check for toxic keywords
  const hasToxicKeyword = TOXIC_KEYWORDS.some(keyword =>
    lowerText.includes(keyword)
  );

  // Check for excessive caps (more than 50% of text)
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  const excessiveCaps = capsRatio > 0.5 && text.length > 10;

  // Check for excessive punctuation
  const punctuationRatio = (text.match(/[!?]{2,}/g) || []).length / text.length;
  const excessivePunctuation = punctuationRatio > 0.1;

  // Calculate basic toxicity score
  let score = 0;
  if (hasToxicKeyword) score += 0.5;
  if (excessiveCaps) score += 0.3;
  if (excessivePunctuation) score += 0.2;

  return {
    score: Math.min(score, 1), // Cap at 1.0
    passed: score < threshold,
  };
}

/**
 * Auto-approve a comment based on toxicity score
 * @param text - Comment text
 * @param contentType - Type of content being commented on ('blogPosts' or 'events')
 * @returns Status: 'approved', 'pending', or 'rejected'
 */
export async function autoModerateComment(
  text: string,
  contentType: 'blogPosts' | 'events'
): Promise<'approved' | 'pending' | 'rejected'> {
  const toxicity = await checkToxicity(text);

  // Auto-approve if toxicity is low
  if (toxicity.score < 0.5) {
    return 'approved';
  }

  // Auto-reject if toxicity is very high
  if (toxicity.score > 0.9) {
    return 'rejected';
  }

  // Queue for manual review if in the middle
  return 'pending';
}
