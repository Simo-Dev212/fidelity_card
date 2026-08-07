import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const { passwordHash, ...result } = user;
    return result;
  }

  async login(user: { id: string; email: string; name?: string | null }) {
    const payload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async register(data: {
    email: string;
    password: string;
    name?: string;
    locale?: string;
  }) {
    const existing = await this.usersService.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
        locale: data.locale || 'fr',
      },
    });

    return this.login(user);
  }

  /**
   * Used by Google OAuth strategy (and future Apple)
   */
  async validateOAuthUser(profile: {
    email: string;
    name?: string;
    picture?: string;
    googleId?: string;
    appleId?: string;
  }) {
    let user = await this.usersService.findByEmail(profile.email);

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email.toLowerCase(),
          name: profile.name,
          image: profile.picture,
          googleId: profile.googleId,
          appleId: profile.appleId,
          emailVerified: new Date(),
        },
      });
    } else {
      // Link provider if not already
      const update: any = {};
      if (profile.googleId && !user.googleId) update.googleId = profile.googleId;
      if (profile.appleId && !user.appleId) update.appleId = profile.appleId;
      if (Object.keys(update).length) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: update,
        });
      }
    }

    return user;
  }
}
