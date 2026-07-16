import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true → LINE webhook の署名検証に必要な「生のリクエストボディ」を保持する。
  // 既存エンドポイントの JSON パースには影響しない (rawBody は追加で保持されるだけ)。
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  // Render の前段 LB は 1 hop → これが無いと req.ip が全クライアント共通になり throttler が DoS 装置化する。
  app.set('trust proxy', 1);

  const offset = new Date().getTimezoneOffset(); // JST = -540 (env文字列でなく実測)
  if (offset !== -540) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('TZ must be Asia/Tokyo (offset=-540)');
    }
    Logger.warn(`TZ is not Asia/Tokyo (offset=${offset}) — 日付処理がズレます`, 'Bootstrap');
  }
  if (process.env.NODE_ENV === 'production' && (process.env.JWT_SECRET ?? '').length < 32) {
    throw new Error('JWT_SECRET must be at least 32 chars in production');
  }

  // 入力値の点検係。検証デコレータ (@IsString 等) を付けたフィールドだけを点検する。
  // transform:false / whitelist:false = 値の変換も未知フィールドの除去もしない＝デコレータ
  // 未設定の DTO・フィールドは従来どおり素通り。段階的に検証を足せる安全な構成。
  app.useGlobalPipes(
    new ValidationPipe({
      transform: false,
      whitelist: false,
    }),
  );
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3900' });
  await app.listen(process.env.API_PORT ?? 3333);
}
bootstrap();
