const PDFDocument = require("pdfkit");

function generateReport(companyData) {
  const doc = new PDFDocument();
  let buffers = [];

  doc.on("data", buffers.push.bind(buffers));
  doc.on("end", () => {
    const pdfData = Buffer.concat(buffers);
    return pdfData;
  });

  doc.text("Laudo MFRGS");
  doc.text(`Empresa: ${companyData.company_name}`);
  doc.text(`Data: ${new Date().toISOString()}`);

  doc.end();
}

module.exports = { generateReport };
