import { UseGuards, Controller, Patch, Param, Body } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { Roles } from "src/auth/roles.decorator";
import { RolesGuard } from "src/auth/roles.guard";
import { UserRole } from "src/users/user.entity";
import { OrderStatus } from "./order.entity";
import { OrdersService } from "./orders.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private ordersService: OrdersService) {}

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async updateStatus(
    @Param('id') id: number, 
    @Body('status') status: OrderStatus
  ) {
    // Logic to update status
    return this.ordersService.updateStatus(id, status);
  }
}