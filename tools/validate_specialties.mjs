#!/usr/bin/env node
import ExcelJS from 'exceljs';

async function checkSpecialties() {
  const workbook = new ExcelJS.Workbook();
  
  // Jg6 Besonderheiten
  console.log('\n=== Jg6 Besonderheiten ===');
  await workbook.xlsx.readFile('./content/jahrgaenge/Jg6.xlsx');
  
  const jg6Slots = workbook.getWorksheet('Slots');
  const jg6Bausteine = workbook.getWorksheet('Bausteine');
  
  // jg6-de-3 suchen (sollte Zeile 13 sein)
  let de3Row = 2;
  while (jg6Slots.getCell(`A${de3Row}`).value !== 'jg6-de-3') {
    de3Row++;
  }
  const de3Status = jg6Slots.getCell(`K${de3Row}`).value;
  const de3Hinweis = jg6Slots.getCell(`L${de3Row}`).value;
  console.log(`jg6-de-3 Status: ${de3Status} (erwartet: wahl)`);
  console.log(`jg6-de-3 Hinweis: ${de3Hinweis}`);
  
  // Baustein jg6-de-3 Alternativen
  let de3BRow = 2;
  while (jg6Bausteine.getCell(`A${de3BRow}`).value !== 'jg6-de-3') {
    de3BRow++;
  }
  const de3Alt = jg6Bausteine.getCell(`D${de3BRow}`).value;
  console.log(`jg6-de-3 Alternativen: ${de3Alt}`);
  
  // jg6-en-5 Titel
  let en5Row = 2;
  while (jg6Bausteine.getCell(`A${en5Row}`).value !== 'jg6-en-5') {
    en5Row++;
  }
  const en5Title = jg6Bausteine.getCell(`C${en5Row}`).value;
  console.log(`jg6-en-5 Titel: "${en5Title}" (erwartet: leer)`);
  
  // Jg7 Besonderheiten
  console.log('\n=== Jg7 Besonderheiten ===');
  const workbook7 = new ExcelJS.Workbook();
  await workbook7.xlsx.readFile('./content/jahrgaenge/Jg7.xlsx');
  
  const jg7Slots = workbook7.getWorksheet('Slots');
  const jg7Bausteine = workbook7.getWorksheet('Bausteine');
  
  // jg7-fvu-1
  let fvu1Row = 2;
  while (jg7Slots.getCell(`A${fvu1Row}`).value !== 'jg7-fvu-1') {
    fvu1Row++;
  }
  const fvuSpuren = jg7Slots.getCell(`E${fvu1Row}`).value;
  const fvuStunden = jg7Slots.getCell(`F${fvu1Row}`).value;
  const fvuHinweis = jg7Slots.getCell(`L${fvu1Row}`).value;
  console.log(`jg7-fvu-1 Spuren: ${fvuSpuren} (erwartet: 1,2,3)`);
  console.log(`jg7-fvu-1 Stunden: ${fvuStunden} (erwartet: leer/null)`);
  console.log(`jg7-fvu-1 Hinweis: ${fvuHinweis}`);
  
  // jg7-geo-3 Status
  let geo3Row = 2;
  while (jg7Slots.getCell(`A${geo3Row}`).value !== 'jg7-geo-3') {
    geo3Row++;
  }
  const geo3Status = jg7Slots.getCell(`K${geo3Row}`).value;
  const geo3Hinweis = jg7Slots.getCell(`L${geo3Row}`).value;
  console.log(`jg7-geo-3 Status: ${geo3Status} (erwartet: vorlaeufig)`);
  console.log(`jg7-geo-3 Hinweis: ${geo3Hinweis.substring(0, 50)}...`);
  
  // jg7-fvu-1 Titel im Baustein
  let fvu1BRow = 2;
  while (jg7Bausteine.getCell(`A${fvu1BRow}`).value !== 'jg7-fvu-1') {
    fvu1BRow++;
  }
  const fvuTitle = jg7Bausteine.getCell(`C${fvu1BRow}`).value;
  console.log(`jg7-fvu-1 Titel: "${fvuTitle}" (erwartet: "Fächerverbindender Unterricht")`);
}

await checkSpecialties();
