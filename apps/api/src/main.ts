import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true → LINE webhook の署名検証に必要な「生のリクエストボディ」を保持する。
  // 既存エンドポイントの JSON パースには影響しない (rawBody は追加で保持されるだけ)。
  const app = await NestFactory.create(AppModule, { rawBody: true });
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
