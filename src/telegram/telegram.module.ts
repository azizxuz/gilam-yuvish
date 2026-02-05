import { Module } from '@nestjs/common';
import { StartModule } from 'src/services/start/start.module';
import { OrderModule } from 'src/services/orders/order.module';

import { TelegramUpdate } from './telegram.update';
import { StartCommand } from './handlers/start.handler';
import { CancelAction } from './handlers/cancel.action';
import { AboutCommand } from './handlers/about.action';
import { Operatorcommand } from './handlers/operator.action';
import { OrderHandler } from './handlers/order.handler';
import { MyOrdersHandler } from './handlers/my-orders.handler';

@Module({
  imports: [StartModule,],
  providers: [TelegramUpdate, StartCommand, CancelAction,AboutCommand,Operatorcommand,OrderHandler,MyOrdersHandler ],
})
export class TelegramModule {}
