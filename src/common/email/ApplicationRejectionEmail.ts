export interface ApplicationRejectionEmailData {
  applicantName: string;
  processTitle: string;
}

export function applicationRejectionEmail(
  data: ApplicationRejectionEmailData,
): {
  subject: string;
  html: string;
  text: string;
} {
  const { applicantName, processTitle } = data;

  const subject = `Resultado da candidatura — ${processTitle}`;

  const html = `<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">

      <h2 style="margin-top: 0; font-size: 22px; color: #1a1a1a;">Olá, ${applicantName}</h2>

      <p style="margin: 0 0 16px;">Infelizmente sua candidatura para <strong>${processTitle}</strong> não foi aprovada desta vez.</p>

      <p style="margin: 0 0 24px;">Obrigado pela participação e pelo interesse em fazer parte da Watt Consultoria Jr. Esperamos vê-lo(a) em futuros processos seletivos.</p>

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
    `Olá, ${applicantName}`,
    ``,
    `Infelizmente sua candidatura para "${processTitle}" não foi aprovada desta vez.`,
    ``,
    `Obrigado pela participação e pelo interesse em fazer parte da Watt Consultoria Jr.`,
    ``,
    `Equipe Watt Consultoria Jr.`,
    ``,
    `---`,
    `Este é um email automático da Watt Consultoria.`,
  ].join('\n');

  return { subject, html, text };
}
