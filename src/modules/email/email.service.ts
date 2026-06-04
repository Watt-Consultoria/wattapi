import { Injectable } from '@nestjs/common';
import { EnvService } from '../../config/env.service';

import type { Transporter, SendMailOptions } from 'nodemailer';
import nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter: Transporter;

  constructor(private readonly env: EnvService) {
    this.transporter = nodemailer.createTransport({
      host: this.env.get('EMAIL_SMTP_HOST'),
      port: Number(this.env.get('EMAIL_SMTP_PORT')),
      secure: this.env.get('NODE_ENV') === 'production',
      auth: {
        user: this.env.get('EMAIL_SMTP_USER'),
        pass: this.env.get('EMAIL_SMTP_PASSWORD'),
      },
    });
  }

  async send({
    to,
    subject,
    html,
    text,
  }: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    await this.transporter.sendMail({
      from: '"Watt Consultoria" <email@wattconsultoria.com.br>',
      to,
      subject,
      text,
      html,
      replyTo: '"Gestão de Pessoas" <pessoas@wattconsultoria.com.br>',
    } as SendMailOptions);
  }
}
