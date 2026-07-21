import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

export type PlatformAdminClaims = {
  sub: string;
  role: 'platform';
  email: string;
};

export const CurrentAdmin = createParamDecorator((_data: unknown, ctx: ExecutionContext): PlatformAdminClaims => {
  const request = ctx.switchToHttp().getRequest();
  return request.platformAdmin;
});
