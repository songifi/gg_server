import { 
  Controller, 
  Post, 
  Body, 
  HttpCode, 
  HttpStatus, 
  ConflictException,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBadRequestResponse, 
  ApiConflictResponse 
} from '@nestjs/swagger';
import { RegisterDto } from './dto/auth.dto';
import { AuthResponse, MessageResponse } from './interfaces/auth.interface';
import { AuthService } from './services/auth.service';

@ApiTags('Authentication')
@Controller('auth/register')
export class RegisterController {
  private readonly logger = new Logger(RegisterController.name);

  constructor(private readonly authService: AuthService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'User successfully registered',
    type: AuthResponse
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid input data', 
    type: MessageResponse 
  })
  @ApiConflictResponse({ 
    description: 'Username or email already exists', 
    type: MessageResponse 
  })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
    try {
      // Check if username already exists
      const usernameExists = await this.authService.checkUsernameExists(registerDto.username);
      if (usernameExists) {
        throw new ConflictException('Username already exists');
      }

      // Check if email already exists
      const emailExists = await this.authService.checkEmailExists(registerDto.email);
      if (emailExists) {
        throw new ConflictException('Email already exists');
      }

      // Register the user
      const result = await this.authService.register(registerDto);
      
      // Send verification email
      await this.authService.sendVerificationEmail(result.email);
      
      return result;
    } catch (error) {
      this.logger.error(`Registration failed: ${error.message}`, error.stack);
      
      if (error instanceof ConflictException) {
        throw error;
      }
      
      throw new BadRequestException(error.message || 'Registration failed');
    }
  }
}
