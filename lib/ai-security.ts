/**
 * Security utilities to prevent abuse and attacks on AI chat
 */

// Patterns that indicate prompt injection attempts
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?previous/i,
  /forget\s+(?:all\s+)?previous/i,
  /system\s+prompt/i,
  /you\s+are\s+(?:actually|really)\s+(?:an\s+)?admin/i,
  /pretend\s+(?:you\s+are|the\s+rules)/i,
  /disregard\s+(?:all\s+)?instructions/i,
  /override\s+(?:security|rules|restrictions)/i,
  /jailbreak/i,
  /act\s+as\s+if/i,
  /forget\s+who\s+i\s+am/i,
  /treat\s+me\s+like\s+(?:an\s+)?admin/i,
  /bypass\s+(?:security|restrictions)/i,
  /show\s+me\s+(?:hidden|secret|all)\s+data/i,
  /what\s+(?:is|'s)\s+(?:the\s+)?(?:system\s+)?prompt/i,
  /sql\s+injection|select\s+\*/i,
];

// Suspicious patterns that might try to extract unauthorized data
const DATA_EXTRACTION_PATTERNS = [
  /password|secret|api\s+key|token/i,
  /(?:john|jane|employee)\s+(?:salary|wage|payment|income|earnings|compensation|data|info)/i,
  /all\s+(?:employees?|users?)\s+(?:salary|wage|payment|income|earnings|compensation|data|info)/i,
  /(?:salary|wage|payment|income|earnings|compensation|data|info)\s+(?:of|for)\s+(?:john|jane|employee|all\s+employees?|all\s+users?)/i,
  /database|query|schema|table/i,
];

/**
 * Detect prompt injection attempts
 */
export function detectPromptInjection(message: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Detect data extraction attempts
 */
export function detectDataExtractionAttempt(message: string): boolean {
  return DATA_EXTRACTION_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Sanitize message to prevent injection
 */
export function sanitizeMessage(message: string): string {
  // Remove control characters
  let sanitized = message.replace(/[\x00-\x1F\x7F]/g, "");

  // Limit length to prevent token overflow attacks
  sanitized = sanitized.substring(0, 1000);

  // Remove suspicious encoding attempts
  sanitized = sanitized.replace(/\\u[\dA-Fa-f]{4}/g, "");

  return sanitized.trim();
}

/**
 * Validate message before processing
 */
export function validateMessage(
  message: string
): { valid: boolean; reason?: string } {
  // Check length
  if (message.length < 2) {
    return { valid: false, reason: "Message too short" };
  }

  if (message.length > 1000) {
    return { valid: false, reason: "Message too long" };
  }

  // Check for prompt injection
  if (detectPromptInjection(message)) {
    return { valid: false, reason: "Invalid message format" };
  }

  // Check for data extraction attempts
  if (detectDataExtractionAttempt(message)) {
    return { valid: false, reason: "Invalid request" };
  }

  return { valid: true };
}

/**
 * Rate limiting helper - store in memory (for production, use Redis)
 */
const rateLimitMap = new Map<string, number[]>();

export function checkRateLimit(userId: string, limit: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const key = userId;

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, [now]);
    return true;
  }

  const timestamps = rateLimitMap.get(key)!;

  // Remove old timestamps outside the window
  const recentTimestamps = timestamps.filter((ts) => now - ts < windowMs);

  if (recentTimestamps.length >= limit) {
    return false; // Rate limit exceeded
  }

  recentTimestamps.push(now);
  rateLimitMap.set(key, recentTimestamps);
  return true;
}

/**
 * Clean AI response to prevent information leakage
 */
export function sanitizeAIResponse(response: string): string {
  // Remove any accidental system prompt references
  let sanitized = response.replace(/system\s+prompt|you\s+are\s+(?:an\s+)?ai|ignore/gi, "");

  // Remove any SQL or database references
  sanitized = sanitized.replace(/select\s+\*|database|schema|query/gi, "");

  // Remove any API key or token patterns
  sanitized = sanitized.replace(/(?:api[_-]?)?key|token|secret/gi, "");

  return sanitized.trim();
}

/**
 * Log security events for monitoring
 */
export function logSecurityEvent(
  userId: string,
  eventType: string,
  details: string
) {
  const timestamp = new Date().toISOString();
  console.warn(`[SECURITY] ${timestamp} - User: ${userId} - Event: ${eventType} - Details: ${details}`);
  // In production, send to security monitoring service
}
