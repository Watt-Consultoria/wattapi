export interface InterviewMeetLinkEmailData {
  candidateName: string;
  meetLink: string;
}

export function interviewMeetLinkEmail(data: InterviewMeetLinkEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const { candidateName, meetLink } = data;

  const subject = `${candidateName}, o link da sua entrevista online chegou`;

  const html = `<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">

      <h2 style="margin-top: 0; font-size: 22px; color: #1a1a1a;">Olá, ${candidateName}!</h2>

      <p style="margin: 0 0 16px;">Sua entrevista com a <strong>Watt Consultoria Jr.</strong> está confirmada. Abaixo você encontra o link para a chamada online:</p>

      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${meetLink}"
           style="display: inline-block; background-color: #f59e0b; color: #ffffff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: bold;">
          Entrar na Entrevista
        </a>
      </div>

      <div style="background-color: #f3f4f6; border-radius: 6px; padding: 14px 18px; margin-bottom: 32px;">
        <p style="margin: 0; font-size: 14px; color: #555;">Ou acesse diretamente pelo link:<br>
          <a href="${meetLink}" style="color: #f59e0b; word-break: break-all;">${meetLink}</a>
        </p>
      </div>

      <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 18px; border-radius: 4px; margin-bottom: 32px;">
        <span style="font-size: 15px;">💡 <strong>Dica:</strong> Entre no link alguns minutos antes do horário agendado para testar áudio e câmera.</span>
      </div>

      <p style="margin: 0; color: #444;">
        Boa sorte! Estamos ansiosos para conversar com você ⚡<br>
        <strong>Equipe Watt Consultoria Jr.</strong>
      </p>

      <p style="color: #aaa; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; margin-top: 40px; margin-bottom: 0;">
        Este é um email automático da Watt Consultoria. Por favor, não responda diretamente a este email.
      </p>
    </div>
  </body>
</html>`;

  const text = [
    `Olá, ${candidateName}!`,
    ``,
    `Sua entrevista com a Watt Consultoria Jr. está confirmada.`,
    ``,
    `Acesse o link abaixo para entrar na chamada online:`,
    meetLink,
    ``,
    `💡 Entre no link alguns minutos antes do horário para testar áudio e câmera.`,
    ``,
    `Boa sorte! ⚡`,
    `Equipe Watt Consultoria Jr.`,
    ``,
    `---`,
    `Este é um email automático da Watt Consultoria.`,
  ].join('\n');

  return { subject, html, text };
}
