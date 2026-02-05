

import { Injectable } from '@nestjs/common';
import startText from 'src/data/start.text';
import { StartService } from 'src/services/start/start.service';
import { Context } from 'telegraf';

@Injectable()
export class StartCommand {
    constructor(private userRepo:StartService){}
  async handle(ctx: Context) {
    const from = ctx.from;

    if (from) {
      const telegramUserId = from.id;
      const username = from.username ?? null;

      const fullName = [from.first_name, from.last_name]
        .filter(Boolean)
        .join(' ')
        .trim();
      const userId = String(telegramUserId);
      // ✅ repodagi tayyor method
      await this.userRepo.createUser({
        userId,
        userName: username,
        fullName: fullName,
      });
    }
    
    await ctx.reply(
      `Assalomu alaykum, ${from?.first_name}! 🙂

Xizmat botimizda ko‘rib turganimizdan xursandmiz.

Buyurtma beish uchun menyudan foydalaning! 👇`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Buyurtma berish', callback_data: 'order' }],
            [{ text: 'Buyurtmalarim', callback_data: 'my_orders' }],
            [
              {
                text: 'Operator bilan aloqa',
                callback_data: 'contact_operator',
              },
            ],
            [
              {
                text: 'Biz haqimizda',
                url: 'https://ishonch-gilam-yuvish.uz/index-uz.html',
              },
            ],
          ],
        },
      },
    );
  }
}

