import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class LoginDto {
  @IsEmail() // Auto-checks for @ symbol and domain
  email: string;

  @IsNotEmpty()
  @MinLength(6) // Auto-fails if password is short
  password: string;

  @IsOptional()
  @IsString()
  fcmToken?: string;
}