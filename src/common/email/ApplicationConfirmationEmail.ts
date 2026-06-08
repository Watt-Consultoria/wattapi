export interface ApplicationConfirmationEmailData {
  applicantName: string;
  processTitle: string;
}

export function applicationConfirmationEmail(
  data: ApplicationConfirmationEmailData,
): {
  subject: string;
  html: string;
  text: string;
} {
  const { applicantName, processTitle } = data;

  const subject = `Parabéns, ${applicantName}! Sua candidatura foi recebida 🎉`;

  const html = `<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">

      <h2 style="margin-top: 0; font-size: 22px; color: #1a1a1a;">🎉 Parabéns, ${applicantName}!</h2>

      <p style="margin: 0 0 16px;">Recebemos a sua candidatura para o processo seletivo <strong>${processTitle}</strong> com sucesso.</p>

      <p style="margin: 0 0 24px;">A partir de agora, nosso time irá analisar seu perfil com atenção. Em breve entraremos em contato com os próximos passos do processo seletivo.</p>

      <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 18px; border-radius: 4px; margin-bottom: 32px;">
        <span style="font-size: 15px;">💡 <strong>Fique atento(a) ao seu e-mail</strong> — todas as comunicações acontecerão por aqui.</span>
      </div>

      <p style="margin: 0; color: #444;">
        Obrigado pelo interesse em fazer parte da <strong>Watt Consultoria Jr.</strong><br>
        Estamos felizes em ter você com a gente nessa jornada ⚡
      </p>

      <p style="color: #aaa; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; margin-top: 40px; margin-bottom: 0;">
        Este é um email automático da Watt Consultoria. Por favor, não responda diretamente a este email.
      </p>
    </div>
  </body>
</html>`;

  const text = [
    `🎉 Parabéns, ${applicantName}!`,
    ``,
    `Recebemos a sua candidatura para o processo seletivo "${processTitle}" com sucesso.`,
    ``,
    `A partir de agora, nosso time irá analisar seu perfil com atenção. Em breve entraremos em contato com os próximos passos do processo seletivo.`,
    ``,
    `💡 Fique atento(a) ao seu e-mail — todas as comunicações acontecerão por aqui.`,
    ``,
    `Obrigado pelo interesse em fazer parte da Watt Consultoria Jr.`,
    `Estamos felizes em ter você com a gente nessa jornada ⚡`,
    ``,
    `---`,
    `Este é um email automático da Watt Consultoria.`,
  ].join('\n');

  return { subject, html, text };
}
