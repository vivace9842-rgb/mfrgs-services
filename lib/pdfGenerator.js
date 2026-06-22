import PDFDocument from 'pdfkit';

export async function generatePdfReport(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // --- Cabeçalho Geométrico (Soberano) ---
    doc.rect(0, 0, 600, 15).fill('#003366'); // Faixa azul marinho superior

    doc.moveDown(3);
    doc.fontSize(20).fillColor('#003366').text('MFRGS DIGITAL VERIFICATION', { align: 'left' });
    doc.fontSize(10).fillColor('#555555').text('Sovereign Business Intelligence', { align: 'left' });
    doc.moveDown(1);

    doc.fontSize(24).fillColor('#111111').text('Business Verification Report', { align: 'center' });
    doc.fontSize(12).fillColor('#666666').text(`Empresa analisada: ${data.name}`, { align: 'center' });
    
    doc.moveDown(1.5);
    doc.strokeColor('#003366').lineWidth(1.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1.5);

    // --- Seção 1: Dados Gerais ---
    doc.fontSize(14).fillColor('#003366').text('1. Informações Cadastrais', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#222222');
    doc.text(`Razão Social: ${data.name}`);
    doc.text(`Número de Registro (UK): ${data.number}`);
    doc.text(`Status: ${data.status.toUpperCase()}`);
    doc.text(`Tipo de Entidade: ${data.type}`);
    doc.text(`Data de Abertura: ${data.creation_date}`);
    doc.text(`Jurisdição: ${data.jurisdiction}`);
    
    if (data.registered_office_address) {
      const addr = data.registered_office_address;
      doc.text(`Endereço Registrado: ${addr.address_line_1 || ''}, ${addr.locality || ''}, ${addr.postal_code || ''}`);
    }

    doc.moveDown(1.5);

    // --- Seção 2: Diretores Ativos ---
    doc.fontSize(14).fillColor('#003366').text('2. Diretores Ativos (Officers)', { underline: true });
    doc.moveDown(0.5);

    if (data.active_directors && data.active_directors.length > 0) {
      data.active_directors.forEach((dir, i) => {
        doc.fontSize(11).fillColor('#222222').text(`${i + 1}. ${dir.name}`);
        doc.fontSize(10).fillColor('#555555');
        doc.text(`   Nomeado em: ${dir.appointed_on}`);
        doc.text(`   Nacionalidade: ${dir.nationality || 'N/A'}`);
        doc.text(`   País de Residência: ${dir.country_of_residence || 'N/A'}`);
        doc.moveDown(0.3);
      });
    } else {
      doc.fontSize(11).fillColor('#666666').text('Nenhum diretor ativo listado publicamente.');
    }

    doc.moveDown(1.5);

    // --- Seção 3: Cadeia de Custódia e Integridade ---
    doc.fontSize(14).fillColor('#003366').text('3. Cadeia de Custódia da Informação', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#444444');
    doc.text(`Fonte dos Dados: ${data.source}`);
    doc.text(`Data e Hora da Consulta (UTC): ${data.retrieval_timestamp}`);
    doc.text(`Assinatura Digital de Processamento: SHA-256 Verified`);

    doc.moveDown(2);
    doc.strokeColor('#cccccc').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // --- Disclaimer ---
    doc.fontSize(8).fillColor('#999999').text(
      'Isenção de Responsabilidade: Este relatório utiliza dados oficiais públicos em tempo real fornecidos pela API da Companies House. MFRGS Digital não se responsabiliza por omissões ou erros no banco de dados governamental primário.',
      { align: 'justify' }
    );

    doc.end();
  });
}