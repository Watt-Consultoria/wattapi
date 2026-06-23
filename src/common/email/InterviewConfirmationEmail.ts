export interface InterviewConfirmationEmailData {
  candidateName: string;
  interviewDate: string;
  interviewStartTime: string;
  interviewEndTime: string;
}

export function interviewConfirmationEmail(
  data: InterviewConfirmationEmailData,
): {
  subject: string;
  html: string;
  text: string;
} {
  const { candidateName, interviewDate, interviewStartTime, interviewEndTime } =
    data;

  const subject = `Entrevista confirmada! ${interviewDate} às ${interviewStartTime} (BRT)`;

  const html = `<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">

      <h2 style="margin-top: 0; font-size: 22px; color: #1a1a1a;">✅ Entrevista confirmada, ${candidateName}!</h2>

      <p style="margin: 0 0 16px;">Seu agendamento foi realizado com sucesso. Aqui estão os detalhes:</p>

      <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 28px;">
        <p style="margin: 0 0 8px;"><strong>📅 Data:</strong> ${interviewDate}</p>
        <p style="margin: 0 0 8px;"><strong>🕐 Horário:</strong> ${interviewStartTime} – ${interviewEndTime} (Horário de Brasília)</p>
      </div>

      <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 18px; border-radius: 4px; margin-bottom: 32px;">
        <span style="font-size: 15px;">💡 <strong>Lembre-se:</strong> Prepare-se bem e esteja disponível no horário combinado. A entrevista será conduzida por membros da equipe Watt.</span>
      </div>

      <p style="margin: 0; color: #444;">
        Estamos ansiosos para conversar com você. Boa sorte! ⚡<br>
        <strong>Equipe Watt Consultoria Jr.</strong>
      </p>

      <p style="color: #aaa; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; margin-top: 40px; margin-bottom: 0;">
        Este é um email automático da Watt Consultoria. Por favor, não responda diretamente a este email.
      </p>
    </div>
  </body>
</html>`;

  const text = [
    `✅ Entrevista confirmada, ${candidateName}!`,
    ``,
    `Seu agendamento foi realizado com sucesso.`,
    ``,
    `📅 Data: ${interviewDate}`,
    `🕐 Horário: ${interviewStartTime} – ${interviewEndTime} (Horário de Brasília)`,
    ``,
    `💡 Prepare-se bem e esteja disponível no horário combinado.`,
    ``,
    `Boa sorte! ⚡`,
    `Equipe Watt Consultoria Jr.`,
    ``,
    `---`,
    `Este é um email automático da Watt Consultoria.`,
  ].join('\n');

  return { subject, html, text };
}
