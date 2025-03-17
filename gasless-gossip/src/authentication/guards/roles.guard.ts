import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorator/roles.decorator';
import { Roles } from 'src/common/enums/roles.enums';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from metadata
    const requiredRoles = this.reflector.getAllAndOverride<Roles[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Get user from request
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Ensure user is attached to request (e.g., via JWT auth)
    console.log('User from request:', user);

    if (!user || !user.role) {
      throw new ForbiddenException('Access denied: No role assigned');
    }

    // Check if the user has at least one required role
    const hasRequiredRoles = requiredRoles.includes(user.role);
    if (!hasRequiredRoles) {
      throw new ForbiddenException('Access denied: Insufficient role');
    }

    return hasRequiredRoles;
  }
}


/**
 
 * The `RolesGuard` ensures that only users with the appropriate roles can access protected routes.
 * It works by checking the `@Roles()` metadata attached to controllers or methods and comparing it 
 * with the authenticated user's role.
 *
 * Usage:
 * - Apply the `@Roles()` decorator to specify required roles.
 * - Attach `RolesGuard` using `@UseGuards(RolesGuard)` to secure the route.
 *

 * Example:
 * @Controller('admin')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * export class AdminController {
 *   @Get()
 *   @Roles(Roles.ADMIN)
 *   findAll() {
 *     return 'Admin content';
 *   }
 * }

 
 * Behavior:
 * - The guard checks the user's role from the request object (attached via JWT authentication).
 * - If the user’s role matches any of the required roles, the request proceeds.
 * - If no role is assigned or the user role does not match, a `ForbiddenException` is thrown.
 * 
 * Possible Outcomes:
 * - ✅ Access granted → The user has a matching role.
 * - ❌ Access denied → The user has no role or an insufficient role.
 */
