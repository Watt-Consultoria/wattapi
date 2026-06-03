const SEVERITY_LABEL: Record<string, string> = {
  leve: 'Leve',
  moderada: 'Moderada',
  grave: 'Grave',
  desligamento: 'Desligamento',
};

export interface NewViolationEmailData {
  memberName: string;
  normCode: string;
  normDescription: string;
  severity: 'leve' | 'moderada' | 'grave' | 'desligamento';
  points: number;
  reason: string | null;
  expiresAt: string;
  currentScore: number;
  atRisk: boolean;
}

export function newViolationEmail(data: NewViolationEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    memberName,
    normCode,
    normDescription,
    severity,
    points,
    reason,
    expiresAt,
    currentScore,
    atRisk,
  } = data;

  const severityLabel = SEVERITY_LABEL[severity] ?? severity;
  const subject = `Comunicado Interno: Registro de Ocorrência - ${memberName}`;
  const expiresFormatted = new Date(expiresAt).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const riskWarningHtml = atRisk
    ? `
    <div style="background-color: #fff3cd; border-left: 4px solid #f0ad4e; padding: 10px 15px; margin: 15px 0; border-radius: 3px;">
      <strong style="color: #856404;">⚠️ Atenção:</strong> Sua pontuação acumulada (<strong>${currentScore} pts</strong>) atingiu de 18 pontos, equivalentes à 3 faltas graves. Procure Imediatamente a Diretoria.
    </div>`
    : '';

  const reasonRowHtml = reason
    ? `<p><strong>Motivo:</strong> ${reason}</p>`
    : '';

  const html = `<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #e74c3c;">Notificação de Falta Registrada</h2>

      <p>Prezado, <strong>${memberName}</strong>,</p>

      <p>Este e-mail tem como objetivo formalizar o registro de uma ocorrência, referente ao evento detalhado abaixo:</p>

      <div style="background-color: #f5f5f5; border-left: 4px solid #e74c3c; padding: 15px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #e74c3c;">Detalhes da Falta</h3>
        <p><strong>Código:</strong> ${normCode}</p>
        <p><strong>Tipo:</strong> <span style="background-color: #ffe6e6; padding: 5px 10px; border-radius: 3px;">${severityLabel} (${points} ponto${points !== 1 ? 's' : ''})</span></p>
        <p><strong>Regra:</strong> ${normDescription}</p>
        ${reasonRowHtml}
        <p><strong>Expiração:</strong> ${expiresFormatted}</p>
        <p><strong>Pontuação acumulada:</strong> ${currentScore} pts</p>
      </div>

      ${riskWarningHtml}

      <p>Gostaríamos de entender melhor o que aconteceu. Por gentileza, responda a este e-mail em até 24 horas com a sua justificativa ou, caso possua, o envio de documentos comprobatórios (atestados, prints ou outros registros).</p>

      <p>Ressaltamos que este procedimento faz parte da nossa política de transparência e serve para garantir que todos os registros internos estejam devidamente fundamentados.</p>

      <p>Estamos à disposição para conversar caso tenha qualquer dúvida sobre este comunicado.</p>

      <p style="color: #999; font-size: 12px; border-top: 1px solid #ddd; padding-top: 15px; margin-top: 30px;">
        Este é um email automático da Watt Consultoria.
      </p>
    </div>
  </body>
</html>`;

  const riskWarningText = atRisk
    ? `\n⚠️ Atenção: Sua pontuação acumulada (${currentScore} pts) atingiu o limite de risco de desligamento.\n`
    : '';

  const text = [
    `Notificação de Falta Registrada`,
    ``,
    `Prezado, ${memberName},`,
    ``,
    `Este e-mail tem como objetivo formalizar o registro de uma ocorrência, referente ao evento detalhado abaixo:`,
    ``,
    `Detalhes da Falta:`,
    `- Código: ${normCode}`,
    `- Tipo: ${severityLabel} (${points} ponto${points !== 1 ? 's' : ''})`,
    `- Regra: ${normDescription}`,
    ...(reason ? [`- Motivo: ${reason}`] : []),
    `- Expiração: ${expiresFormatted}`,
    `- Pontuação acumulada: ${currentScore} pts`,
    riskWarningText,
    `Gostaríamos de entender melhor o que aconteceu. Por gentileza, responda a este e-mail em até 24 horas com a sua justificativa ou, caso possua, o envio de documentos comprobatórios (atestados, prints ou outros registros).`,
    ``,
    `Ressaltamos que este procedimento faz parte da nossa política de transparência e serve para garantir que todos os registros internos estejam devidamente fundamentados.`,
    ``,
    `Estamos à disposição para conversar caso tenha qualquer dúvida sobre este comunicado.`,
    ``,
    `---`,
    `Este é um email automático da Watt Consultoria. Por favor, não responda este email.`,
  ].join('\n');

  return { subject, html, text };
}
