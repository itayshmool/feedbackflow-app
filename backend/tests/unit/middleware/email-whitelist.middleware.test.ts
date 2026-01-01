import { Request, Response, NextFunction } from 'express';
import { createEmailWhitelistMiddleware, parseEmailWhitelistEnv, parseDomainWhitelistEnv } from '../../../src/shared/middleware/email-whitelist.middleware';

describe('Email Whitelist Middleware', () => {
  let mockReq: any;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();
    mockReq = {
      user: { id: '123', email: 'test@example.com', roles: [] },
      path: '/api/test',
      method: 'GET'
    };
    mockRes = {
      status: statusMock,
      json: jsonMock
    };
    mockNext = jest.fn() as jest.Mock;

    // Suppress console logs during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Single Email Whitelist', () => {
    it('should allow whitelisted email', () => {
      const middleware = createEmailWhitelistMiddleware({
        emailWhitelist: ['test@example.com'],
        domainWhitelist: []
      });

      mockReq.user = { email: 'test@example.com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should block non-whitelisted email', () => {
      const middleware = createEmailWhitelistMiddleware({
        emailWhitelist: ['allowed@example.com'],
        domainWhitelist: []
      });

      mockReq.user = { email: 'blocked@example.com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
          code: 'EMAIL_NOT_WHITELISTED',
          email: 'blocked@example.com'
        })
      );
    });

    it('should use custom error message', () => {
      const customMessage = 'Custom access denied message';
      const middleware = createEmailWhitelistMiddleware({
        emailWhitelist: ['allowed@example.com'],
        domainWhitelist: [],
        message: customMessage
      });

      mockReq.user = { email: 'blocked@example.com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: customMessage
        })
      );
    });
  });

  describe('Multiple Email Whitelist', () => {
    it('should allow any email in whitelist', () => {
      const middleware = createEmailWhitelistMiddleware({
        emailWhitelist: ['user1@example.com', 'user2@company.com', 'user3@external.com'],
        domainWhitelist: []
      });

      // Test first email
      mockReq.user = { email: 'user1@example.com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Test second email
      mockNext.mockClear();
      mockReq.user = { email: 'user2@company.com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Test third email
      mockNext.mockClear();
      mockReq.user = { email: 'user3@external.com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should block email not in whitelist', () => {
      const middleware = createEmailWhitelistMiddleware({
        emailWhitelist: ['user1@example.com', 'user2@company.com'],
        domainWhitelist: []
      });

      mockReq.user = { email: 'blocked@example.com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('Domain Whitelist', () => {
    it('should allow any email from whitelisted domain', () => {
      const middleware = createEmailWhitelistMiddleware({
        emailWhitelist: [],
        domainWhitelist: ['@wix.com']
      });

      mockReq.user = { email: 'user@wix.com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow different users from same domain', () => {
      const middleware = createEmailWhitelistMiddleware({
        emailWhitelist: [],
        domainWhitelist: ['@company.com']
      });

      // Test first user
      mockReq.user = { email: 'alice@company.com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Test second user
      mockNext.mockClear();
      mockReq.user = { email: 'bob@company.com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should block email from non-whitelisted domain', () => {
      const middleware = createEmailWhitelistMiddleware({
        emailWhitelist: [],
        domainWhitelist: ['@wix.com']
      });

      mockReq.user = { email: 'user@other.com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should support multiple domain wildcards', () => {
      const middleware = createEmailWhitelistMiddleware({
        emailWhitelist: [],
        domainWhitelist: ['@wix.com', '@partner.com', '@external.com']
      });

      // Test first domain
      mockReq.user = { email: 'user@wix.com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Test second domain
      mockNext.mockClear();
      mockReq.user = { email: 'user@partner.com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Test third domain
      mockNext.mockClear();
      mockReq.user = { email: 'user@external.com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('Combined Domain + Email Whitelist (OVERRIDE LOGIC)', () => {
    it('should BLOCK email from whitelisted domain when EMAIL_WHITELIST is set (override mode)', () => {
      const middleware = createEmailWhitelistMiddleware({
        emailWhitelist: ['contractor@external.com'],
        domainWhitelist: ['@wix.com']
      });

      // employee@wix.com is BLOCKED because EMAIL_WHITELIST overrides domain
      mockReq.user = { email: 'employee@wix.com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should allow specific email when EMAIL_WHITELIST is set', () => {
      const middleware = createEmailWhitelistMiddleware({
        emailWhitelist: ['contractor@external.com'],
        domainWhitelist: ['@wix.com']
      });

      mockReq.user = { email: 'contractor@external.com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should block email not in either whitelist', () => {
      const middleware = createEmailWhitelistMiddleware({
        emailWhitelist: ['contractor@external.com'],
        domainWhitelist: ['@wix.com']
      });

      mockReq.user = { email: 'blocked@other.com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should use EMAIL_WHITELIST and ignore domain when EMAIL_WHITELIST is set', () => {
      const logSpy = jest.spyOn(console, 'log');
      const middleware = createEmailWhitelistMiddleware({
        emailWhitelist: ['user@wix.com'], // Only this email allowed
        domainWhitelist: ['@wix.com']      // This is IGNORED
      });

      // user@wix.com is allowed (in EMAIL_WHITELIST)
      mockReq.user = { email: 'user@wix.com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('in EMAIL_WHITELIST (domain ignored)')
      );

      // other@wix.com is BLOCKED (not in EMAIL_WHITELIST, domain ignored)
      mockNext.mockClear();
      statusMock.mockClear();
      mockReq.user = { email: 'other@wix.com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should use domain whitelist when EMAIL_WHITELIST is empty', () => {
      const middleware = createEmailWhitelistMiddleware({
        emailWhitelist: [],              // Empty - use domain
        domainWhitelist: ['@wix.com']
      });

      // ANY @wix.com email is allowed
      mockReq.user = { email: 'employee@wix.com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();

      mockNext.mockClear();
      mockReq.user = { email: 'another@wix.com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Case Insensitivity', () => {
    it('should match email regardless of case', () => {
      const middleware = createEmailWhitelistMiddleware({
        emailWhitelist: ['user@example.com'],
        domainWhitelist: []
      });

      mockReq.user = { email: 'User@Example.Com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should match domain regardless of case', () => {
      const middleware = createEmailWhitelistMiddleware({
        emailWhitelist: [],
        domainWhitelist: ['@wix.com']
      });

      mockReq.user = { email: 'User@WIX.COM' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should pass through if user is not authenticated', () => {
      const middleware = createEmailWhitelistMiddleware({
        emailWhitelist: ['test@example.com'],
        domainWhitelist: []
      });

      mockReq.user = undefined;
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should pass through if user has no email', () => {
      const middleware = createEmailWhitelistMiddleware({
        emailWhitelist: ['test@example.com'],
        domainWhitelist: []
      });

      mockReq.user = { id: '123' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should handle empty whitelist', () => {
      const middleware = createEmailWhitelistMiddleware({
        emailWhitelist: [],
        domainWhitelist: []
      });

      mockReq.user = { email: 'any@example.com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should trim whitespace from emails', () => {
      const middleware = createEmailWhitelistMiddleware({
        emailWhitelist: ['  user@example.com  '],
        domainWhitelist: []
      });

      mockReq.user = { email: 'user@example.com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should trim whitespace from domains', () => {
      const middleware = createEmailWhitelistMiddleware({
        emailWhitelist: [],
        domainWhitelist: ['  @wix.com  ']
      });

      mockReq.user = { email: 'user@wix.com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('parseEmailWhitelistEnv', () => {
    it('should parse comma-separated emails', () => {
      const result = parseEmailWhitelistEnv('user1@company.com,user2@external.com,user3@partner.com');
      expect(result).toEqual(['user1@company.com', 'user2@external.com', 'user3@partner.com']);
    });

    it('should handle spaces in input', () => {
      const result = parseEmailWhitelistEnv('  user1@company.com , user2@external.com  ,user3@partner.com  ');
      expect(result).toEqual(['user1@company.com', 'user2@external.com', 'user3@partner.com']);
    });

    it('should return empty array for empty string', () => {
      expect(parseEmailWhitelistEnv('')).toEqual([]);
      expect(parseEmailWhitelistEnv('   ')).toEqual([]);
    });

    it('should return empty array for undefined', () => {
      expect(parseEmailWhitelistEnv(undefined)).toEqual([]);
    });

    it('should filter out empty entries', () => {
      const result = parseEmailWhitelistEnv('user1@company.com,,user2@external.com, ,user3@partner.com');
      expect(result).toEqual(['user1@company.com', 'user2@external.com', 'user3@partner.com']);
    });
  });

  describe('parseDomainWhitelistEnv', () => {
    it('should parse comma-separated domains', () => {
      const result = parseDomainWhitelistEnv('@wix.com,@partner.com,@external.com');
      expect(result).toEqual(['@wix.com', '@partner.com', '@external.com']);
    });

    it('should handle spaces in input', () => {
      const result = parseDomainWhitelistEnv('  @wix.com , @partner.com  ,@external.com  ');
      expect(result).toEqual(['@wix.com', '@partner.com', '@external.com']);
    });

    it('should return empty array for empty string', () => {
      expect(parseDomainWhitelistEnv('')).toEqual([]);
      expect(parseDomainWhitelistEnv('   ')).toEqual([]);
    });

    it('should return empty array for undefined', () => {
      expect(parseDomainWhitelistEnv(undefined)).toEqual([]);
    });

    it('should filter out empty entries', () => {
      const result = parseDomainWhitelistEnv('@wix.com,,@partner.com, ,@external.com');
      expect(result).toEqual(['@wix.com', '@partner.com', '@external.com']);
    });
  });

  describe('Error Response Format', () => {
    it('should return correct error structure', () => {
      const middleware = createEmailWhitelistMiddleware({
        emailWhitelist: ['allowed@example.com'],
        domainWhitelist: []
      });

      mockReq.user = { email: 'blocked@example.com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Access denied: Your email is not authorized',
        code: 'EMAIL_NOT_WHITELISTED',
        email: 'blocked@example.com',
        timestamp: expect.any(String)
      });
    });

    it('should include valid ISO timestamp', () => {
      const middleware = createEmailWhitelistMiddleware({
        emailWhitelist: ['allowed@example.com'],
        domainWhitelist: []
      });

      mockReq.user = { email: 'blocked@example.com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);

      const callArgs = jsonMock.mock.calls[0][0];
      const timestamp = new Date(callArgs.timestamp);
      expect(timestamp.toISOString()).toBe(callArgs.timestamp);
    });
  });

  describe('Logging', () => {
    it('should log when email is whitelisted (domain)', () => {
      const logSpy = jest.spyOn(console, 'log');
      const middleware = createEmailWhitelistMiddleware({
        emailWhitelist: [],
        domainWhitelist: ['@wix.com']
      });

      mockReq.user = { email: 'user@wix.com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ Email user@wix.com allowed (domain @wix.com whitelisted)')
      );
    });

    it('should log when email is whitelisted (individual)', () => {
      const logSpy = jest.spyOn(console, 'log');
      const middleware = createEmailWhitelistMiddleware({
        emailWhitelist: ['user@external.com'],
        domainWhitelist: []
      });

      mockReq.user = { email: 'user@external.com' } as any;
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ Email user@external.com allowed (in EMAIL_WHITELIST (domain ignored))')
      );
    });

    it('should warn when email is blocked', () => {
      const warnSpy = jest.spyOn(console, 'warn');
      const middleware = createEmailWhitelistMiddleware({
        emailWhitelist: ['allowed@example.com'],
        domainWhitelist: []
      });

      mockReq = {
        user: { id: 'user123', email: 'blocked@example.com' },
        path: '/api/test',
        method: 'POST'
      };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚫 Email blocked@example.com blocked')
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Path: POST /api/test')
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('User ID: user123')
      );
    });
  });
});

