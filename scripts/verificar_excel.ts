import ExcelJS from "exceljs";
import fs from "fs";

async function test() {
  const p = "C:/Users/PC/Documents/RODNEY SENAE/APLICATIVO PARA BUSQUEDA EN BASES PRESUPUESTO/Enero-Junio-2026.xlsx";
  console.log("Existe archivo:", fs.existsSync(p));
  const t0 = Date.now();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(p);
  console.log(`Excel cargado en ${(Date.now() - t0)} ms`);
  console.log("Hojas en el libro:", wb.worksheets.map(w => w.name));
  
  const wsPago = wb.worksheets.find(w => w.name.toUpperCase().includes("PAGO"));
  let countPago = 0;
  let emptyCountPago = 0;
  let lastRowPago = 0;
  if (wsPago) {
    for (let r = 5; r <= wsPago.rowCount; r++) {
      const row = wsPago.getRow(r);
      const colNum = (row.getCell(1).text || "").trim();
      const quipuxRaw = (row.getCell(4).text || "").trim();
      if (!colNum && !quipuxRaw) {
        emptyCountPago++;
        if (emptyCountPago >= 10) break;
        continue;
      }
      emptyCountPago = 0;
      countPago++;
      lastRowPago = r;
    }
  }

  const wsGarantia = wb.worksheets.find(w => 
    w.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().includes("GARANTIA")
  );
  let countGarantia = 0;
  let emptyCountGarantia = 0;
  let lastRowGarantia = 0;
  if (wsGarantia) {
    for (let r = 4; r <= wsGarantia.rowCount; r++) {
      const row = wsGarantia.getRow(r);
      const colNum = (row.getCell(1).text || "").trim();
      const quipuxRaw = (row.getCell(4).text || "").trim();
      if (!colNum && !quipuxRaw) {
        emptyCountGarantia++;
        if (emptyCountGarantia >= 10) break;
        continue;
      }
      emptyCountGarantia = 0;
      countGarantia++;
      lastRowGarantia = r;
    }
  }

  console.log("Total Pago:", countPago, "Ultima fila:", lastRowPago);
  console.log("Total Garantia:", countGarantia, "Ultima fila:", lastRowGarantia);
  console.log("Total Suma:", countPago + countGarantia);
  console.log(`Tiempo total de conteo: ${(Date.now() - t0)} ms`);
}

test().catch(console.error);
