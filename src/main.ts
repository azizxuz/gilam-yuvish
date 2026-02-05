import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.enableCors();

  // SIGINT/SIGTERM larni Nest o'zi ushlasin (Telegraf ham shu orqali to'xtaydi)
  app.enableShutdownHooks();

  // ✅ Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Taxi Telegram Bot API')
    .setDescription('API documentation')
    .setVersion('1.0.0')
    // agar auth bo'lsa keyin qo'shasan:
    // .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const PORT = Number(process.env.PORT) || 3000;
  await app.listen(PORT, '0.0.0.0');

  console.log(`🚀 Server running: http://localhost:${PORT}/api/v1`);
  console.log(`📚 Swagger: http://localhost:${PORT}/api/docs`);
}

bootstrap().catch((e) => {
  console.error('❌ Bootstrap fatal error:', e);
  process.exit(1);
});
