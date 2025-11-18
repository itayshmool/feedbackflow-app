// backend/src/modules/auth/services/user.service.ts

export interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  roles: string[];
}

export class UserService {
  private users = new Map<string, User>();

  async findByEmail(email: string): Promise<User | undefined> {
    return this.users.get(email);
  }

  async upsertGoogleUser(profile: { email: string; name?: string; picture?: string }): Promise<User> {
    const existing = await this.findByEmail(profile.email);
    
    // Determine roles based on email
    let roles: string[] = ['employee'];
    if (profile.email === 'itays@wix.com' || profile.email === 'admin@example.com') {
      roles = ['admin', 'employee'];
    } else if (profile.email === 'manager@example.com') {
      roles = ['manager', 'employee'];
    }
    
    if (existing) {
      const updated = { ...existing, ...profile, roles };
      this.users.set(profile.email, updated);
      return updated;
    }
    const user: User = {
      id: 'user_' + Math.random().toString(36).slice(2),
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
      roles,
    };
    this.users.set(profile.email, user);
    return user;
  }
}



