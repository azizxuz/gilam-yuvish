// src/handlers/my-orders.handler.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SERVICE_META } from '../services.meta';
import { InlineKeyboardButton } from 'telegraf/types';

@Injectable()
export class MyOrdersHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(ctx: any) {
    const telegramId = BigInt(ctx.from.id);

    try {
      // Foydalanuvchining barcha buyurtmalarini olish
      const orders = await this.prisma.order.findMany({
        where: {
          telegramId,
        },
        include: {
          items: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10, // Oxirgi 10 ta buyurtma
      });

      if (orders.length === 0) {
        await ctx.reply("📋 Sizda hali buyurtmalar yo'q.", {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛒 Buyurtma berish', callback_data: 'order' }],
              [{ text: '🔙 Ortga', callback_data: 'go_start' }],
            ],
          },
        });
        return;
      }

      // Buyurtmalar ro'yxati
      const keyboard: InlineKeyboardButton.CallbackButton[][] = orders.map(
        (order) => [
          {
            text: `📦 #${order.id} - ${this.getStatusEmoji(order.status)} ${this.getStatusText(order.status)}`,
            callback_data: `view_order:${order.id}`,
          },
        ],
      );

      keyboard.push([{ text: '🔙 Ortga', callback_data: 'go_start' }]);

      await ctx.reply(
        `📋 *Mening buyurtmalarim* (oxirgi ${orders.length} ta):\n\nBatafsil ma'lumot olish uchun buyurtmani tanlang:`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard },
        },
      );
    } catch (error) {
      console.error('My orders error:', error);
      await ctx.reply("❌ Xatolik yuz berdi. Qaytadan urinib ko'ring.");
    }
  }

  // Bitta buyurtmani ko'rsatish
  async viewOrder(ctx: any, orderId: number) {
    const telegramId = BigInt(ctx.from.id);

    try {
      const order = await this.prisma.order.findFirst({
        where: {
          id: orderId,
          telegramId, // Faqat o'z buyurtmasini ko'rishi mumkin
        },
        include: {
          items: true,
        },
      });

      if (!order) {
        await ctx.answerCbQuery('❌ Buyurtma topilmadi!');
        return;
      }

      // Buyurtma ma'lumotlari
      let message = `📦 *Buyurtma #${order.id}*\n\n`;
      message += `📅 Sana: ${order.createdAt.toLocaleString('uz-UZ')}\n`;
      message += `🌍 Viloyat: ${order.region || "Ko'rsatilmagan"}\n`;
      message += `${this.getStatusEmoji(order.status)} Holat: *${this.getStatusText(order.status)}*\n\n`;
      message += '📋 *Xizmatlar:*\n';

      order.items.forEach((item, index) => {
        const meta = SERVICE_META[item.service];
        const value = item.count || item.area;
        const unit = meta.type === 'area' ? 'kv.m' : 'dona';
        message += `${index + 1}. ${meta.title}: ${value} ${unit}\n`;
      });

      message += `\n📱 Telefon: ${order.phoneNumber || "Ko'rsatilmagan"}`;
      message += `\n📍 Manzil: ${order.address || "Ko'rsatilmagan"}`;

      const keyboard: InlineKeyboardButton.CallbackButton[][] = [
        [{ text: '🔙 Buyurtmalarim', callback_data: 'my_orders' }],
        [{ text: '🏠 Bosh menyu', callback_data: 'go_start' }],
      ];

      // Agar buyurtma NEW holatida bo'lsa, bekor qilish tugmasini qo'shamiz
      if (order.status === 'NEW') {
        keyboard.unshift([
          {
            text: '❌ Bekor qilish',
            callback_data: `cancel_order:${order.id}`,
          },
        ]);
      }

      try {
        await ctx.deleteMessage();
      } catch (error) {
        // Ignore
      }

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard },
      });
    } catch (error) {
      console.error('View order error:', error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  }

  // Buyurtmani bekor qilish
  async cancelOrder(ctx: any, orderId: number) {
    const telegramId = BigInt(ctx.from.id);

    try {
      const order = await this.prisma.order.findFirst({
        where: {
          id: orderId,
          telegramId,
          status: 'NEW', // Faqat NEW holatidagi buyurtmalarni bekor qilish mumkin
        },
      });

      if (!order) {
        await ctx.answerCbQuery("❌ Buyurtmani bekor qilib bo'lmaydi!");
        return;
      }

      // Tasdiqlash so'rash
      const keyboard: InlineKeyboardButton.CallbackButton[][] = [
        [
          {
            text: '✅ Ha, bekor qilish',
            callback_data: `confirm_cancel:${orderId}`,
          },
        ],
        [
          {
            text: "❌ Yo'q",
            callback_data: `view_order:${orderId}`,
          },
        ],
      ];

      try {
        await ctx.deleteMessage();
      } catch (error) {
        // Ignore
      }

      await ctx.reply(`⚠️ Buyurtma #${orderId} ni bekor qilmoqchimisiz?`, {
        reply_markup: { inline_keyboard: keyboard },
      });
    } catch (error) {
      console.error('Cancel order error:', error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  }

  // Buyurtmani bekor qilishni tasdiqlash
  async confirmCancel(ctx: any, orderId: number) {
    const telegramId = BigInt(ctx.from.id);

    try {
      const order = await this.prisma.order.updateMany({
        where: {
          id: orderId,
          telegramId,
          status: 'NEW',
        },
        data: {
          status: 'CANCELLED',
        },
      });

      if (order.count === 0) {
        await ctx.answerCbQuery('❌ Buyurtma topilmadi!');
        return;
      }

      try {
        await ctx.deleteMessage();
      } catch (error) {
        // Ignore
      }

      await ctx.reply(`✅ Buyurtma #${orderId} bekor qilindi!`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📋 Buyurtmalarim', callback_data: 'my_orders' }],
            [{ text: '🏠 Bosh menyu', callback_data: 'go_start' }],
          ],
        },
      });

      // Kanalga xabar yuborish
      await this.notifyCancellation(orderId);
    } catch (error) {
      console.error('Confirm cancel error:', error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  }

  // Bekor qilish haqida kanalga xabar
  private async notifyCancellation(orderId: number) {
    const channelId = process.env.ORDERS_CHANNEL_ID;
    if (!channelId) return;

    try {
      const { default: axios } = await import('axios');
      await axios.post(
        `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,
        {
          chat_id: channelId,
          text: `🚫 Buyurtma #${orderId} mijoz tomonidan bekor qilindi!`,
        },
      );
    } catch (error) {
      console.error('Notify cancellation error:', error);
    }
  }

  // Status emoji
  private getStatusEmoji(status: string): string {
    const emojis = {
      NEW: '🆕',
      CONFIRMED: '✅',
      DONE: '✨',
      CANCELLED: '❌',
    };
    return emojis[status] || '❓';
  }

  // Status text
  private getStatusText(status: string): string {
    const texts = {
      NEW: 'Yangi',
      CONFIRMED: 'Tasdiqlandi',
      DONE: 'Bajarildi',
      CANCELLED: 'Bekor qilindi',
    };
    return texts[status] || "Noma'lum";
  }
}
