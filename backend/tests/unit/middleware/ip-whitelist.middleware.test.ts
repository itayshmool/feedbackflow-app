import { Request, Response, NextFunction } from 'express';
import { createIPWhitelistMiddleware, parseIPWhitelistEnv } from '../../../src/shared/middleware/ip-whitelist.middleware';

describe('IP Whitelist Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();
    mockReq = {
      headers: {},
      socket: { remoteAddress: undefined } as any,
      path: '/api/test',
      method: 'GET',
      ip: undefined
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

  describe('Single IP Whitelist', () => {
    it('should allow whitelisted IP', () => {
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: ['192.168.1.100'] 
      });

      mockReq.headers = { 'x-forwarded-for': '192.168.1.100' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should block non-whitelisted IP', () => {
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: ['192.168.1.100'] 
      });

      mockReq.headers = { 'x-forwarded-for': '10.0.0.1' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
          code: 'IP_NOT_WHITELISTED'
        })
      );
    });

    it('should use custom error message', () => {
      const customMessage = 'Custom access denied message';
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: ['192.168.1.100'],
        message: customMessage
      });

      mockReq.headers = { 'x-forwarded-for': '10.0.0.1' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: customMessage
        })
      );
    });
  });

  describe('Multiple IP Whitelist', () => {
    it('should allow any IP in whitelist', () => {
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: ['192.168.1.100', '10.0.0.50', '172.16.0.1'] 
      });

      // Test first IP
      mockReq.headers = { 'x-forwarded-for': '192.168.1.100' };
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Test second IP
      mockNext.mockClear();
      mockReq.headers = { 'x-forwarded-for': '10.0.0.50' };
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Test third IP
      mockNext.mockClear();
      mockReq.headers = { 'x-forwarded-for': '172.16.0.1' };
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should block IP not in whitelist', () => {
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: ['192.168.1.100', '10.0.0.50'] 
      });

      mockReq.headers = { 'x-forwarded-for': '8.8.8.8' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should handle empty whitelist', () => {
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: [] 
      });

      mockReq.headers = { 'x-forwarded-for': '192.168.1.100' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('CIDR Range Support', () => {
    it('should allow IP in CIDR range /24', () => {
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: ['192.168.1.0/24'] // Allows 192.168.1.0 - 192.168.1.255
      });

      mockReq.headers = { 'x-forwarded-for': '192.168.1.150' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow IP at start of CIDR range', () => {
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: ['192.168.1.0/24'] 
      });

      mockReq.headers = { 'x-forwarded-for': '192.168.1.0' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow IP at end of CIDR range', () => {
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: ['192.168.1.0/24'] 
      });

      mockReq.headers = { 'x-forwarded-for': '192.168.1.255' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should block IP outside CIDR range', () => {
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: ['192.168.1.0/24'] 
      });

      mockReq.headers = { 'x-forwarded-for': '192.168.2.100' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should support /16 CIDR range', () => {
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: ['10.0.0.0/16'] // Allows 10.0.0.0 - 10.0.255.255
      });

      mockReq.headers = { 'x-forwarded-for': '10.0.50.100' };
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();

      mockNext.mockClear();
      mockReq.headers = { 'x-forwarded-for': '10.0.255.255' };
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should support /8 CIDR range', () => {
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: ['10.0.0.0/8'] // Allows 10.0.0.0 - 10.255.255.255
      });

      mockReq.headers = { 'x-forwarded-for': '10.123.45.67' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should support multiple CIDR ranges', () => {
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: ['192.168.1.0/24', '10.0.0.0/16'] 
      });

      // Test first range
      mockReq.headers = { 'x-forwarded-for': '192.168.1.50' };
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Test second range
      mockNext.mockClear();
      mockReq.headers = { 'x-forwarded-for': '10.0.50.100' };
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Test outside both ranges
      mockNext.mockClear();
      mockReq.headers = { 'x-forwarded-for': '172.16.0.1' };
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should support mixed individual IPs and CIDR ranges', () => {
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: ['203.0.113.50', '192.168.1.0/24', '10.0.0.0/16'] 
      });

      // Test individual IP
      mockReq.headers = { 'x-forwarded-for': '203.0.113.50' };
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Test first CIDR
      mockNext.mockClear();
      mockReq.headers = { 'x-forwarded-for': '192.168.1.100' };
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Test second CIDR
      mockNext.mockClear();
      mockReq.headers = { 'x-forwarded-for': '10.0.5.10' };
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('IPv6 Support', () => {
    it('should handle IPv6-mapped IPv4 addresses', () => {
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: ['192.168.1.100'] 
      });

      mockReq.headers = { 'x-forwarded-for': '::ffff:192.168.1.100' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle IPv6-mapped IPv4 in CIDR range', () => {
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: ['192.168.1.0/24'] 
      });

      mockReq.headers = { 'x-forwarded-for': '::ffff:192.168.1.150' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('IP Detection from Headers', () => {
    it('should detect IP from x-forwarded-for header', () => {
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: ['1.2.3.4'] 
      });

      mockReq.headers = { 'x-forwarded-for': '1.2.3.4' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should use first IP in x-forwarded-for chain', () => {
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: ['1.2.3.4'] 
      });

      // Simulates proxy chain: client -> proxy1 -> proxy2
      mockReq.headers = { 'x-forwarded-for': '1.2.3.4, 10.0.0.1, 10.0.0.2' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should detect IP from x-real-ip header', () => {
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: ['5.6.7.8'] 
      });

      mockReq.headers = { 'x-real-ip': '5.6.7.8' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fallback to socket.remoteAddress', () => {
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: ['9.10.11.12'] 
      });

      mockReq.socket = { remoteAddress: '9.10.11.12' } as any;

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should prioritize x-forwarded-for over other headers', () => {
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: ['1.2.3.4'] 
      });

      mockReq.headers = { 
        'x-forwarded-for': '1.2.3.4',
        'x-real-ip': '5.6.7.8'
      };
      mockReq.socket = { remoteAddress: '9.10.11.12' } as any;

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled(); // Should use x-forwarded-for (1.2.3.4)
    });
  });

  describe('parseIPWhitelistEnv', () => {
    it('should parse comma-separated IPs', () => {
      const result = parseIPWhitelistEnv('1.2.3.4,5.6.7.8,9.10.11.12');
      expect(result).toEqual(['1.2.3.4', '5.6.7.8', '9.10.11.12']);
    });

    it('should handle spaces in input', () => {
      const result = parseIPWhitelistEnv('  1.2.3.4 , 5.6.7.8  ,9.10.11.12  ');
      expect(result).toEqual(['1.2.3.4', '5.6.7.8', '9.10.11.12']);
    });

    it('should handle CIDR notation', () => {
      const result = parseIPWhitelistEnv('192.168.1.0/24,10.0.0.0/16');
      expect(result).toEqual(['192.168.1.0/24', '10.0.0.0/16']);
    });

    it('should handle mixed IPs and CIDR', () => {
      const result = parseIPWhitelistEnv('1.2.3.4,192.168.1.0/24,5.6.7.8,10.0.0.0/16');
      expect(result).toEqual(['1.2.3.4', '192.168.1.0/24', '5.6.7.8', '10.0.0.0/16']);
    });

    it('should return empty array for empty string', () => {
      expect(parseIPWhitelistEnv('')).toEqual([]);
      expect(parseIPWhitelistEnv('   ')).toEqual([]);
    });

    it('should return empty array for undefined', () => {
      expect(parseIPWhitelistEnv(undefined)).toEqual([]);
    });

    it('should filter out empty entries', () => {
      const result = parseIPWhitelistEnv('1.2.3.4,,5.6.7.8, ,9.10.11.12');
      expect(result).toEqual(['1.2.3.4', '5.6.7.8', '9.10.11.12']);
    });
  });

  describe('Error Response Format', () => {
    it('should return correct error structure', () => {
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: ['1.2.3.4'] 
      });

      mockReq.headers = { 'x-forwarded-for': '5.6.7.8' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Access denied: Your IP address is not authorized',
        code: 'IP_NOT_WHITELISTED',
        timestamp: expect.any(String)
      });
    });

    it('should include valid ISO timestamp', () => {
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: ['1.2.3.4'] 
      });

      mockReq.headers = { 'x-forwarded-for': '5.6.7.8' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      const callArgs = jsonMock.mock.calls[0][0];
      const timestamp = new Date(callArgs.timestamp);
      expect(timestamp.toISOString()).toBe(callArgs.timestamp);
    });
  });

  describe('Edge Cases', () => {
    it('should handle localhost IP (127.0.0.1)', () => {
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: ['127.0.0.1'] 
      });

      mockReq.headers = { 'x-forwarded-for': '127.0.0.1' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle IPv6 localhost (::1)', () => {
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: ['::1'] 
      });

      mockReq.headers = { 'x-forwarded-for': '::1' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle unknown IP gracefully', () => {
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: ['1.2.3.4'] 
      });

      // No headers, no socket address
      mockReq = {
        headers: {},
        socket: {} as any,
        ip: undefined,
        path: '/api/test',
        method: 'GET'
      };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should trim whitespace from whitelist entries', () => {
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: ['  1.2.3.4  ', '  5.6.7.8  '] 
      });

      mockReq.headers = { 'x-forwarded-for': '1.2.3.4' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Logging', () => {
    it('should log when IP is whitelisted', () => {
      const logSpy = jest.spyOn(console, 'log');
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: ['1.2.3.4'] 
      });

      mockReq.headers = { 'x-forwarded-for': '1.2.3.4' };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ IP 1.2.3.4 allowed (whitelisted)')
      );
    });

    it('should warn when IP is blocked', () => {
      const warnSpy = jest.spyOn(console, 'warn');
      const middleware = createIPWhitelistMiddleware({ 
        whitelist: ['1.2.3.4'] 
      });

      mockReq = {
        headers: { 'x-forwarded-for': '5.6.7.8' },
        socket: { remoteAddress: undefined } as any,
        path: '/api/test',
        method: 'POST',
        ip: undefined
      };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚫 IP 5.6.7.8 blocked')
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Path: POST /api/test')
      );
    });
  });
});

