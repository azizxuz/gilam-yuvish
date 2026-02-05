import { Update, Ctx, Start, Action, On } from 'nestjs-telegraf';
import type { Context } from 'telegraf';
import { StartCommand } from './handlers/start.handler';
import { AboutCommand } from './handlers/about.action';
import { Operatorcommand } from './handlers/operator.action';
import { OrderHandler } from './handlers/order.handler';
import { MyOrdersHandler } from './handlers/my-orders.handler';
import { SERVICES } from '@prisma/client';
import { Region } from './contants/region';

@Update()
export class TelegramUpdate {
  constructor(
    private readonly startCommand: StartCommand,
    private readonly aboutCommand: AboutCommand,
    private readonly operatorCommand: Operatorcommand,
    private readonly orderHandler: OrderHandler,
    private readonly myOrdersHandler: MyOrdersHandler,
  ) {}

  @Start()
  async start(@Ctx() ctx: Context): Promise<void> {
    await this.startCommand.handle(ctx);
  }

  @Action('about')
  async about(@Ctx() ctx: any): Promise<void> {
    await ctx.answerCbQuery();
    await ctx.deleteMessage();
    await this.aboutCommand.handle(ctx);
  }

  @Action('contact_operator')
  async contact(@Ctx() ctx: any): Promise<void> {
    await ctx.answerCbQuery();
    await ctx.deleteMessage();
    await this.operatorCommand.handle(ctx);
  }

  // Mening buyurtmalarim
  @Action('my_orders')
  async myOrders(@Ctx() ctx: any): Promise<void> {
    await ctx.answerCbQuery();
    try {
      await ctx.deleteMessage();
    } catch (error) {
      // Ignore
    }
    await this.myOrdersHandler.handle(ctx);
  }

  // Buyurtmani ko'rish
  @Action(/^view_order:(.+)$/)
  async viewOrder(@Ctx() ctx: any): Promise<void> {
    await ctx.answerCbQuery();
    const orderId = parseInt(ctx.match[1]);
    await this.myOrdersHandler.viewOrder(ctx, orderId);
  }

  // Buyurtmani bekor qilish
  @Action(/^cancel_order:(.+)$/)
  async cancelOrder(@Ctx() ctx: any): Promise<void> {
    await ctx.answerCbQuery();
    const orderId = parseInt(ctx.match[1]);
    await this.myOrdersHandler.cancelOrder(ctx, orderId);
  }

  // Bekor qilishni tasdiqlash
  @Action(/^confirm_cancel:(.+)$/)
  async confirmCancel(@Ctx() ctx: any): Promise<void> {
    await ctx.answerCbQuery();
    const orderId = parseInt(ctx.match[1]);
    await this.myOrdersHandler.confirmCancel(ctx, orderId);
  }

  // Order boshlash - viloyat tanlash
  @Action('order')
  async order(@Ctx() ctx: any): Promise<void> {
    await ctx.answerCbQuery();
    await this.orderHandler.showRegions(ctx);
  }

  // Viloyat tanlash
  @Action(/^region:(.+)$/)
  async selectRegion(@Ctx() ctx: any): Promise<void> {
    await ctx.answerCbQuery();
    const region = ctx.match[1] as Region;
    await this.orderHandler.selectRegion(ctx, region);
  }

  // Xizmat tanlash
  @Action(/^select:(.+)$/)
  async selectService(@Ctx() ctx: any): Promise<void> {
    await ctx.answerCbQuery();
    const service = ctx.match[1] as SERVICES;
    await this.orderHandler.selectService(ctx, service);
  }

  // Kalkulyator raqam bosilganda
  @Action(/^num:(.+)$/)
  async numberInput(@Ctx() ctx: any): Promise<void> {
    await ctx.answerCbQuery();
    const num = ctx.match[1];
    await this.orderHandler.handleNumberInput(ctx, num);
  }

  // Davom etish
  @Action('continue_order')
  async continueOrder(@Ctx() ctx: any): Promise<void> {
    await ctx.answerCbQuery();
    await this.orderHandler.continueOrder(ctx);
  }

  // Tasdiqlash
  @Action('confirm_order')
  async confirmOrder(@Ctx() ctx: any): Promise<void> {
    await ctx.answerCbQuery();
    await this.orderHandler.confirmOrder(ctx);
  }

  @Action('go_start')
  async goStart(@Ctx() ctx: any): Promise<void> {
    await ctx.answerCbQuery();
    await ctx.deleteMessage();
    await this.startCommand.handle(ctx);
  }

  // Contact qabul qilish
  @On('contact')
  async onContact(@Ctx() ctx: any): Promise<void> {
    await this.orderHandler.handlePhoneInput(ctx);
  }

  // Location qabul qilish
  @On('location')
  async onLocation(@Ctx() ctx: any): Promise<void> {
    await this.orderHandler.handleLocationInput(ctx);
  }

  // Text qabul qilish
  @On('text')
  async onText(@Ctx() ctx: any): Promise<void> {
    // Area kiritish
    if (await this.orderHandler.handleAreaInput(ctx, ctx.message.text)) {
      return;
    }

    // Telefon kiritish (text sifatida)
    if (await this.orderHandler.handlePhoneInput(ctx)) {
      return;
    }

    // Manzil kiritish (text sifatida)
    if (await this.orderHandler.handleLocationInput(ctx)) {
      return;
    }
  }
}
