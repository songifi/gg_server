import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { IsStrongPassword } from 'src/utils/password-validation';


export class RegisterUserDto {
  @IsString({ message: 'Username must be a string' })
  @IsNotEmpty({ message: 'Username is required' })
  @Length(4, 20, { message: 'Username must be between 4 and 20 characters' })
  username!: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @Length(8, 32, { message: 'Password must be between 8 and 32 characters' })
  @IsStrongPassword({
    message: 'Password must meet the following criteria: 8-32 characters, including uppercase, lowercase, and either a number or special character. It cannot include common words, sequential characters, or repetitive patterns.'
  })
  password!: string;
}
