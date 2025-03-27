import { 
  Controller, 
  Post, 
  Body, 
  HttpCode, 
  HttpStatus, 
  BadRequestException,
  NotFoundException,
  Logger
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBadRequestResponse, 
  ApiNotFoundResponse 
} from '@nestjs/swagger';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { MessageResponse } from './interfaces/auth.interface';
import { AuthService } from './services/auth.service';

@ApiTags('Authentication')
@Controller('auth/password')
export class PasswordController {
  private readonly logger = new Logger(PasswordController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('forgot')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Password reset email sent',
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
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<MessageResponse> {
    try {
      // Check if user with this email exists
      const userExists = await this.authService.checkEmailExists(forgotPasswordDto.email);
      if (!userExists) {
        throw new NotFoundException('User with this email not found');
      }

      // Generate reset token and send email
      await this.authService.sendPasswordResetEmail(forgotPasswordDto.email);
      
      return { message: 'Password reset instructions sent to your email' };
    } catch (error) {
      this.logger.error(`Forgot password request failed: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException) {
        // For security reasons, we might want to give the same message regardless
        // of whether the email exists. Uncomment the line below for that approach.
        // return { message: 'If your email exists in our system, you will receive recovery instructions' };
        throw error;
      }
      
      throw new BadRequestException(error.message || 'Password reset request failed');
    }
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Password successfully reset',
    type: MessageResponse
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid input data or token', 
    type: MessageResponse 
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<MessageResponse> {
    try {
      await this.authService.resetPassword(
        resetPasswordDto.token, 
        resetPasswordDto.password
      );
      
      return { message: 'Password successfully reset' };
    } catch (error) {
      this.logger.error(`Password reset failed: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || 'Password reset failed');
    }
  }
}
