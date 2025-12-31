import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../users/user.entity'; // Import your Enum

export const ROLES_KEY = 'roles';
// Accepts UserRole enum values (e.g., UserRole.ADMIN)
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);