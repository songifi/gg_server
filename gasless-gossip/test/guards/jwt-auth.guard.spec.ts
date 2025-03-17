// import { ExecutionContext } from '@nestjs/common';
// // import { JwtAuthGuard } from './jwt.guard';
// // import { AuthenticationService } from '../authentication.service';

// describe('JwtAuthGuard', () => {
//   let jwtAuthGuard: JwtAuthGuard;
//   let mockAuthService: Partial<AuthenticationService>;

//   beforeEach(() => {
//     mockAuthService = {
//       isTokenBlacklisted: jest.fn().mockResolvedValue(false),
//     };

//     jwtAuthGuard = new JwtAuthGuard(mockAuthService as AuthenticationService);
//   });

//   const mockContext = (authHeader?: string) => {
//     return {
//       switchToHttp: () => ({
//         getRequest: () => ({
//           headers: {
//             authorization: authHeader,
//           },
//         }),
//         getResponse: jest.fn(), // ✅ Mocked getResponse()
//       }),
//     } as unknown as ExecutionContext;
//   };

//   it('should allow request if token is valid and not blacklisted', async () => {
//     await expect(jwtAuthGuard.canActivate(mockContext('Bearer valid-token'))).resolves.toBe(true);
//   });

//   it('should reject request if no token is provided', async () => {
//     await expect(jwtAuthGuard.canActivate(mockContext())).rejects.toThrow('No token provided');
//   });

//   it('should reject request if token is blacklisted', async () => {
//     (mockAuthService.isTokenBlacklisted as jest.Mock).mockResolvedValue(true);
//     await expect(jwtAuthGuard.canActivate(mockContext('Bearer blacklisted-token'))).rejects.toThrow(
//       'Token is blacklisted',
//     );
//   });

//   it('should reject request if token format is invalid', async () => {
//     await expect(jwtAuthGuard.canActivate(mockContext('InvalidFormatToken'))).rejects.toThrow(
//       'No token provided',
//     );
//   });
// });
