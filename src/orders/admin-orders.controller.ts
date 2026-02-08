import { UseGuards, Controller, Patch, Param, Body, ParseIntPipe } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { Roles } from "src/auth/roles.decorator";
import { RolesGuard } from "src/auth/roles.guard";
import { UserRole } from "src/users/user.entity";
import { UpdateOrderStatusDto } from "./dto/update-status.dto";
import { OrdersService } from "./orders.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private ordersService: OrdersService) {}

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async updateStatus(
    @Param('id', ParseIntPipe) id: number, 
    @Body() dto: UpdateOrderStatusDto
  ) {
    return this.ordersService.updateStatus(id, dto.status, dto.description);
  }
}