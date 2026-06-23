export interface InterviewConsultantEmailData {
  consultantName: string;
  candidateName: string;
  interviewDate: string;
  interviewStartTime: string;
  interviewEndTime: string;
}

export function interviewConsultantEmail(data: InterviewConsultantEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    consultantName,
    candidateName,
    interviewDate,
    interviewStartTime,
    interviewEndTime,
  } = data;

  const subject = `Entrevista agendada — ${candidateName} — ${interviewDate} às ${interviewStartTime} (BRT)`;

  const html = `<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">

      <h2 style="margin-top: 0; font-size: 22px; color: #1a1a1a;">📅 Nova entrevista agendada, ${consultantName}!</h2>

      <p style="margin: 0 0 16px;">Um candidato acabou de agendar uma entrevista com você. Aqui estão os detalhes:</p>

      <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 28px;">
        <p style="margin: 0 0 8px;"><strong>👤 Candidato:</strong> ${candidateName}</p>
        <p style="margin: 0 0 8px;"><strong>📅 Data:</strong> ${interviewDate}</p>
        <p style="margin: 0 0 0;"><strong>🕐 Horário:</strong> ${interviewStartTime} – ${interviewEndTime} (Horário de Brasília)</p>
      </div>

      <p style="margin: 0; color: #444;">
        Esteja disponível no horário combinado. Boa entrevista! ⚡<br>
        <strong>Equipe Watt Consultoria Jr.</strong>
      </p>

      <p style="color: #aaa; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; margin-top: 40px; margin-bottom: 0;">
        Este é um email automático da Watt Consultoria. Por favor, não responda diretamente a este email.
      </p>
    </div>
  </body>
</html>`;

  const text = [
    `📅 Nova entrevista agendada, ${consultantName}!`,
    ``,
    `Um candidato acabou de agendar uma entrevista com você.`,
    ``,
    `👤 Candidato: ${candidateName}`,
    `📅 Data: ${interviewDate}`,
    `🕐 Horário: ${interviewStartTime} – ${interviewEndTime} (Horário de Brasília)`,
    ``,
    `Esteja disponível no horário combinado. Boa entrevista! ⚡`,
    `Equipe Watt Consultoria Jr.`,
    ``,
    `---`,
    `Este é um email automático da Watt Consultoria.`,
  ].join('\n');

  return { subject, html, text };
}
