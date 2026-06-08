export interface CandidateFinalApprovalEmailData {
  candidateName: string;
  processTitle: string;
}

export function candidateFinalApprovalEmail(
  data: CandidateFinalApprovalEmailData,
): {
  subject: string;
  html: string;
  text: string;
} {
  const { candidateName, processTitle } = data;

  const subject = `Parabéns, ${candidateName}! Aprovação final no processo seletivo`;

  const html = `<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">

      <h2 style="margin-top: 0; font-size: 22px; color: #1a1a1a;">🏆 Parabéns, ${candidateName}!</h2>

      <p style="margin: 0 0 16px;">Você foi aprovado(a) em todas as etapas do processo seletivo <strong>${processTitle}</strong>.</p>

      <p style="margin: 0 0 24px;">Em breve entraremos em contato com os próximos passos. Seja muito bem-vindo(a) à família Watt! ⚡</p>

      <p style="margin: 0; color: #444;">
        Equipe Watt Consultoria Jr.
      </p>

      <p style="color: #aaa; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; margin-top: 40px; margin-bottom: 0;">
        Este é um email automático da Watt Consultoria. Por favor, não responda diretamente a este email.
      </p>
    </div>
  </body>
</html>`;

  const text = [
    `🏆 Parabéns, ${candidateName}!`,
    ``,
    `Você foi aprovado(a) em todas as etapas do processo seletivo "${processTitle}".`,
    ``,
    `Em breve entraremos em contato com os próximos passos. Seja muito bem-vindo(a) à família Watt! ⚡`,
    ``,
    `Equipe Watt Consultoria Jr.`,
    ``,
    `---`,
    `Este é um email automático da Watt Consultoria.`,
  ].join('\n');

  return { subject, html, text };
}
