import { SetMetadata } from '@nestjs/common';
import { Roles } from 'src/common/enums/roles.enums';

export const ROLES_KEY = 'roles';
export const RolesDecorator = (...roles: [Roles, ...Roles[]]) => 
  SetMetadata(ROLES_KEY, roles);


/**
 *  roles.decorator.ts
 *  Custom decorator to define role-based access control (RBAC) for routes.
 * 
 * The `@RolesDecorator()` allows you to specify which roles are allowed to access 
 * a particular route or controller.
 *
 ## Usage:
 * - Attach the `@RolesDecorator()` to a route handler or controller.
 * - The `RolesGuard` will read the assigned roles from metadata and verify if the 
 *   authenticated user has the required role to access the resource.
 *
 
 ## Example:
 
 * @Controller('admin')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * export class AdminController {
 *   @Get('dashboard')
 *   @RolesDecorator(Roles.Admin)
 *   getAdminDashboard() {
 *     return 'Admin dashboard data';
 *   }
 * }
 
 * 
 ##Behavior:
 * - The decorator stores the specified roles using `SetMetadata` under the key `'roles'`.
 * - The `RolesGuard` will retrieve these roles from metadata and compare them with 
 *   the authenticated user's role.
 *
 ## Possible Outcomes:
 * - ✅ If the user’s role matches one of the required roles → Access is granted.
 * - ❌ If the user’s role does **not** match any of the required roles → `403 Forbidden` is thrown.
 * - ❌ If no role is assigned → `403 Forbidden` is thrown.
 *
 * @constant {string} ROLES_KEY - Metadata key used to store roles.
 */