// src/handlers/order.handler.ts
import { Injectable } from '@nestjs/common';
import { SERVICES } from '@prisma/client';
import { SERVICE_META } from '../services.meta';
import { InlineKeyboardButton } from 'telegraf/types';
import { PrismaService } from 'src/prisma/prisma.service';
import { Markup } from 'telegraf';
import { Region, REGIONS } from '../contants/region';

@Injectable()
export class OrderHandler {
  constructor(private readonly prisma: PrismaService) {}

  // Viloyat tanlash (birinchi qadam)
  async showRegions(ctx: any) {
    // Session boshlash
    ctx.session.currentOrder = { items: [] };

    const regions = Object.entries(REGIONS);
    const keyboard: InlineKeyboardButton.CallbackButton[][] = [];

    // Viloyatlarni 2 tadan qatorga joylashtirish
    for (let i = 0; i < regions.length; i += 2) {
      const row: InlineKeyboardButton.CallbackButton[] = [];

      row.push({
        text: regions[i][1],
        callback_data: `region:${regions[i][0]}`,
      });

      if (i + 1 < regions.length) {
        row.push({
          text: regions[i + 1][1],
          callback_data: `region:${regions[i + 1][0]}`,
        });
      }

      keyboard.push(row);
    }

    keyboard.push([
      {
        text: '❌ Bekor qilish',
        callback_data: 'go_start',
      },
    ]);

    // Avvalgi xabarni o'chirish
    try {
      await ctx.deleteMessage();
    } catch (error) {
      // Ignore
    }

    await ctx.reply('🌍 Viloyatingizni tanlang:', {
      reply_markup: { inline_keyboard: keyboard },
    });
  }

  // Viloyat tanlanganda
  async selectRegion(ctx: any, region: Region) {
    if (!ctx.session.currentOrder) {
      ctx.session.currentOrder = { items: [] };
    }

    ctx.session.currentOrder.region = REGIONS[region];

    // Xizmatlar ro'yxatini ko'rsatish
    await this.showServices(ctx);
  }

  // Xizmatlarni ko'rsatish
  async showServices(ctx: any) {
    const services = Object.values(SERVICES);

    const keyboard: InlineKeyboardButton.CallbackButton[][] = services.reduce(
      (rows, service, index) => {
        if (index % 2 === 0) {
          rows.push([]);
        }
        rows[rows.length - 1].push({
          text: SERVICE_META[service].title,
          callback_data: `select:${service}`,
        });
        return rows;
      },
      [] as InlineKeyboardButton.CallbackButton[][],
    );

    keyboard.push([
      {
        text: '❌ Bekor qilish',
        callback_data: 'go_start',
      },
    ]);

    // Avvalgi xabarni o'chirish
    try {
      await ctx.deleteMessage();
    } catch (error) {
      // Ignore
    }

    const region = ctx.session.currentOrder?.region || '';
    await ctx.reply(`🌍 Viloyat: ${region}\n\nKerakli xizmatlarni tanlang:`, {
      reply_markup: { inline_keyboard: keyboard },
    });
  }

  // Xizmat tanlanganda
  async selectService(ctx: any, service: SERVICES) {
    const meta = SERVICE_META[service];

    if (!ctx.session.currentOrder) {
      ctx.session.currentOrder = { items: [] };
    }
    ctx.session.currentOrder.currentService = service;
    ctx.session.currentOrder.currentValue = 0;

    // Avvalgi xabarni o'chirish
    try {
      await ctx.deleteMessage();
    } catch (error) {
      // Ignore
    }

    // Agar area type bo'lsa - text kutamiz
    if (meta.type === 'area') {
      ctx.session.waitingForArea = true;

      // Agar photo telegram link bo'lsa
      if (meta.photo.startsWith('https://t.me/')) {
        const parts = meta.photo.split('/');
        const messageId = parseInt(parts[parts.length - 1]);
        const channelId = `-100${parts[parts.length - 2]}`;

        try {
          await ctx.telegram.copyMessage(ctx.chat.id, channelId, messageId, {
            caption: `${meta.description}\n\n📏 Maydonni kiriting (kv.m):`,
            reply_markup: {
              inline_keyboard: [[{ text: '🔙 Ortga', callback_data: 'order' }]],
            },
          });
        } catch (error) {
          console.error('Copy message error:', error);
          await ctx.reply(
            `${meta.description}\n\n📏 Maydonni kiriting (kv.m):`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔙 Ortga', callback_data: 'order' }],
                ],
              },
            },
          );
        }
      } else {
        await ctx.replyWithPhoto(meta.photo, {
          caption: `${meta.description}\n\n📏 Maydonni kiriting (kv.m):`,
          reply_markup: {
            inline_keyboard: [[{ text: '🔙 Ortga', callback_data: 'order' }]],
          },
        });
      }
    } else {
      // Count/chairs uchun button
      const keyboard: InlineKeyboardButton.CallbackButton[][] = [
        [
          { text: '➖', callback_data: 'decrease' },
          { text: '0', callback_data: 'value' },
          { text: '➕', callback_data: 'increase' },
        ],
        [{ text: '✅ Davom etish', callback_data: 'continue_order' }],
        [{ text: '🔙 Ortga', callback_data: 'order' }],
      ];

      // Agar photo telegram link bo'lsa
      if (meta.photo.startsWith('https://t.me/')) {
        const parts = meta.photo.split('/');
        const messageId = parseInt(parts[parts.length - 1]);
        const channelId = `-100${parts[parts.length - 2]}`;

        try {
          await ctx.telegram.copyMessage(ctx.chat.id, channelId, messageId, {
            caption: meta.description,
            reply_markup: { inline_keyboard: keyboard },
          });
        } catch (error) {
          console.error('Copy message error:', error);
          await ctx.reply(meta.description, {
            reply_markup: { inline_keyboard: keyboard },
          });
        }
      } else {
        await ctx.replyWithPhoto(meta.photo, {
          caption: meta.description,
          reply_markup: { inline_keyboard: keyboard },
        });
      }
    }
  }

  // + bosilganda
  async increase(ctx: any) {
    if (ctx.session.currentOrder?.currentValue === undefined) {
      ctx.session.currentOrder.currentValue = 0;
    }
    ctx.session.currentOrder.currentValue++;

    await this.updateValueDisplay(ctx);
  }

  // - bosilganda
  async decrease(ctx: any) {
    if (ctx.session.currentOrder?.currentValue > 0) {
      ctx.session.currentOrder.currentValue--;
      await this.updateValueDisplay(ctx);
    }
  }

  // Qiymat displayni yangilash
  private async updateValueDisplay(ctx: any) {
    const value = ctx.session.currentOrder?.currentValue || 0;
    const service = ctx.session.currentOrder?.currentService;
    const meta = SERVICE_META[service];

    const keyboard: InlineKeyboardButton.CallbackButton[][] = [
      [
        { text: '➖', callback_data: 'decrease' },
        { text: value.toString(), callback_data: 'value' },
        { text: '➕', callback_data: 'increase' },
      ],
      [{ text: '✅ Davom etish', callback_data: 'continue_order' }],
      [{ text: '🔙 Ortga', callback_data: 'order' }],
    ];

    try {
      await ctx.editMessageCaption(meta.description, {
        reply_markup: { inline_keyboard: keyboard },
      });
    } catch (error) {
      // Agar edit ishlamasa, ignore qilamiz
    }
  }

  // Text kiritilganda (area uchun)
  async handleAreaInput(ctx: any, text: string) {
    if (!ctx.session.waitingForArea) return false;

    const area = parseFloat(text);
    if (isNaN(area) || area <= 0) {
      await ctx.reply("❌ Noto'g'ri qiymat! Iltimos, raqam kiriting.");
      return true;
    }

    ctx.session.currentOrder.currentValue = area;
    delete ctx.session.waitingForArea;

    await this.continueOrder(ctx);
    return true;
  }

  // Davom etish
  async continueOrder(ctx: any) {
    const { currentService, currentValue, items } = ctx.session.currentOrder;

    if (!currentValue || currentValue === 0) {
      await ctx.answerCbQuery('❗️ Miqdorni kiriting!');
      return;
    }

    const meta = SERVICE_META[currentService];

    // Item qo'shish
    const newItem: any = { service: currentService };

    if (meta.type === 'count' || meta.type === 'chairs') {
      newItem.count = currentValue;
    } else if (meta.type === 'area') {
      newItem.area = currentValue;
    }

    items.push(newItem);

    // Reset current values
    delete ctx.session.currentOrder.currentService;
    delete ctx.session.currentOrder.currentValue;

    // Hozirgi buyurtmani ko'rsatish
    const orderSummary = this.getOrderSummary(items);

    // Yana xizmat tanlash yoki tasdiqlash
    const services = Object.values(SERVICES);
    const keyboard: InlineKeyboardButton.CallbackButton[][] = services.reduce(
      (rows, service, index) => {
        if (index % 2 === 0) {
          rows.push([]);
        }
        rows[rows.length - 1].push({
          text: SERVICE_META[service].title,
          callback_data: `select:${service}`,
        });
        return rows;
      },
      [] as InlineKeyboardButton.CallbackButton[][],
    );

    keyboard.push([{ text: '✅ Tasdiqlash', callback_data: 'confirm_order' }]);
    keyboard.push([{ text: '❌ Bekor qilish', callback_data: 'go_start' }]);

    try {
      await ctx.deleteMessage();
    } catch (error) {
      // Ignore
    }

    await ctx.reply(
      `✅ Qo'shildi!\n\n${orderSummary}\n\nYana xizmat tanlaysizmi?`,
      {
        reply_markup: { inline_keyboard: keyboard },
      },
    );
  }

  // Buyurtma xulosasini yaratish
  private getOrderSummary(items: any[]): string {
    const grouped = {};

    items.forEach((item) => {
      const meta = SERVICE_META[item.service];
      const value = item.count || item.area;
      const unit = meta.type === 'area' ? 'kv.m' : 'dona';

      if (grouped[item.service]) {
        grouped[item.service].count += value;
      } else {
        grouped[item.service] = {
          title: meta.title,
          count: value,
          unit,
        };
      }
    });

    const parts = Object.values(grouped).map(
      (g: any) => `${g.count} ${g.unit} ${g.title}`,
    );

    return `📋 Buyurtma:\n\n${parts.join('\n')}`;
  }

  // Buyurtmani tasdiqlash (telefon so'rash)
  async confirmOrder(ctx: any) {
    const { items } = ctx.session.currentOrder || {};

    if (!items || items.length === 0) {
      await ctx.answerCbQuery('❗️ Hech qanday xizmat tanlanmagan!');
      return;
    }

    ctx.session.waitingForPhone = true;

    const keyboard = Markup.keyboard([
      Markup.button.contactRequest('📱 Telefon raqamni yuborish'),
    ])
      .resize()
      .oneTime();

    await ctx.reply(
      '📱 Telefon raqamingizni yuboring yoki kiriting:\n\nMasalan: +998901234567',
      keyboard,
    );
  }

  // Telefon qabul qilish
  async handlePhoneInput(ctx: any) {
    if (!ctx.session.waitingForPhone) return false;

    let phoneNumber: string;

    // Contact yuborilgan bo'lsa
    if (ctx.message?.contact) {
      phoneNumber = ctx.message.contact.phone_number;
    }
    // Text kiritilgan bo'lsa
    else if (ctx.message?.text) {
      phoneNumber = ctx.message.text.replace(/\s/g, '');

      // Telefon formatini tekshirish
      if (!/^\+?998\d{9}$/.test(phoneNumber)) {
        await ctx.reply(
          "❌ Noto'g'ri format!\n\nIltimos, to'g'ri formatda kiriting:\n+998901234567",
        );
        return true;
      }
    } else {
      return false;
    }

    ctx.session.currentOrder.phoneNumber = phoneNumber;
    delete ctx.session.waitingForPhone;
    ctx.session.waitingForLocation = true;

    const keyboard = Markup.keyboard([
      Markup.button.locationRequest('📍 Manzilni yuborish'),
    ])
      .resize()
      .oneTime();

    await ctx.reply(
      '📍 Manzilingizni yuboring yoki kiriting:\n\nMasalan: Toshkent, Chilonzor tumani, 12-mavze',
      keyboard,
    );

    return true;
  }

  // Manzil qabul qilish (location yoki text)
  async handleLocationInput(ctx: any) {
    if (!ctx.session.waitingForLocation) return false;

    let address: string;

    // Location yuborilgan bo'lsa
    if (ctx.message?.location) {
      const { latitude, longitude } = ctx.message.location;

      // Google Maps linkini yaratish
      address = `📍 Koordinatlar: ${latitude}, ${longitude}\n🗺 https://maps.google.com/?q=${latitude},${longitude}`;
    }
    // Text kiritilgan bo'lsa
    else if (ctx.message?.text) {
      address = ctx.message.text.trim();

      if (address.length < 5) {
        await ctx.reply("❌ Iltimos, to'liq manzilni kiriting!");
        return true;
      }
    } else {
      return false;
    }

    ctx.session.currentOrder.address = address;
    delete ctx.session.waitingForLocation;

    await this.saveOrder(ctx);
    return true;
  }

  // Buyurtmani saqlash
  private async saveOrder(ctx: any) {
    const { items, phoneNumber, address, region } = ctx.session.currentOrder;

    try {
      // Database ga saqlash
      const order = await this.prisma.order.create({
        data: {
          telegramId: BigInt(ctx.from.id),
          phoneNumber,
          address,
          region,
          status: 'NEW',
          items: {
            create: items.map((item) => ({
              service: item.service,
              count: item.count,
              area: item.area,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Buyurtma xulosasi
      let message = '✅ *Buyurtma qabul qilindi!*\n\n';
      message += `🆔 Buyurtma raqami: #${order.id}\n`;
      message += `🌍 Viloyat: ${region}\n\n`;
      message += '📦 *Xizmatlar:*\n';

      order.items.forEach((item, index) => {
        const meta = SERVICE_META[item.service];
        const value = item.count || item.area;
        const unit = meta.type === 'area' ? 'kv.m' : 'dona';
        message += `${index + 1}. ${meta.title}: ${value} ${unit}\n`;
      });

      message += `\n📱 Telefon: ${phoneNumber}`;
      message += `\n📍 Manzil: ${address}`;
      message += "\n\nTez orada siz bilan bog'lanamiz! ✨";

      // Session tozalash
      delete ctx.session.currentOrder;

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 Bosh menyu', callback_data: 'go_start' }],
          ],
        },
      });

      // Telegram kanalga yuborish
      await this.sendToChannel(order);
    } catch (error) {
      console.error('Order creation error:', error);
      await ctx.reply("❌ Xatolik yuz berdi. Qaytadan urinib ko'ring.");
    }
  }

  // Telegram kanalga yuborish
  private async sendToChannel(order: any) {
    const channelId = process.env.ORDERS_CHANNEL_ID;
    if (!channelId) return;

    try {
      let message = `🔔 *Yangi buyurtma!*\n\n`;
      message += `🆔 Buyurtma: #${order.id}\n`;
      message += `🌍 Viloyat: ${order.region}\n`;
      message += `👤 Telegram ID: \`${order.telegramId}\`\n\n`;
      message += '📦 *Xizmatlar:*\n';

      order.items.forEach((item, index) => {
        const meta = SERVICE_META[item.service];
        const value = item.count || item.area;
        const unit = meta.type === 'area' ? 'kv.m' : 'dona';
        message += `${index + 1}. ${meta.title}: *${value} ${unit}*\n`;
      });

      message += `\n📱 Telefon: \`${order.phoneNumber}\``;
      message += `\n📍 Manzil: ${order.address}`;
      message += `\n\n⏰ Vaqt: ${new Date().toLocaleString('uz-UZ')}`;

      const { default: axios } = await import('axios');
      await axios.post(
        `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,
        {
          chat_id: channelId,
          text: message,
          parse_mode: 'Markdown',
        },
      );
    } catch (error) {
      console.error('Send to channel error:', error);
    }
  }
}
