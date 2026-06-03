const SEVERITY_LABEL: Record<string, string> = {
  leve: 'Leve',
  moderada: 'Moderada',
  grave: 'Grave',
  desligamento: 'Desligamento',
};

export interface CanceledViolationEmailData {
  memberName: string;
  normCode: string;
  normDescription: string;
  severity: 'leve' | 'moderada' | 'grave' | 'desligamento';
  cancelledByName: string;
}

export function canceledViolationEmail(data: CanceledViolationEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const { memberName, normCode, normDescription, severity, cancelledByName } =
    data;

  const severityLabel = SEVERITY_LABEL[severity] ?? severity;
  const subject = `Comunicado Interno: Cancelamento de Falta - ${memberName}`;

  const html = `<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #27ae60;">Notificação de Cancelamento de Falta</h2>

      <p>Prezado, <strong>${memberName}</strong>,</p>

      <p>Informamos que a falta registrada em seu histórico foi <strong>cancelada</strong> conforme detalhado abaixo:</p>

      <div style="background-color: #f5f5f5; border-left: 4px solid #27ae60; padding: 15px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #27ae60;">Detalhes da Falta Cancelada</h3>
        <p><strong>Código:</strong> ${normCode}</p>
        <p><strong>Tipo:</strong> <span style="background-color: #e6ffe6; padding: 5px 10px; border-radius: 3px;">${severityLabel}</span></p>
        <p><strong>Regra:</strong> ${normDescription}</p>
        <p><strong>Cancelada por:</strong> ${cancelledByName}</p>
        <div style="background-color: #d4edda; border-left: 4px solid #27ae60; padding: 10px; border-radius: 3px; margin-top: 15px;">
          <strong style="color: #27ae60;">✓ Status: CANCELADA</strong>
        </div>
      </div>

      <p>Esta falta foi removida de seu histórico e não será mais considerada em avaliações de desempenho.</p>

      <p>Caso tenha dúvidas sobre este cancelamento, entre em contato com o departamento responsável.</p>

      <p style="color: #999; font-size: 12px; border-top: 1px solid #ddd; padding-top: 15px; margin-top: 30px;">
        Este é um email automático da Watt Consultoria.
      </p>
    </div>
  </body>
</html>`;

  const text = [
    `Notificação de Cancelamento de Falta`,
    ``,
    `Prezado, ${memberName},`,
    ``,
    `Informamos que a falta registrada em seu histórico foi cancelada conforme detalhado abaixo:`,
    ``,
    `Detalhes da Falta Cancelada:`,
    `- Código: ${normCode}`,
    `- Tipo: ${severityLabel}`,
    `- Regra: ${normDescription}`,
    `- Cancelada por: ${cancelledByName}`,
    `- Status: ✓ CANCELADA`,
    ``,
    `Esta falta foi removida de seu histórico e não será mais considerada em avaliações de desempenho.`,
    ``,
    `Caso tenha dúvidas sobre este cancelamento, entre em contato com o departamento responsável.`,
    ``,
    `---`,
    `Este é um email automático da Watt Consultoria. Por favor, não responda este email.`,
  ].join('\n');

  return { subject, html, text };
}
