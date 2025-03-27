import { 
  Controller, 
  Post, 
  Body, 
  HttpCode, 
  HttpStatus, 
  UnauthorizedException,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBadRequestResponse, 
  ApiUnauthorizedResponse 
} from '@nestjs/swagger';
import { LoginDto, RefreshTokenDto, LogoutDto } from './dto/auth.dto';
import { AuthResponse, TokenResponse, MessageResponse } from './interfaces/auth.interface';
import { AuthService } from './services/auth.service';

@ApiTags('Authentication')
@Controller('auth')
export class LoginController {
  private readonly logger = new Logger(LoginController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user and get tokens' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'User successfully authenticated',
    type: AuthResponse
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid input data', 
    type: MessageResponse 
  })
  @ApiUnauthorizedResponse({ 
    description: 'Invalid credentials', 
    type: MessageResponse 
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    try {
      return await this.authService.login(loginDto);
    } catch (error) {
      this.logger.error(`Login failed: ${error.message}`, error.stack);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new BadRequestException(error.message || 'Login failed');
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Tokens successfully refreshed',
    type: TokenResponse
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid input data', 
    type: MessageResponse 
  })
  @ApiUnauthorizedResponse({ 
    description: 'Invalid or expired refresh token', 
    type: MessageResponse 
  })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto): Promise<TokenResponse> {
    try {
      return await this.authService.refreshToken(refreshTokenDto.refreshToken);
    } catch (error) {
      this.logger.error(`Token refresh failed: ${error.message}`, error.stack);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new BadRequestException(error.message || 'Token refresh failed');
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user and invalidate refresh token' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Successfully logged out',
    type: MessageResponse
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid input data', 
    type: MessageResponse 
  })
  async logout(@Body() logoutDto: LogoutDto): Promise<MessageResponse> {
    try {
      await this.authService.logout(logoutDto.refreshToken);
      return { message: 'Successfully logged out' };
    } catch (error) {
      this.logger.error(`Logout failed: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || 'Logout failed');
    }
  }
}
