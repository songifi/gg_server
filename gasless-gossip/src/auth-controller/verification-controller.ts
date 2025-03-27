import { 
  Controller, 
  Post, 
  Body, 
  HttpCode, 
  HttpStatus, 
  BadRequestException,
  NotFoundException,
  Logger,
  Get,
  Param,
  Redirect
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBadRequestResponse, 
  ApiNotFoundResponse, 
  ApiParam
} from '@nestjs/swagger';
import { VerifyEmailDto, ResendVerificationDto } from './dto/auth.dto';
import { MessageResponse } from './interfaces/auth.interface';
import { AuthService } from './services/auth.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('Authentication')
@Controller('auth/verify')
export class VerificationController {
  private readonly logger = new Logger(VerificationController.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  @Post('email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with token' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Email successfully verified',
    type: MessageResponse
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid token', 
    type: MessageResponse 
  })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto): Promise<MessageResponse> {
    try {
      await this.authService.verifyEmail(verifyEmailDto.token);
      return { message: 'Email successfully verified' };
    } catch (error) {
      this.logger.error(`Email verification failed: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || 'Email verification failed');
    }
  }

  @Get('email/:token')
  @ApiOperation({ summary: 'Verify email with token (GET endpoint for email links)' })
  @ApiParam({ name: 'token', description: 'Email verification token' })
  @ApiResponse({ 
    status: HttpStatus.FOUND, 
    description: 'Redirects to frontend with success/error message'
  })
  @Redirect()
  async verifyEmailGet(@Param('token') token: string) {
    try {
      await this.authService.verifyEmail(token);
      return { 
        url: `${this.frontendUrl}/auth/email-verified?success=true` 
      };
    } catch (error) {
      this.logger.error(`Email verification failed: ${error.message}`, error.stack);
      return { 
        url: `${this.frontendUrl}/auth/email-verified?success=false&error=${encodeURIComponent(error.message)}` 
      };
    }
  }

  @Post('resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Verification email resent',
    type: MessageResponse
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid input data', 
    type: MessageResponse 
  })
  @ApiNotFoundResponse({ 
    description: 'Email not found', 
    type: MessageResponse 
  })
  async resendVerification(@Body() resendDto: ResendVerificationDto): Promise<MessageResponse> {
    try {
      // Check if user with this email exists
      const userExists = await this.authService.checkEmailExists(resendDto.email);
      if (!userExists) {
        throw new NotFoundException('User with this email not found');
      }

      // Check if email is already verified
      const isVerified = await this.authService.isEmailVerified(resendDto.email);
      if (isVerified) {
        return { message: 'Email is already verified' };
      }

      // Send verification email
      await this.authService.sendVerificationEmail(resendDto.email);
      
      return { message: 'Verification email sent' };
    } catch (error) {
      this.logger.error(`Resend verification email failed: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new BadRequestException(error.message || 'Resend verification email failed');
    }
  }
}
