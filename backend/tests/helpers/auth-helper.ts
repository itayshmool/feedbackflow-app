import jwt from 'jsonwebtoken';

interface MockTokenPayload {
  sub: string;
  email: string;
  name: string;
  organizationId: string;
  roles: string[];
}

export function generateMockToken(payload: MockTokenPayload): string {
  const secret = process.env.JWT_SECRET || 'test-secret-key';
  
  return jwt.sign(
    {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      organizationId: payload.organizationId,
      roles: payload.roles,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
    },
    secret,
    { algorithm: 'HS256' }
  );
}

export function generateMockTokenWithOrg(userId: string, email: string, orgId: string, roles: string[] = ['employee']): string {
  return generateMockToken({
    sub: userId,
    email,
    name: email.split('@')[0],
    organizationId: orgId,
    roles
  });
}




