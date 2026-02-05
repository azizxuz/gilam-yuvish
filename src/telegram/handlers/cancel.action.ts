import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';

@Injectable()
export class CancelAction {
  async handle(ctx: Context) {
    await  ctx.reply('🛑 Bekor qilish handler ishladi');
  }
}
