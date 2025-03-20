// src/modules/user/controllers/user-registration.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';

import { UserRegistrationService } from '../services/user-registration.service';
import { RegisterUserDto } from '../dto/register-user.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { CheckUsernameDto } from '../dto/check-username.dto';

@ApiTags('user-registration')
@Controller('auth')
export class UserRegistrationController {
  constructor(private readonly userRegistrationService: UserRegistrationService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User successfully registered',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email or username already in use',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async register(@Body() registerUserDto: RegisterUserDto) {
    const user = await this.userRegistrationService.registerUser(registerUserDto);
    
    return {
      message: 'Registration successful! Please check your email to verify your account.',
      user,
    };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify user email with token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email successfully verified',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or expired verification token',
  })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    const verified = await this.userRegistrationService.verifyEmail(verifyEmailDto.token);
    
    return {
      success: verified,
      message: 'Email verified successfully! You can now log in to your account.',
    };
  }

  @Get('check-username')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if username is available' })
  @ApiQuery({
    name: 'username',
    required: true,
    description: 'Username to check',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Username availability status',
  })
  async checkUsername(@Query('username') username: string) {
    const isAvailable = await this.userRegistrationService.isUsernameAvailable(username);
    
    return {
      username,
      available: isAvailable,
    };
  }
}
