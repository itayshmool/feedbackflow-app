// backend/src/modules/auth/services/google-oauth.service.ts

import { OAuth2Client, TokenPayload } from 'google-auth-library';

export class GoogleOAuthService {
  private client: OAuth2Client;

  constructor(googleClientId: string) {
    this.client = new OAuth2Client(googleClientId);
  }

  async verifyIdToken(idToken: string): Promise<TokenPayload> {
    const ticket = await this.client.verifyIdToken({ idToken });
    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Invalid Google ID token');
    }
    return payload;
  }
}



