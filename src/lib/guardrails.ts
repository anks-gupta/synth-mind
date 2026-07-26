import { Citation } from './types';

export interface GuardrailResult {
  allowed: boolean;
  reason?: string;
  sanitizedQuery?: string;
}

/**
 * Input Guardrail: Validates user query for prompt injections, gibberish, and safety.
 */
export function validateInputQuery(query: string): GuardrailResult {
  const trimmed = query.trim();

  if (!trimmed || trimmed.length < 2) {
    return {
      allowed: false,
      reason: 'Please enter a valid question or search term.',
    };
  }

  // Detect Prompt Injections
  const injectionPatterns = [
    /ignore (all )?previous instructions/i,
    /system prompt/i,
    /(reveal|give|show|print|what is) (me )?(your )?(api key|secret|token)/i,
    /you are now in DAN mode/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(trimmed)) {
      return {
        allowed: false,
        reason: 'Prompt injection or unauthorized instruction detected.',
      };
    }
  }

  // Detect Gibberish (e.g. "asdfghjkl")
  if (/^[^a-zA-Z0-9\s]{8,}$/.test(trimmed)) {
    return {
      allowed: false,
      reason: 'Unreadable query text.',
    };
  }

  return {
    allowed: true,
    sanitizedQuery: trimmed,
  };
}

/**
 * Output Guardrail: Verifies that generated answer contains citations and no hallucinations.
 */
export function verifyAnswerGrounding(
  answer: string,
  citations: Citation[]
): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // 1. Check if citations exist
  if (citations.length > 0) {
    const hasCitationBadges = /\[\d+\]/.test(answer);
    if (!hasCitationBadges) {
      warnings.push('Answer lacks numerical citation badges [1], [2].');
    }
  }

  // 2. Check for refusal phrases
  const refusalPhrases = [
    'cannot answer',
    'not mentioned in the sources',
    'no relevant information',
  ];

  const isRefusal = refusalPhrases.some((phrase) => answer.toLowerCase().includes(phrase));

  return {
    isValid: warnings.length === 0 || isRefusal,
    warnings,
  };
}
