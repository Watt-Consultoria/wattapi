export interface CandidateEliminatedEmailData {
  candidateName: string;
  stageName: string;
  processTitle: string;
}

export function candidateEliminatedEmail(data: CandidateEliminatedEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const { candidateName, stageName, processTitle } = data;

  const subject = `Resultado — etapa ${stageName} do processo seletivo`;

  const html = `<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">

      <h2 style="margin-top: 0; font-size: 22px; color: #1a1a1a;">Olá, ${candidateName}</h2>

      <p style="margin: 0 0 16px;">Infelizmente você não foi aprovado(a) na etapa <strong>${stageName}</strong> do processo seletivo <strong>${processTitle}</strong>.</p>

      <p style="margin: 0 0 24px;">Obrigado pela participação e pelo esforço durante o processo. Esperamos vê-lo(a) em futuros processos seletivos.</p>

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
    `Olá, ${candidateName}`,
    ``,
    `Infelizmente você não foi aprovado(a) na etapa "${stageName}" do processo seletivo "${processTitle}".`,
    ``,
    `Obrigado pela participação e pelo esforço durante o processo.`,
    ``,
    `Equipe Watt Consultoria Jr.`,
    ``,
    `---`,
    `Este é um email automático da Watt Consultoria.`,
  ].join('\n');

  return { subject, html, text };
}
