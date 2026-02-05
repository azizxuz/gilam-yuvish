// import { Injectable } from '@nestjs/common';
// import startText from 'src/data/start.text';
// import type { Context } from 'telegraf';
// import { Markup } from 'telegraf';

// type Step = 'idle' | 'route' | 'time' | 'gender' | 'phone';

// type OrderDraft = {
//   step: Step;
//   route?: string;
//   time?: string;
//   gender?: 'Ayol' | 'Erkak';
//   phone?: string;
// };

// type SessionCtx = Context & {
//   session?: {
//     order?: OrderDraft;
//   };
// };

// @Injectable()
// export class OrderFlow {
//   private readonly ORDER_CHANNEL_ID = process.env.ORDER_CHANNEL_ID!; // -100...

//   private getOrder(ctx: SessionCtx): OrderDraft {
//     if (!ctx.session) ctx.session = {};
//     if (!ctx.session.order) ctx.session.order = { step: 'idle' };
//     return ctx.session.order;
//   }

//   async start(ctx: SessionCtx): Promise<void> {
//     const order = this.getOrder(ctx);
//     order.step = 'route';

//     // startdagi xabarni o'chirib yuborish (inline bosilganda ishlaydi)
//     try {
//       await (ctx as any).deleteMessage();
//     } catch {}

//     await ctx.reply(`Iltimos yo'nalishni tanlang:`, {
//       reply_markup: {
//         inline_keyboard: [
//           [
//             {
//               text: "BESHARIQ → FARG'ONA",
//               callback_data: 'route:beshariq-fargona',
//             },
//           ],
//           [
//             {
//               text: "FARG'ONA → BESHARIQ",
//               callback_data: 'route:fargona-beshariq',
//             },
//           ],
//           [{ text: '❌ Bekor qilish', callback_data: 'order:cancel' }],
//         ],
//       },
//     });
//   }

//   async onRoute(ctx: SessionCtx, data: string): Promise<void> {
//     const order = this.getOrder(ctx);
//     if (order.step !== 'route') return;

//     if (data === 'order:cancel') {
//       order.step = 'idle';

//       // 1) Pastki keyboardni olib tashlash
//       await ctx.reply('❌ Buyurtma bekor qilindi.', {
//         reply_markup: { remove_keyboard: true },
//       });

//       // 2) Start text + inline tugmalar
//       await ctx.reply(startText, {
//         reply_markup: {
//           inline_keyboard: [
//             [{ text: '🔄 Qayta boshlash', callback_data: 'order' }],
//             [
//               {
//                 text: '👨‍💻 Admin bilan aloqa',
//                 url: 'https://t.me/beshariq_admin',
//               },
//             ],
//           ],
//         },
//       });

//       return;
//     }


//     if (!data.startsWith('route:')) return;

//     order.route =
//       data === 'route:beshariq-fargona'
//         ? "BESHARIQ → FARG'ONA"
//         : "FARG'ONA → BESHARIQ";
//     order.step = 'time';

//     await ctx.reply(
//       'Soat nechida ketasiz? (masalan: 14:30 yoki 8:00)',
//       Markup.keyboard([[{ text: '⏰ Hozir' }]])
//         .resize()
//         .oneTime(),
//     );
//   }

//   async onTime(ctx: SessionCtx, text: string): Promise<void> {
//     const order = this.getOrder(ctx);
//     if (order.step !== 'time') return;

//     order.time = text === '⏰ Hozir' ? 'Hozir' : text;
//     order.step = 'gender';

//     await ctx.reply('Jinsni tanlang:', {
//       reply_markup: {
//         inline_keyboard: [
//           [{ text: '👩 Ayol', callback_data: 'gender:Ayol' }],
//           [{ text: '👨 Erkak', callback_data: 'gender:Erkak' }],
//           [{ text: '❌ Bekor qilish', callback_data: 'order:cancel' }],
//         ],
//       },
//     });
//   }

//   async onGender(ctx: SessionCtx, data: string): Promise<void> {
//     const order = this.getOrder(ctx);
//     if (order.step !== 'gender') return;

//     if (data === 'order:cancel') {
//       order.step = 'idle';

//       // 1) Pastki keyboardni olib tashlash
//       await ctx.reply('❌ Buyurtma bekor qilindi.', {
//         reply_markup: { remove_keyboard: true },
//       });

//       // 2) Start text + inline tugmalar
//       await ctx.reply(startText, {
//         reply_markup: {
//           inline_keyboard: [
//             [{ text: '🔄 Qayta boshlash', callback_data: 'order' }],
//             [
//               {
//                 text: '👨‍💻 Admin bilan aloqa',
//                 url: 'https://t.me/azez_coder',
//               },
//             ],
//           ],
//         },
//       });

//       return;
//     }


//     if (!data.startsWith('gender:')) return;

//     order.gender = data.replace('gender:', '') as any;
//     order.step = 'phone';

//     await ctx.reply(
//       'Telefon raqamingizni yuboring (tugmani bosing) yoki raqamni yozing:',
//       Markup.keyboard([
//         [Markup.button.contactRequest('📞 Telefon raqamni yuborish')],
//       ])
//         .resize()
//         .oneTime(),
//     );
//   }

//   async onPhone(ctx: SessionCtx, msg: any): Promise<void> {
//     const order = this.getOrder(ctx);
//     if (order.step !== 'phone') return;

//     let phone: string | undefined;
//     if (msg?.contact?.phone_number) phone = msg.contact.phone_number;
//     else if (msg?.text) phone = msg.text;

//     if (!phone) {
//       await ctx.reply('Telefon raqamni yuboring yoki yozing.');
//       return;
//     }

//     order.phone = phone;

//     // user info
//     const from: any = (ctx as any).from;
//     const fullName = from
//       ? [from.first_name, from.last_name].filter(Boolean).join(' ').trim()
//       : '-';
//     const username = from?.username ? '@' + from.username : '-';
//     const userId = from?.id ? String(from.id) : '-';

//     const textToChannel =
//       `🚕 Yangi buyurtma!\n\n` +
//       `📍 Yo'nalish: ${order.route}\n` +
//       `⏰ Vaqt: ${order.time}\n` +
//       `👤 Jins: ${order.gender}\n` +
//       `📞 Telefon: ${order.phone}\n\n` +
//       `🧾 Mijoz: ${fullName}\n` +
//       `🔗 Username: ${username}\n` +
//       `🆔 ID: ${userId}`;

//     // foydalanuvchiga javob

// await ctx.reply(
//   "✅ Buyurtmangiz qabul qilindi! Tez orada Operatorlarimiz siz bilan bog'lanishadi.",
//   {
//     reply_markup: {
//       remove_keyboard: true,
//       inline_keyboard: [
//         [{ text: '🔄 Qayta buyurtma berish', callback_data: 'order' }],
//         [{ text: '👨‍💻 Admin bilan aloqa', url: 'https://t.me/azez_coder' }],
//       ],
//     },
//   },
// );


//     // kanalga yuborish
//     await ctx.telegram.sendMessage(this.ORDER_CHANNEL_ID, textToChannel);

//     // reset
//     ctx.session!.order = { step: 'idle' };
//   }
// }
