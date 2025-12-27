/**
 * XSS Sanitization Utility
 * 
 * Provides input sanitization to prevent stored XSS attacks.
 * This is defense-in-depth - React also escapes output, but we sanitize input
 * to protect against future vulnerabilities and non-React API consumers.
 */

import xss, { IFilterXSSOptions } from 'xss';

// XSS sanitization options - strip all HTML tags for plain text fields
const xssOptions: IFilterXSSOptions = {
  whiteList: {}, // Allow no HTML tags
  stripIgnoreTag: true, // Remove all HTML tags
  stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed'] // Completely remove dangerous tag content
};

/**
 * Sanitizes a string to prevent XSS attacks.
 * Removes all HTML tags and dangerous content.
 * 
 * @param input - The string to sanitize
 * @returns Sanitized string with HTML tags removed
 * 
 * @example
 * sanitizeString('<script>alert("xss")</script>Hello')
 * // Returns: 'Hello'
 * 
 * sanitizeString('<b>Bold</b> text')
 * // Returns: 'Bold text'
 */
export function sanitizeString(input: string | undefined | null): string {
  if (input === undefined || input === null) return '';
  if (typeof input !== 'string') return '';
  return xss(input.trim(), xssOptions);
}

/**
 * Sanitizes an array of strings.
 * 
 * @param input - Array of strings to sanitize
 * @returns Array of sanitized strings
 */
export function sanitizeStringArray(input: string[] | undefined | null): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(item => typeof item === 'string')
    .map(sanitizeString);
}

/**
 * Sanitizes feedback content object.
 * Applies XSS sanitization to all text fields.
 * 
 * @param content - Feedback content object
 * @returns Sanitized feedback content
 */
export function sanitizeFeedbackContent(content: any): {
  overallComment: string;
  strengths: string[];
  areasForImprovement: string[];
  specificExamples: string[];
  recommendations: string[];
  whatDoYouNeedFromMe?: string;
  bottomLine?: string;
  confidential: boolean;
} {
  if (!content || typeof content !== 'object') {
    return {
      overallComment: '',
      strengths: [],
      areasForImprovement: [],
      specificExamples: [],
      recommendations: [],
      confidential: false
    };
  }
  
  return {
    overallComment: sanitizeString(content.overallComment),
    strengths: sanitizeStringArray(content.strengths),
    areasForImprovement: sanitizeStringArray(content.areasForImprovement),
    specificExamples: sanitizeStringArray(content.specificExamples),
    recommendations: sanitizeStringArray(content.recommendations),
    whatDoYouNeedFromMe: content.whatDoYouNeedFromMe ? sanitizeString(content.whatDoYouNeedFromMe) : undefined,
    bottomLine: content.bottomLine ? sanitizeString(content.bottomLine) : undefined,
    confidential: Boolean(content.confidential)
  };
}

/**
 * Sanitizes a comment string (for feedback comments).
 * 
 * @param comment - Comment text to sanitize
 * @returns Sanitized comment text
 */
export function sanitizeComment(comment: string | undefined | null): string {
  return sanitizeString(comment);
}

/**
 * Sanitizes goal content.
 * 
 * @param goal - Goal object to sanitize
 * @returns Sanitized goal object
 */
export function sanitizeGoal(goal: any): {
  title: string;
  description: string;
  category: string;
  priority: string;
  targetDate: string | null;
} {
  if (!goal || typeof goal !== 'object') {
    return {
      title: '',
      description: '',
      category: 'development',
      priority: 'medium',
      targetDate: null
    };
  }
  
  return {
    title: sanitizeString(goal.title),
    description: sanitizeString(goal.description),
    category: sanitizeString(goal.category) || 'development',
    priority: sanitizeString(goal.priority) || 'medium',
    targetDate: goal.targetDate || null
  };
}

/**
 * Sanitizes an array of goals.
 * 
 * @param goals - Array of goal objects
 * @returns Array of sanitized goal objects
 */
export function sanitizeGoals(goals: any[] | undefined | null): ReturnType<typeof sanitizeGoal>[] {
  if (!Array.isArray(goals)) return [];
  return goals.map(sanitizeGoal);
}

