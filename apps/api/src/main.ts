import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true → LINE webhook の署名検証に必要な「生のリクエストボディ」を保持する。
  // 既存エンドポイントの JSON パースには影響しない (rawBody は追加で保持されるだけ)。
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3900' });
  await app.listen(process.env.API_PORT ?? 3333);
}
bootstrap();
