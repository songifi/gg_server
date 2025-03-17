import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from 'src/authentication/decorator/roles.decorator';
import { RolesGuard } from 'src/authentication/guards/roles.guard';
import { Roles } from 'src/common/enums/roles.enums';
  

describe('RolesGuard', () => {
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
  });

  const mockExecutionContext = (role?: Roles) => {
    return {
      switchToHttp: jest.fn().mockReturnThis(),
      getRequest: jest.fn().mockReturnValue({
        user: role ? { role } : undefined,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  it('should be defined', () => {
    expect(rolesGuard).toBeDefined();
  });

  it('should allow access if user has required role', () => {
    const context = mockExecutionContext(Roles.Admin);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Roles.Admin]);

    expect(rolesGuard.canActivate(context)).toBe(true);
  });

  it('should deny access if user does not have a required role', () => {
    const context = mockExecutionContext(Roles.User);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Roles.Admin]);

    expect(() => rolesGuard.canActivate(context)).toThrow(
      new ForbiddenException('Access denied: Insufficient role'),
    );
  });

  it('should deny access if no user is attached to request', () => {
    const context = mockExecutionContext();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Roles.Admin]);

    expect(() => rolesGuard.canActivate(context)).toThrow(
      new ForbiddenException('Access denied: No role assigned'),
    );
  });

  it('should allow access if no roles are defined on the handler', () => {
    const context = mockExecutionContext(Roles.Admin);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    expect(rolesGuard.canActivate(context)).toBe(true);
  });
});
