import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

export type AuthUser = {
  sub: string;
  tenantId: string;
  email: string;
};

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
