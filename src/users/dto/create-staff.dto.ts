import { IsEmail, IsEnum, IsString, MinLength, IsNotEmpty } from 'class-validator';
import { UserRole } from '../user.entity'; // Make sure this path is correct

export class CreateStaffDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  // This validates that the role passed is actually valid (admin, finance, etc.)
  @IsEnum(UserRole)
  role: UserRole;
}