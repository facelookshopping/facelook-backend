import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Module({
  providers: [PaymentsService],
  exports: [PaymentsService], // ✅ Exporting so OrdersModule can use it
})
export class PaymentsModule {}