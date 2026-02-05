import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { StartService } from './start.service';

@Module({
  imports: [PrismaModule],
  providers: [StartService],
  exports: [StartService],
})
export class StartModule {}
