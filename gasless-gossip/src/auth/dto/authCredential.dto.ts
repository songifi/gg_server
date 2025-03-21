import { IsEmail, IsNotEmpty, IsString, Length } from "class-validator";

export class AuthCredentialsDto {
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    email!: string;
  
    @IsString({ message: 'Password must be a string' })
    @IsNotEmpty({ message: 'Password is required' })
    @Length(8, 32, { message: 'Password must be between 8 and 32 characters' })
    password!: string;
  }