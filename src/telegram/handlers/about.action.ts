

import { Injectable } from '@nestjs/common';
import aboutText from 'src/data/about.text';
import startText from 'src/data/start.text';
import { StartService } from 'src/services/start/start.service';
import { Context } from 'telegraf';

@Injectable()
export class AboutCommand {
    constructor(private userRepo:StartService){}
  async handle(ctx: Context) {
   
    
    await ctx.reply(aboutText,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Buyurtma berish', callback_data: 'order' }],
            [{ text: 'Buyurtmalarim', callback_data: 'my_orders' }],
            [{ text: 'Operator bilan aloqa', callback_data: 'contact_operator' }],
            // [{ text: 'Biz haqimizda', callback_data: 'about' }],
          ],
        },
      },
    );
  }
}

