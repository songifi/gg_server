import { BadRequestException, Body, Controller, ForbiddenException, Get, InternalServerErrorException, NotFoundException, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticationService } from './authentication.service';
import { LoginDTO, RefreshTokenDTO } from './dto';
import { JwtAuthGuard } from './guards/jwt.guard';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UserDocument } from 'src/modules/user/schemas/user.schema';
import { ethers } from 'ethers';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { GetUser } from './decorator';

@ApiTags('Authentication') // Adds a category in Swagger UI
@Controller('authentication')
export class AuthenticationController {
  constructor(
    private readonly authService: AuthenticationService,
    private readonly userService: UserService,
    private jwtService: JwtService
  ) {}

  @Post('signup')
  async signup(@Body() body: CreateUserDto): Promise<UserDocument | null> {
    const response = await this.authService.create(body);
    return response;
  }

  @Post('login')
  async login(@Body() body: LoginDTO): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return await this.authService.generateTokens(user);
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshTokenDTO): Promise<any> {
    return await this.authService.refreshAccessToken(body.refreshToken);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: Request) {
    const token = req.headers.authorization?.split(' ')[1]; // Extract token
    if (!token) return { message: 'No token provided' };

    await this.authService.blacklistToken(token, 3600); // Blacklist for 1 hour
    return { message: 'Logged out successfully' };
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: Request) {
    return req.user;
  }

  @Post('/wallet/challenge')  
  async createChallenge(@Body('walletAddress') walletAddress: string) {  
  // Input validation  
  if (!walletAddress) {  
    throw new BadRequestException('Wallet address is required.');  
  }  

  try {  
    // Generate challenge  
    const challenge = await this.authService.generateChallenge(walletAddress);  
    return { challenge };  
  } catch (error) {  
    // Log the error for debugging purposes  
    console.error('Error generating challenge:', error);  
    
    // Handle general errors  
    throw new InternalServerErrorException('An error occurred while generating the challenge.');  
  }  
  }  

  @Post('/wallet/verify')  
  async verifySignature(@Body('signature') signature: string, @Body('walletAddress') walletAddress: string) {  
  // Input validation  
  if (!signature || !walletAddress) {  
    throw new BadRequestException('Both signature and wallet address are required.');  
  }  

  try {  
    const challenge = this.authService.getChallenge(walletAddress);  
    
    if (!challenge) {  
      throw new NotFoundException('Challenge not found for the given wallet address.');  
    }  

    const message = ethers.hashMessage(challenge);  
    const recoveredAddress = ethers.verifyMessage(message, signature);  
    
    if (recoveredAddress.toLowerCase() === walletAddress.toLowerCase()) {  
      // Create and return JWT  
      const jwt = this.generateJWT(walletAddress);  // Implement JWT generation function  
      this.authService.deleteChallenge(walletAddress);  
      return { token: jwt };  
    } else {  
      throw new ForbiddenException('Invalid signature. Access denied.');  
    }  
  } catch (error) {  
    // Log the error for debugging purposes  
    console.error('Error verifying signature:', error);  

    // Throw an internal server error for unexpected issues  
    if (error instanceof NotFoundException || error instanceof ForbiddenException) {  
      throw error;  // Re-throw known error types  
    } else {  
      throw new InternalServerErrorException('An unexpected error occurred while verifying the signature.');  
    }  
  }  
  }  

  generateJWT(walletAddress: string): string {
    const payload = { walletAddress };
    return this.jwtService.sign(payload, { expiresIn: '1h' });
  }

  @UseGuards(AuthGuard('jwt')) // Protect this endpoint
  @Post('/wallet/associate')
  async associateWallet(@GetUser('id') userId: string, @Body('walletAddress') walletAddress: string) {
    await this.userService.associateWalletAddress(userId, walletAddress);
    return { message: 'Wallet associated successfully' };
  }
}