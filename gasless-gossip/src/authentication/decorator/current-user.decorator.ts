import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // this will extract user from request object
  },
);


/**
 *  CurrentUser.ts
 *  Custom decorator to extract the authenticated user from the request object.
 * 
 * The `@CurrentUser()` decorator allows you to easily access the authenticated user 
 * in route handlers or controllers without manually extracting it from the request.
 *
 * Usage:
 * - Attach the `@CurrentUser()` decorator to a parameter in a controller method.
 * - It automatically pulls the user object from the request, which is typically 
 *   populated by the authentication guard (e.g., JWT).
 *
 
 * Example:
 
 * @Controller('profile')
 * export class ProfileController {
 *   @Get('me')
 *   getProfile(@CurrentUser() user: User) {
 *     return user;
 *   }
 * }
 * ```
 * 
 * Behavior:
 * - If a valid JWT is provided and decoded, the user object is attached to the request.
 * - The decorator extracts this user object and makes it available as a parameter.
 * 
 * Possible Outcomes:
 * -  If the user is authenticated → The user object is available.
 * -  If the user is not authenticated → The decorator returns `undefined`.
 */