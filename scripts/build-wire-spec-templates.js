#!/usr/bin/env node
'use strict';

/**
 * Build controlled wire specification Excel templates for Power Wire Analysis.
 * Run: node scripts/build-wire-spec-templates.js
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.join(__dirname, '..', 'reference', 'wire-data', 'templates');
const TEMPLATE_VERSION = '1.0';

const OHM_KM_TO_OHM_1000FT = 1000 / 3280.8398950131;

const WIRE_TYPES = [
  {
    id: 'kp260',
    label: 'KP260 (K.Lacey)',
    manufacturer: 'K.Lacey Cables',
    brandSpec: 'Brand-Rex HPECM44',
    construction:
      'Nickel plated copper wire conductor. Polyimide/FEP taped insulation with taped PTFE finish.',
    operatingTemp: '-65 °C to +260 °C',
    voltageRating: '600 V r.m.s. @ 2000 Hz',
    defaultConductorTempRating: 260,
    sourceDocument: 'K.Lacey KP260 wire specification',
    sourceRevision: 'Manufacturer datasheet',
    awgSizes: [
      { awg: '24', strand: '19/0.12', conductorNomDiaMm: 0.56, ohmPerKm: 114.70, odMinMm: 0.98, odMaxMm: 1.16, ampRatingMax: 6.50, weightKgPerKm: 3.55 },
      { awg: '22', strand: '19/0.15', conductorNomDiaMm: 0.74, ohmPerKm: 58.80, odMinMm: 1.10, odMaxMm: 1.32, ampRatingMax: 9.00, weightKgPerKm: 4.90 },
      { awg: '20', strand: '19/0.20', conductorNomDiaMm: 0.96, ohmPerKm: 32.80, odMinMm: 1.35, odMaxMm: 1.55, ampRatingMax: 13.00, weightKgPerKm: 7.70 },
      { awg: '18', strand: '19/0.25', conductorNomDiaMm: 1.21, ohmPerKm: 20.80, odMinMm: 1.60, odMaxMm: 1.80, ampRatingMax: 17.00, weightKgPerKm: 11.30 },
      { awg: '16', strand: '19/0.30', conductorNomDiaMm: 1.44, ohmPerKm: 14.40, odMinMm: 1.80, odMaxMm: 2.05, ampRatingMax: 21.00, weightKgPerKm: 15.80 },
      { awg: '14', strand: '37/0.25', conductorNomDiaMm: 1.71, ohmPerKm: 10.60, odMinMm: 2.10, odMaxMm: 2.40, ampRatingMax: 27.00, weightKgPerKm: 21.00 },
      { awg: '12', strand: '37/0.32', conductorNomDiaMm: 2.15, ohmPerKm: 6.60, odMinMm: 2.50, odMaxMm: 2.90, ampRatingMax: 35.00, weightKgPerKm: 32.00 },
      { awg: '10', strand: '37/0.40', conductorNomDiaMm: 2.74, ohmPerKm: 4.13, odMinMm: 3.20, odMaxMm: 3.70, ampRatingMax: 44.00, weightKgPerKm: 53.00 },
      { awg: '8', strand: '119/0.30', conductorNomDiaMm: 4.20, ohmPerKm: 2.40, odMinMm: 4.80, odMaxMm: 5.30, ampRatingMax: 63.00, weightKgPerKm: 93.00 },
      { awg: '6', strand: '182/0.30', conductorNomDiaMm: 5.15, ohmPerKm: 1.57, odMinMm: 5.80, odMaxMm: 6.30, ampRatingMax: 96.00, weightKgPerKm: 140.00 },
      { awg: '4', strand: '294/0.30', conductorNomDiaMm: 6.60, ohmPerKm: 0.971, odMinMm: 7.10, odMaxMm: 7.70, ampRatingMax: 140.00, weightKgPerKm: 217.00 },
      { awg: '2', strand: '203/0.45', conductorNomDiaMm: 8.30, ohmPerKm: 0.606, odMinMm: 8.80, odMaxMm: 9.40, ampRatingMax: 195.00, weightKgPerKm: 330.00 },
      { awg: '1', strand: '245/0.45', conductorNomDiaMm: 9.35, ohmPerKm: 0.50, odMinMm: 9.70, odMaxMm: 10.40, ampRatingMax: 220.00, weightKgPerKm: 400.00 },
      { awg: '0', strand: '322/0.45', conductorNomDiaMm: 10.50, ohmPerKm: 0.381, odMinMm: 10.90, odMaxMm: 11.70, ampRatingMax: 260.00, weightKgPerKm: 525.00 },
      { awg: '00', strand: '420/0.45', conductorNomDiaMm: 11.80, ohmPerKm: 0.290, odMinMm: 12.30, odMaxMm: 13.20, ampRatingMax: 300.00, weightKgPerKm: 680.00 },
      { awg: '000', strand: '518/0.45', conductorNomDiaMm: 13.40, ohmPerKm: 0.237, odMinMm: 14.00, odMaxMm: 14.80, ampRatingMax: 345.00, weightKgPerKm: 835.00 },
      { awg: '0000', strand: '665/0.45', conductorNomDiaMm: 14.80, ohmPerKm: 0.190, odMinMm: 15.60, odMaxMm: 16.40, ampRatingMax: 380.00, weightKgPerKm: 1060.00 }
    ]
  },
  {
    id: 'raychem-55a0811',
    label: 'Raychem 55A0811',
    manufacturer: 'TE Connectivity / Raychem',
    brandSpec: 'Raychem SCD 55A0811 (M22759/34)',
    construction:
      'Tin-coated copper conductor. Radiation-crosslinked modified ETFE primary insulation and jacket (dual-wall).',
    operatingTemp: '-65 °C to +150 °C',
    voltageRating: '600 V r.m.s. at sea level',
    defaultConductorTempRating: 150,
    sourceDocument: 'Raychem 55A0811 wire specification',
    sourceRevision: 'TE Connectivity SCD',
    awgSizes: [
      { awg: '24', strand: '19×36', conductorNomDiaMm: 0.61, ohmPer1000ft: 26.2, odMinMm: 1.09, odMaxMm: 1.19, weightKgPerKm: 3.4 },
      { awg: '22', strand: '19×34', conductorNomDiaMm: 0.79, ohmPer1000ft: 16.2, odMinMm: 1.22, odMaxMm: 1.32, weightKgPerKm: 4.8 },
      { awg: '20', strand: '19×32', conductorNomDiaMm: 0.99, ohmPer1000ft: 9.88, odMinMm: 1.42, odMaxMm: 1.52, weightKgPerKm: 7.0 },
      { awg: '18', strand: '19×30', conductorNomDiaMm: 1.24, ohmPer1000ft: 6.23, odMinMm: 1.70, odMaxMm: 1.85, weightKgPerKm: 10.7 },
      { awg: '16', strand: '19×29', conductorNomDiaMm: 1.40, ohmPer1000ft: 4.81, odMinMm: 1.88, odMaxMm: 2.06, weightKgPerKm: 13.4 },
      { awg: '14', strand: '19×27', conductorNomDiaMm: 1.75, ohmPer1000ft: 3.06, odMinMm: 2.31, odMaxMm: 2.49, weightKgPerKm: 20.5 },
      { awg: '12', strand: '37×28', conductorNomDiaMm: 2.26, ohmPer1000ft: 2.02, odMinMm: 2.74, odMaxMm: 2.90, weightKgPerKm: 30.5 },
      { awg: '10', strand: '37×26', conductorNomDiaMm: 2.90, ohmPer1000ft: 1.26, odMinMm: 3.30, odMaxMm: 3.50, weightKgPerKm: 48.2 },
      { awg: '8', strand: '133×29', conductorNomDiaMm: 4.39, ohmPer1000ft: 0.701, odMinMm: 4.75, odMaxMm: 5.08, weightKgPerKm: 89.7 },
      { awg: '6', strand: '133×27', conductorNomDiaMm: 5.51, ohmPer1000ft: 0.445, odMinMm: 5.87, odMaxMm: 6.35, weightKgPerKm: 141.0 },
      { awg: '4', strand: '133×25', conductorNomDiaMm: 6.96, ohmPer1000ft: 0.280, odMinMm: 7.62, odMaxMm: 8.13, weightKgPerKm: 223.0 },
      { awg: '2', strand: '665×30', conductorNomDiaMm: 8.64, ohmPer1000ft: 0.183, odMinMm: 10.06, odMaxMm: 10.67, weightKgPerKm: 370.0 },
      { awg: '1', strand: '817×30', conductorNomDiaMm: 9.65, ohmPer1000ft: 0.149, odMinMm: 11.48, odMaxMm: 12.19, weightKgPerKm: 484.0 },
      { awg: '0', strand: '1045×30', conductorNomDiaMm: 10.80, ohmPer1000ft: 0.116, odMinMm: 12.57, odMaxMm: 13.36, weightKgPerKm: 570.0 },
      { awg: '00', strand: '1330×30', conductorNomDiaMm: 12.07, ohmPer1000ft: 0.091, odMinMm: 14.07, odMaxMm: 14.86, weightKgPerKm: 744.0 },
      { awg: '000', strand: '1665×30', conductorNomDiaMm: 13.72, ohmPer1000ft: 0.071, odMinMm: 15.24, odMaxMm: 16.00, weightKgPerKm: 887.0 },
      { awg: '0000', strand: '2109×30', conductorNomDiaMm: 15.37, ohmPer1000ft: 0.056, odMinMm: 16.64, odMaxMm: 17.53, weightKgPerKm: 1120.0 }
    ]
  }
];

function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function colLetter(index) {
  var n = index + 1;
  var s = '';
  while (n > 0) {
    var rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function cellXml(ref, value, type) {
  if (value == null || value === '') {
    return '<c r="' + ref + '"/>';
  }
  if (type === 'n') {
    return '<c r="' + ref + '"><v>' + value + '</v></c>';
  }
  return '<c r="' + ref + '" t="inlineStr"><is><t>' + escapeXml(value) + '</t></is></c>';
}

function buildSheetXml(rows) {
  var xmlRows = rows.map(function (row, rowIndex) {
    var r = rowIndex + 1;
    var cells = row.map(function (cell, colIndex) {
      return cellXml(colLetter(colIndex) + r, cell.value, cell.type);
    }).join('');
    return '<row r="' + r + '">' + cells + '</row>';
  }).join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    '<sheetData>' + xmlRows + '</sheetData></worksheet>';
}

function crc32(buf) {
  const table = crc32.table || (function () {
    const tbl = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      tbl[n] = c >>> 0;
    }
    crc32.table = tbl;
    return tbl;
  })();
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function u16(n) { return Buffer.from([n & 0xFF, (n >>> 8) & 0xFF]); }
function u32(n) { return Buffer.from([n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF]); }

function buildZip(files) {
  const parts = [];
  const central = [];
  let offset = 0;
  files.forEach(function (file) {
    const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data, 'utf8');
    const compressed = zlib.deflateRawSync(data);
    const name = Buffer.from(file.name, 'utf8');
    const crc = crc32(data);
    const local = Buffer.concat([
      u32(0x04034b50), u16(20), u16(0), u16(8), u16(0), u16(0), u32(crc),
      u32(compressed.length), u32(data.length), u16(name.length), u16(0), name, compressed
    ]);
    central.push(Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(8), u16(0), u16(0), u32(crc),
      u32(compressed.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0),
      u32(offset), name
    ]));
    parts.push(local);
    offset += local.length;
  });
  const centralStart = offset;
  central.forEach(function (chunk) {
    parts.push(chunk);
    offset += chunk.length;
  });
  parts.push(Buffer.concat([
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(central.reduce((s, c) => s + c.length, 0)), u32(centralStart), u16(0)
  ]));
  return Buffer.concat(parts);
}

function textRow(cells) {
  return cells.map(function (v) { return { value: v, type: 's' }; });
}

function numRow(cells) {
  return cells.map(function (v) {
    return typeof v === 'number' ? { value: v, type: 'n' } : { value: v, type: 's' };
  });
}

function kvSheet(pairs) {
  const rows = [textRow(['Field', 'Value', 'Required'])];
  pairs.forEach(function (pair) {
    rows.push(textRow([pair[0], pair[1], pair[2] || '']));
  });
  return rows;
}

function ohm1000ft(size) {
  if (typeof size.ohmPer1000ft === 'number') return size.ohmPer1000ft;
  return size.ohmPerKm * OHM_KM_TO_OHM_1000FT;
}

function ohmKm(size) {
  if (typeof size.ohmPerKm === 'number') return size.ohmPerKm;
  return size.ohmPer1000ft / OHM_KM_TO_OHM_1000FT;
}

function buildWorkbook(wireType) {
  const today = new Date().toISOString().slice(0, 10);
  const metadata = kvSheet([
    ['wire_spec_name', wireType.label, 'Yes'],
    ['wire_type_id', wireType.id, 'Yes'],
    ['manufacturer', wireType.manufacturer, 'Yes'],
    ['part_number_family', wireType.brandSpec, ''],
    ['specification_reference', wireType.brandSpec, 'Yes'],
    ['revision', 'Rev A — template seed', 'Yes'],
    ['issue_date', today, ''],
    ['prepared_by', '', ''],
    ['checked_by', '', ''],
    ['approved_by', '', ''],
    ['source_document_reference', wireType.sourceDocument, 'Yes'],
    ['source_document_revision', wireType.sourceRevision, ''],
    ['construction', wireType.construction, ''],
    ['operating_temp_range', wireType.operatingTemp, ''],
    ['voltage_rating', wireType.voltageRating, ''],
    ['default_conductor_temp_rating_c', String(wireType.defaultConductorTempRating), 'Yes'],
    ['conductor_material', 'Copper', ''],
    ['insulation_type', wireType.label.indexOf('KP260') >= 0 ? 'Polyimide/FEP/PTFE' : 'ETFE', ''],
    ['resistance_temp_coeff_basis', 'Copper 234.5/254.5 per ARP4404C', ''],
    ['resistance_reference_temp_c', '20', ''],
    ['frequency_applicability', 'DC and AC (see programme)', ''],
    ['hz_400_applicable', 'Yes — verify against installation', ''],
    ['single_phase_applicable', 'Yes', ''],
    ['three_phase_applicable', 'Yes', ''],
    ['ambient_temp_basis_c', 'Per installation zone / DO-160', ''],
    ['installation_temp_basis_c', 'Per Design Authority', ''],
    ['installation_category', 'Aircraft EWIS', ''],
    ['data_locked', 'NO — optional; set YES when formally approved', ''],
    ['notes', 'Controlled engineering source data. Version-control externally. DATA_LOCKED is optional for calculator loading.', '']
  ]);

  const awgHeader = [
    'AWG', 'Cross-sectional area (mm²)', 'Strand construction', 'Conductor material',
    'Conductor nominal diameter (mm)', 'Resistance @ 20 °C (Ω/km)', 'Resistance @ 20 °C (Ω/1000 ft)',
    'Outside diameter min (mm)', 'Outside diameter max (mm)', 'Maximum rated current (A)',
    'Weight (kg/km)', 'Maximum conductor temperature (°C)', 'Insulation type', 'Cable rating T_R (°C)',
    'Environmental limitation notes'
  ];
  const awgRows = [textRow(awgHeader)];
  wireType.awgSizes.forEach(function (size) {
    awgRows.push(numRow([
      size.awg, '', size.strand || 'Copper', 'Copper', size.conductorNomDiaMm || '',
      Math.round(ohmKm(size) * 10000) / 10000,
      Math.round(ohm1000ft(size) * 10000) / 10000,
      size.odMinMm || '', size.odMaxMm || '', size.ampRatingMax || '',
      size.weightKgPerKm || '', wireType.defaultConductorTempRating,
      wireType.label.indexOf('KP260') >= 0 ? 'Polyimide/FEP/PTFE' : 'ETFE',
      wireType.defaultConductorTempRating, ''
    ]));
  });

  const readme = [
    textRow(['Power Wire Analysis — Controlled Wire Specification Template']),
    textRow(['Wire type: ' + wireType.label]),
    textRow(['Template version: ' + TEMPLATE_VERSION]),
    textRow(['']),
    textRow(['INSTRUCTIONS']),
    textRow(['1. Review and update Metadata sheet. Obtain Design Authority approval.']),
    textRow(['2. Optionally set DATA_LOCKED to YES on Metadata when formally approved.']),
    textRow(['3. Version-control this file in your programme repository.']),
    textRow(['4. In Power Wire Analysis, select External controlled wire spreadsheets and load this file.']),
    textRow(['5. Invalid spreadsheets are rejected; unlocked files may load with a validation warning.']),
    textRow(['']),
    textRow(['CONTROLLED SOURCE DATA NOTICE']),
    textRow(['This spreadsheet is intended as controlled engineering source data.']),
    textRow(['Once approved, values should be treated as read-only and version controlled externally.']),
    textRow(['Do not mix internal and external wire data without clear programme governance.'])
  ];

  const sheets = [
    { name: 'README', rows: readme },
    { name: 'Metadata', rows: metadata },
    { name: 'AWG_Data', rows: awgRows },
    { name: 'Resistance_Data', rows: kvSheet([
      ['resistance_per_metre_basis', 'From AWG_Data Ω/km', ''],
      ['resistance_per_1000ft_basis', 'From AWG_Data Ω/1000 ft', ''],
      ['temp_correction_formula', 'R(T) = R(20) × (234.5 + T) / 254.5', ''],
      ['voltage_drop_coefficient', 'ARP4404C §9.3.4.2', ''],
      ['ac_correction_notes', 'Use programme AC rules where applicable', '']
    ]) },
    { name: 'Temperature_Data', rows: kvSheet([
      ['ambient_temp_basis', 'Installation zone maximum', ''],
      ['installation_temp_basis', 'Design Authority limit', ''],
      ['temp_limit_notes', 'T_SAFE = MIN(T_R, installation limit)', ''],
      ['safety_margin_notes', '80% caution band in PWA grid', '']
    ]) },
    { name: 'Derating_Data', rows: kvSheet([
      ['bundle_derating_reference', 'AC 43.13-1B Fig 11-5 / AS50881', ''],
      ['altitude_derating_reference', 'AC 43.13-1B Fig 11-6', ''],
      ['free_air_rating_reference', 'AC 43.13-1B Fig 11-4', ''],
      ['bundle_derating_notes', 'Bundle count and loading from installation', ''],
      ['altitude_derating_notes', 'Altitude factor z in PWA', '']
    ]) },
    { name: 'Advanced_Data', rows: kvSheet([
      ['wire_ageing_factors', 'Programme-specific — not auto-applied', ''],
      ['derating_method_references', 'ARP4404C, AS50881, AC 43.13-1B', ''],
      ['harness_grouping_assumptions', 'Per EWIS design', ''],
      ['installation_environment_categories', 'Per zone / DO-160', ''],
      ['external_audit_notes', 'Record programme audit references here', ''],
      ['applicability_limitations', 'Supplementary models require separate validation', '']
    ]) },
    { name: 'Validation_Cases', rows: [
      textRow(['validation_case_id', 'input_description', 'input_values', 'expected_result', 'tolerance', 'source_reference', 'validation_status']),
      textRow(['TEMPLATE-001', 'Example manufacturer datasheet case', '', '', '', 'Approved datasheet', 'Template — populate before use'])
    ] },
    { name: 'Change_History', rows: [
      textRow(['Date', 'Revision', 'Author', 'Description']),
      textRow([today, '0.1', 'Template generator', 'Initial controlled template from built-in catalog seed'])
    ] }
  ];

  const files = [
    { name: '[Content_Types].xml', data: '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      sheets.map(function (_, i) {
        return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
      }).join('') +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '</Types>' },
    { name: '_rels/.rels', data: '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>' },
    { name: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      sheets.map(function (sheet, i) {
        return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>';
      }).join('') + '</Relationships>' },
    { name: 'xl/workbook.xml', data: '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets>' + sheets.map(function (sheet, i) {
        return '<sheet name="' + escapeXml(sheet.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
      }).join('') + '</sheets></workbook>' }
  ];

  sheets.forEach(function (sheet, i) {
    files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', data: buildSheetXml(sheet.rows) });
  });

  return buildZip(files);
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  WIRE_TYPES.forEach(function (wireType) {
    const filename = 'wire-spec-' + wireType.id + '-template.xlsx';
    const outPath = path.join(OUT_DIR, filename);
    fs.writeFileSync(outPath, buildWorkbook(wireType));
    console.log('Wrote ' + outPath);
  });
}

main();
