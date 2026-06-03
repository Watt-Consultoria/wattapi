import { Injectable } from '@nestjs/common';
import { EnvService } from '../../config/env.service';

import type { Transporter, SendMailOptions } from 'nodemailer';
import nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter: Transporter;

  constructor(private readonly env: EnvService) {
    const user = this.env.get('EMAIL_SMTP_USER');
    const pass = this.env.get('EMAIL_SMTP_PASSWORD');
    this.transporter = nodemailer.createTransport({
      host: this.env.get('EMAIL_SMTP_HOST'),
      port: Number(this.env.get('EMAIL_SMTP_PORT')),
      secure: this.env.get('NODE_ENV') === 'production',
      ...(user && pass ? { auth: { user, pass } } : {}),
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
    try {
      await this.transporter.sendMail({
        from: '"Watt Consultoria" <email@wattconsultoria.com.br>',
        to,
        subject,
        text,
        html,
        replyTo: '"Gestão de Pessoas" <pessoas@wattconsultoria.com.br>',
      } as SendMailOptions);
    } catch (err) {
      console.error('Error while sending mail:', err);
    }
  }
}
