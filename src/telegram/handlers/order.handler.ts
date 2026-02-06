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

    // Barcha xizmatlar uchun kalkulyator
    const keyboard = this.getCalculatorKeyboard(0);

    // Caption yaratish - area uchun boshqacha
    let caption: string;
    if (meta.type === 'area') {
      caption = `${meta.description}\n\n📏 Maydon: 0 kv.m`;
    } else {
      caption = `${meta.description}\n\n📊 Miqdor: 0`;
    }

    // Agar photo telegram link bo'lsa
    if (meta.photo.startsWith('https://t.me/')) {
      const parts = meta.photo.split('/');
      const messageId = parseInt(parts[parts.length - 1]);
      const channelId = `-100${parts[parts.length - 2]}`;

      try {
        await ctx.telegram.copyMessage(ctx.chat.id, channelId, messageId, {
          caption: caption,
          reply_markup: { inline_keyboard: keyboard },
        });
      } catch (error) {
        console.error('Copy message error:', error);
        await ctx.reply(caption, {
          reply_markup: { inline_keyboard: keyboard },
        });
      }
    } else {
      await ctx.replyWithPhoto(meta.photo, {
        caption: caption,
        reply_markup: { inline_keyboard: keyboard },
      });
    }
  }

  // Kalkulyator klaviaturasini yaratish
  private getCalculatorKeyboard(
    currentValue: number,
  ): InlineKeyboardButton.CallbackButton[][] {
    return [
      [
        { text: '1', callback_data: 'num:1' },
        { text: '2', callback_data: 'num:2' },
        { text: '3', callback_data: 'num:3' },
      ],
      [
        { text: '4', callback_data: 'num:4' },
        { text: '5', callback_data: 'num:5' },
        { text: '6', callback_data: 'num:6' },
      ],
      [
        { text: '7', callback_data: 'num:7' },
        { text: '8', callback_data: 'num:8' },
        { text: '9', callback_data: 'num:9' },
      ],
      [
        { text: '0', callback_data: 'num:0' },
        { text: "⌫ O'chirish", callback_data: 'num:clear' },
      ],
      [{ text: '✅ Davom etish', callback_data: 'continue_order' }],
      [{ text: '🔙 Ortga', callback_data: 'order' }],
    ];
  }

  // Raqam bosilganda
  async handleNumberInput(ctx: any, num: string) {
    if (!ctx.session.currentOrder?.currentService) {
      return;
    }

    let currentValue = ctx.session.currentOrder.currentValue || 0;

    if (num === 'clear') {
      // O'chirish - oxirgi raqamni o'chirish
      currentValue = Math.floor(currentValue / 10);
    } else {
      // Raqam qo'shish
      const digit = parseInt(num);
      currentValue = currentValue * 10 + digit;
    }

    ctx.session.currentOrder.currentValue = currentValue;

    await this.updateCalculatorDisplay(ctx);
  }

  // Kalkulyator displayni yangilash
  private async updateCalculatorDisplay(ctx: any) {
    const value = ctx.session.currentOrder?.currentValue || 0;
    const service = ctx.session.currentOrder?.currentService;
    const meta = SERVICE_META[service];

    const keyboard = this.getCalculatorKeyboard(value);

    // Caption yaratish - area uchun boshqacha
    let caption: string;
    if (meta.type === 'area') {
      caption = `${meta.description}\n\n📏 Maydon: ${value} kv.m`;
    } else {
      caption = `${meta.description}\n\n📊 Miqdor: ${value}`;
    }

    try {
      await ctx.editMessageCaption(caption, {
        reply_markup: { inline_keyboard: keyboard },
      });
    } catch (error) {
      // Agar edit ishlamasa, ignore qilamiz
    }
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

    await ctx.reply('⏳ Buyurtma saqlanmoqda...', {
      reply_markup: {
        remove_keyboard: true,
      },
    });

    await this.saveOrder(ctx);
    return true;
  }

  // Buyurtmani saqlash
  private async saveOrder(ctx: any) {
    const { items, phoneNumber, address, region } = ctx.session.currentOrder;

    // Foydalanuvchi ismini olish
    const firstName = ctx.from?.first_name || "Noma'lum";
    const lastName = ctx.from?.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();

    try {
      // Database ga saqlash
      const order = await this.prisma.order.create({
        data: {
          telegramId: BigInt(ctx.from.id),
          phoneNumber,
          address,
          region,
          fullName,
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
      message += `👤 Ism: ${fullName}\n`;
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
      message += `👤 Mijoz: ${order.fullName}\n`;
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
