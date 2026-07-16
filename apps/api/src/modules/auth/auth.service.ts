import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as bcrypt from 'bcryptjs';
import * as schema from '@linq-beauty/db';
import { users, tenants } from '@linq-beauty/db';
import { DB } from '../../database/database.module';
import type { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: NodePgDatabase<typeof schema>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email),
    });
    if (!user) {
      throw new UnauthorizedException('メールアドレスまたはパスワードが違います');
    }
    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('メールアドレスまたはパスワードが違います');
    }
    const tenant = await this.db.query.tenants.findFirst({
      where: eq(tenants.id, user.tenantId),
    });
    if (!tenant) {
      throw new UnauthorizedException('メールアドレスまたはパスワードが違います');
    }
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
    });
    return {
      accessToken,
      tokenType: 'Bearer' as const,
      expiresInSec: 2592000,
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        tenantName: tenant.name,
      },
    };
  }

  async me(userId: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    const tenant = await this.db.query.tenants.findFirst({
      where: eq(tenants.id, user.tenantId),
    });
    if (!tenant) throw new NotFoundException(`Tenant ${user.tenantId} not found`);
    return {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      tenantName: tenant.name,
    };
  }
}
