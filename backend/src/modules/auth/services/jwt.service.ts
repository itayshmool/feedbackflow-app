// backend/src/modules/auth/services/jwt.service.ts

import jwt, { SignOptions } from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  roles?: string[];
}

export class JwtService {
  constructor(private secret: string) {}

  sign(payload: JwtPayload, expiresIn: string | number = '7d'): string {
    return jwt.sign(payload, this.secret, { expiresIn: expiresIn as any });
  }

  verify(token: string): JwtPayload {
    return jwt.verify(token, this.secret) as JwtPayload;
  }
}