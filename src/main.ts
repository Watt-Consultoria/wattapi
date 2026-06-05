import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { EnvService } from './config/env.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  const envService = app.get(EnvService);
  const PORT = envService.get('PORT');

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://wattdash.wattconsultoria.com.br',
      'https://new-watt-dash.vercel.app',
      /^https?:\/\/.*\.vercel\.app$/,
    ],
    credentials: true,
  });

  await app.listen(PORT);
}

void bootstrap();
