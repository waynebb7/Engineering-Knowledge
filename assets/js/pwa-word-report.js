(function (global) {
  'use strict';

  var REPORT_TITLE = 'Power Wire Analysis Report';
  var REPORT_STANDARDS =
    'Reference standards: SAE ARP4404C §9.3.4.2 (T₂, allowable voltage drop U); ' +
    'AS50881 / manufacturer wire catalog; FAA AC 43.13-1B Ch.11 (Figs 11-4–11-6 de-rating x, y, z).';

  var TABLE_FONT_HALF_POINTS = 16;
  var PAGE_WIDTH_A3_LANDSCAPE = 23811;
  var PAGE_HEIGHT_A3_LANDSCAPE = 16838;
  var PAGE_MARGIN_LEFT = 720;
  var PAGE_MARGIN_RIGHT = 720;
  var PAGE_MARGIN_TOP = 900;
  var PAGE_MARGIN_BOTTOM = 900;
  var CONTENT_WIDTH =
    PAGE_WIDTH_A3_LANDSCAPE - PAGE_MARGIN_LEFT - PAGE_MARGIN_RIGHT;

  function sanitizeXmlText(text) {
    var s = String(text == null ? '' : text);
    var out = '';
    var i;
    for (i = 0; i < s.length; i += 1) {
      var code = s.charCodeAt(i);
      if (code >= 0xD800 && code <= 0xDBFF) {
        var next = s.charCodeAt(i + 1);
        if (next >= 0xDC00 && next <= 0xDFFF) {
          out += s.charAt(i) + s.charAt(i + 1);
          i += 1;
        }
        continue;
      }
      if (code >= 0xDC00 && code <= 0xDFFF) {
        continue;
      }
      if (code === 0x9 || code === 0xA || code === 0xD) {
        out += s.charAt(i);
        continue;
      }
      if (code < 0x20 || code === 0xFFFE || code === 0xFFFF) {
        continue;
      }
      out += s.charAt(i);
    }
    return out.replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, '');
  }

  function escapeXml(text) {
    return sanitizeXmlText(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatCoreDate(iso) {
    var d = iso ? new Date(iso) : new Date();
    if (isNaN(d.getTime())) {
      d = new Date();
    }
    return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
  }

  function textEncoder(str) {
    return new TextEncoder().encode(str);
  }

  function crc32(buf) {
    var table = crc32.table || (function () {
      var c;
      var tbl = new Uint32Array(256);
      var n;
      var k;
      for (n = 0; n < 256; n += 1) {
        c = n;
        for (k = 0; k < 8; k += 1) {
          c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        tbl[n] = c >>> 0;
      }
      crc32.table = tbl;
      return tbl;
    })();
    var crc = 0 ^ (-1);
    var i;
    for (i = 0; i < buf.length; i += 1) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }

  function u16(n) {
    return [n & 0xFF, (n >>> 8) & 0xFF];
  }

  function u32(n) {
    return [n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF];
  }

  function concatBytes(chunks) {
    var total = 0;
    chunks.forEach(function (chunk) { total += chunk.length; });
    var out = new Uint8Array(total);
    var offset = 0;
    chunks.forEach(function (chunk) {
      out.set(chunk, offset);
      offset += chunk.length;
    });
    return out;
  }

  function buildZip(files) {
    var parts = [];
    var central = [];
    var offset = 0;

    files.forEach(function (file) {
      var nameBytes = textEncoder(file.name);
      var data = file.data instanceof Uint8Array ? file.data : textEncoder(file.data);
      var crc = crc32(data);
      var localHeader = concatBytes([
        new Uint8Array(u32(0x04034b50)),
        new Uint8Array(u16(20)),
        new Uint8Array(u16(0)),
        new Uint8Array(u16(0)),
        new Uint8Array(u16(0)),
        new Uint8Array(u16(0)),
        new Uint8Array(u32(crc)),
        new Uint8Array(u32(data.length)),
        new Uint8Array(u32(data.length)),
        new Uint8Array(u16(nameBytes.length)),
        new Uint8Array(u16(0)),
        nameBytes,
        data
      ]);
      parts.push(localHeader);
      central.push({
        nameBytes: nameBytes,
        crc: crc,
        size: data.length,
        offset: offset
      });
      offset += localHeader.length;
    });

    var centralStart = offset;
    central.forEach(function (entry) {
      var chunk = concatBytes([
        new Uint8Array(u32(0x02014b50)),
        new Uint8Array(u16(20)),
        new Uint8Array(u16(20)),
        new Uint8Array(u16(0)),
        new Uint8Array(u16(0)),
        new Uint8Array(u16(0)),
        new Uint8Array(u16(0)),
        new Uint8Array(u32(entry.crc)),
        new Uint8Array(u32(entry.size)),
        new Uint8Array(u32(entry.size)),
        new Uint8Array(u16(entry.nameBytes.length)),
        new Uint8Array(u16(0)),
        new Uint8Array(u16(0)),
        new Uint8Array(u16(0)),
        new Uint8Array(u16(0)),
        new Uint8Array(u32(0)),
        new Uint8Array(u32(entry.offset)),
        entry.nameBytes
      ]);
      parts.push(chunk);
      offset += chunk.length;
    });

    parts.push(new Uint8Array(concatBytes([
      u32(0x06054b50),
      u16(0),
      u16(0),
      u16(central.length),
      u16(central.length),
      u32(offset - centralStart),
      u32(centralStart),
      u16(0)
    ])));

    return concatBytes(parts);
  }

  function formatReportDate(iso) {
    if (!iso) {
      return new Date().toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });
    }
    try {
      return new Date(iso).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });
    } catch (err) {
      return sanitizeXmlText(iso);
    }
  }

  function tableRunProps(opts) {
    opts = opts || {};
    var color = opts.header ? 'FFFFFF' : '1E293B';
    if (opts.passFail === 'pass') {
      color = '166534';
    } else if (opts.passFail === 'caution') {
      color = 'B45309';
    } else if (opts.passFail === 'fail') {
      color = '991B1B';
    }
    var props =
      '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>' +
      '<w:sz w:val="' + TABLE_FONT_HALF_POINTS + '"/>' +
      '<w:szCs w:val="' + TABLE_FONT_HALF_POINTS + '"/>' +
      '<w:color w:val="' + color + '"/>';
    if (opts.header || opts.bold) {
      props += '<w:b/>';
    }
    if (opts.passFail === 'pass' || opts.passFail === 'caution' || opts.passFail === 'fail') {
      props += '<w:b/>';
    }
    return '<w:rPr>' + props + '</w:rPr>';
  }

  function paragraph(text, style, opts) {
    opts = opts || {};
    var pPr = style ? '<w:pPr><w:pStyle w:val="' + style + '"/>' +
      (opts.spacing ? '<w:spacing w:after="' + opts.spacing + '"/>' : '') + '</w:pPr>' : '';
    return '<w:p>' + pPr + '<w:r><w:t xml:space="preserve">' + escapeXml(text) + '</w:t></w:r></w:p>';
  }

  function tableCell(text, opts) {
    opts = opts || {};
    var tcPr = '<w:tcPr>';
    if (opts.width) {
      tcPr += '<w:tcW w:w="' + opts.width + '" w:type="dxa"/>';
    }
    if (opts.header) {
      tcPr += '<w:shd w:val="clear" w:color="auto" w:fill="0F2942"/>';
    } else if (opts.shade) {
      tcPr += '<w:shd w:val="clear" w:color="auto" w:fill="' + opts.shade + '"/>';
    }
    tcPr += '<w:tcMar>' +
      '<w:top w:w="20" w:type="dxa"/><w:left w:w="40" w:type="dxa"/>' +
      '<w:bottom w:w="20" w:type="dxa"/><w:right w:w="40" w:type="dxa"/>' +
      '</w:tcMar>';
    tcPr += '<w:vAlign w:val="center"/>';
    tcPr += '</w:tcPr>';
    var jc = opts.center ? '<w:pPr><w:jc w:val="center"/></w:pPr>' : '<w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>';
    return '<w:tc>' + tcPr + '<w:p>' + jc + '<w:r>' + tableRunProps(opts) +
      '<w:t xml:space="preserve">' + escapeXml(text == null ? '' : text) + '</w:t></w:r></w:p></w:tc>';
  }

  function sumWidths(widths) {
    var total = 0;
    widths.forEach(function (w) { total += w; });
    return total;
  }

  function tableRowFromCells(cells, colWidths, isHeader) {
    var padded = [];
    var i;
    for (i = 0; i < colWidths.length; i += 1) {
      padded.push(cells[i] != null ? cells[i] : '');
    }
    return '<w:tr>' + padded.map(function (cell, idx) {
      var text = typeof cell === 'string' ? cell : cell.text;
      var passFail = typeof cell === 'object' && cell ? cell.passFail : null;
      return tableCell(text, {
        width: colWidths[idx],
        header: isHeader,
        passFail: passFail,
        bold: isHeader
      });
    }).join('') + '</w:tr>';
  }

  function buildTable(rows, colWidths) {
    var grid = colWidths.map(function (w) {
      return '<w:gridCol w:w="' + w + '"/>';
    }).join('');
    var body = rows.map(function (row) {
      return tableRowFromCells(row.cells, colWidths, !!row.header);
    }).join('');
    return '<w:tbl><w:tblPr>' +
      '<w:tblW w:w="' + sumWidths(colWidths) + '" w:type="dxa"/>' +
      '<w:tblBorders>' +
      '<w:top w:val="single" w:sz="4" w:space="0" w:color="94A3B8"/>' +
      '<w:left w:val="single" w:sz="4" w:space="0" w:color="94A3B8"/>' +
      '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="94A3B8"/>' +
      '<w:right w:val="single" w:sz="4" w:space="0" w:color="94A3B8"/>' +
      '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>' +
      '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>' +
      '</w:tblBorders>' +
      '<w:tblLayout w:type="fixed"/>' +
      '</w:tblPr><w:tblGrid>' + grid + '</w:tblGrid>' + body + '</w:tbl>';
  }

  function normalizeRowCells(cells, colCount) {
    var out = [];
    var i;
    for (i = 0; i < colCount; i += 1) {
      out.push(cells && cells[i] ? cells[i] : { text: '' });
    }
    return out;
  }

  function analysisColumnWidths(colCount) {
    var dataCols = Math.max(colCount - 3, 1);
    var labelWidth = Math.min(5200, Math.max(3600, Math.floor(CONTENT_WIDTH * 0.24)));
    var symbolWidth = 720;
    var unitWidth = 720;
    var remaining = CONTENT_WIDTH - labelWidth - symbolWidth - unitWidth;
    var dataWidth = Math.max(420, Math.floor(remaining / dataCols));
    var widths = [labelWidth, symbolWidth];
    var i;
    for (i = 0; i < dataCols; i += 1) {
      widths.push(dataWidth);
    }
    widths.push(unitWidth);
    return widths;
  }

  function buildAnalysisTable(tableRows) {
    if (!tableRows || !tableRows.length) {
      return '';
    }
    var header = tableRows[0];
    if (!header || !header.cells) {
      return '';
    }
    var colCount = header.cells.length;
    var widths = analysisColumnWidths(colCount);
    var rows = [{
      header: true,
      cells: normalizeRowCells(header.cells, colCount).map(function (cell) {
        return cell.text;
      })
    }];

    tableRows.slice(1).forEach(function (row) {
      if (row.divider) {
        rows.push({
          header: true,
          cells: normalizeRowCells([{ text: row.label || 'Voltage drop at entered run length' }], colCount)
            .map(function (cell, colIdx) {
              return colIdx === 0 ? cell.text : '';
            })
        });
        return;
      }
      var cells = normalizeRowCells(row.cells, colCount).map(function (cell, colIdx) {
        var text = cell.text == null ? '' : String(cell.text);
        var passFail = null;
        if (colIdx >= 2 && colIdx < colCount - 1) {
          if (cell.styleKey === 'pass') {
            text += ' (PASS)';
            passFail = 'pass';
          } else if (cell.styleKey === 'caution') {
            text += ' (CAUTION)';
            passFail = 'caution';
          } else if (cell.styleKey === 'fail') {
            text += ' (FAIL)';
            passFail = 'fail';
          }
        }
        return { text: text, passFail: passFail };
      });
      rows.push({ cells: cells });
    });
    return buildTable(rows, widths);
  }

  function buildParameterTable(snapshot) {
    var defs = global.PwaWorkbook && PwaWorkbook.PARAM_DEFINITIONS
      ? PwaWorkbook.PARAM_DEFINITIONS
      : [];
    var labelWidth = Math.floor(CONTENT_WIDTH * 0.58);
    var valueWidth = CONTENT_WIDTH - labelWidth;
    var rows = [{
      header: true,
      cells: ['Parameter', 'Value']
    }];
    defs.forEach(function (def) {
      var val = snapshot[def.key];
      if (def.key === 'applyInstallationTempLimit' && global.PwaWorkbook &&
          PwaWorkbook.formatApplyInstallationTempLimitDisplay) {
        val = PwaWorkbook.formatApplyInstallationTempLimitDisplay(val);
      }
      rows.push({
        cells: [def.label, val == null ? '' : String(val)]
      });
    });
    return buildTable(rows, [labelWidth, valueWidth]);
  }

  function buildWireDataAuditTable(audit) {
    if (!audit) {
      return '';
    }
    var labelWidth = Math.floor(CONTENT_WIDTH * 0.38);
    var rows = [{
      header: true,
      cells: ['Wire data audit', 'Value']
    }, {
      cells: ['Data source mode', audit.dataSourceLabel || audit.dataSourceMode || '—']
    }, {
      cells: ['Declaration', audit.internalExternalDeclaration || '—']
    }, {
      cells: ['Wire spreadsheet file', audit.wireSpreadsheetFileName || '—']
    }, {
      cells: ['Wire specification revision', audit.wireSpecificationRevision || '—']
    }, {
      cells: ['Validation status', audit.dataValidationStatus || '—']
    }, {
      cells: ['Calculation timestamp', audit.calculationTimestamp || '—']
    }, {
      cells: ['Project folder status', audit.projectFolderStatus || '—']
    }, {
      cells: ['Browser folder API', audit.browserFolderApiSupported ? 'Supported' : 'Not supported']
    }];
    return buildTable(rows, [labelWidth, CONTENT_WIDTH - labelWidth]);
  }

  function buildCoverSummaryTable(meta, sections) {
    var snapshot = sections && sections[0] ? sections[0].snapshot : {};
    var projectNumber = meta.projectNumber || (snapshot && snapshot.projectNumber) || '';
    var projectName = meta.projectName || (snapshot && snapshot.projectName) || '';
    var rows = [{
      header: true,
      cells: ['Document item', 'Detail']
    }, {
      cells: ['Report title', REPORT_TITLE]
    }, {
      cells: ['Project number', projectNumber || '—']
    }, {
      cells: ['Project / system name', projectName || '—']
    }, {
      cells: ['Wire analyses included', String(sections.length)]
    }, {
      cells: ['Document generated', formatReportDate(meta.exportedAt)]
    }, {
      cells: ['Reference standards', REPORT_STANDARDS]
    }];
    var labelWidth = Math.floor(CONTENT_WIDTH * 0.28);
    return buildTable(rows, [labelWidth, CONTENT_WIDTH - labelWidth]);
  }

  function buildEngineeringAssessmentTable(assessment) {
    if (!assessment) {
      return '';
    }
    var labelWidth = Math.floor(CONTENT_WIDTH * 0.38);
    var rows = [{
      header: true,
      cells: ['Engineering assessment', 'Value']
    }, {
      cells: ['Apply installation temperature assessment', assessment.applyInstallationTempLimit ? 'Yes' : 'No']
    }, {
      cells: ['Assessment basis', assessment.assessmentBasis]
    }, {
      cells: ['Cable rating T_R (°C)', String(assessment.cableRatingTr)]
    }, {
      cells: ['Installation temperature limit (°C)',
        assessment.installationTempLimit != null ? String(assessment.installationTempLimit) : '—']
    }, {
      cells: ['Assessment limit T_SAFE (°C)', String(assessment.tSafe)]
    }, {
      cells: ['Calculated T₂ (°C) — AWG ' + assessment.worstAwg,
        String(Math.round(assessment.calculatedT2 * 10) / 10)]
    }, {
      cells: ['Assessment result', assessment.result]
    }, {
      cells: ['Reason', assessment.reason]
    }, {
      cells: ['Engineering notes', assessment.engineeringNotes]
    }];
    return buildTable(rows, [labelWidth, CONTENT_WIDTH - labelWidth]);
  }

  function buildTraceabilityTable(traceability) {
    if (!traceability || !traceability.rows || !traceability.rows.length) {
      return '';
    }
    var labelWidth = Math.floor(CONTENT_WIDTH * 0.22);
    var rows = [{
      header: true,
      cells: ['Calculator function', 'What the tool does', 'Primary reference', 'Type', 'Level', 'Evidence / notes', 'User action']
    }];

    traceability.rows.forEach(function (item) {
      rows.push({
        cells: [
          item.functionName,
          item.toolAction,
          item.primaryReference,
          item.referenceType,
          item.traceabilityLevel,
          item.evidenceNotes,
          item.userAction
        ]
      });
    });

    var tableWidth = CONTENT_WIDTH;
    var colWidths = [
      Math.floor(tableWidth * 0.14),
      Math.floor(tableWidth * 0.16),
      Math.floor(tableWidth * 0.16),
      Math.floor(tableWidth * 0.1),
      Math.floor(tableWidth * 0.06),
      Math.floor(tableWidth * 0.19),
      tableWidth -
        Math.floor(tableWidth * 0.14) -
        Math.floor(tableWidth * 0.16) -
        Math.floor(tableWidth * 0.16) -
        Math.floor(tableWidth * 0.1) -
        Math.floor(tableWidth * 0.06) -
        Math.floor(tableWidth * 0.19)
    ];

    var parts = [];
    parts.push(paragraph(traceability.intro, 'BodyText', { spacing: '80' }));
    parts.push(paragraph(traceability.warning, 'BodyText', { spacing: '80' }));
    parts.push(buildTable(rows, colWidths));
    parts.push(paragraph('Traceability legend', 'Heading3', { spacing: '80' }));
    parts.push(paragraph(traceability.legend.replace(/\n/g, ' '), 'BodyText', { spacing: '80' }));
    parts.push(paragraph(traceability.legendDisclaimer, 'Disclaimer', { spacing: '80' }));
    return parts.join('');
  }

  function buildConfidenceTable(confidenceRating) {
    if (!confidenceRating || !confidenceRating.rows || !confidenceRating.rows.length) {
      return '';
    }
    var tableWidth = CONTENT_WIDTH;
    var colWidths = [
      Math.floor(tableWidth * 0.14),
      Math.floor(tableWidth * 0.1),
      Math.floor(tableWidth * 0.14),
      Math.floor(tableWidth * 0.14),
      Math.floor(tableWidth * 0.06),
      Math.floor(tableWidth * 0.16),
      Math.floor(tableWidth * 0.12),
      tableWidth -
        Math.floor(tableWidth * 0.14) -
        Math.floor(tableWidth * 0.1) -
        Math.floor(tableWidth * 0.14) -
        Math.floor(tableWidth * 0.14) -
        Math.floor(tableWidth * 0.06) -
        Math.floor(tableWidth * 0.16) -
        Math.floor(tableWidth * 0.12)
    ];
    var rows = [{
      header: true,
      cells: ['Item', 'Category', 'Current value', 'Evidence source', 'Rating', 'Basis', 'Risk if incorrect', 'Recommended action']
    }];

    confidenceRating.rows.forEach(function (item) {
      rows.push({
        cells: [
          item.item,
          item.category,
          item.currentValue,
          item.evidenceSource + (item.manuallyOverridden ? ' (override)' : ''),
          item.confidenceRating,
          item.basis,
          item.riskIfIncorrect,
          item.recommendedAction
        ]
      });
    });

    var parts = [];
    parts.push(paragraph(confidenceRating.intro, 'BodyText', { spacing: '80' }));
    parts.push(paragraph(confidenceRating.crossReference, 'BodyText', { spacing: '80' }));
    parts.push(paragraph(
      'Overall confidence classification: ' + confidenceRating.overallClassification + '. ' + confidenceRating.overallDetail,
      'BodyText',
      { spacing: '80' }
    ));
    if (confidenceRating.warnings && confidenceRating.warnings.length) {
      confidenceRating.warnings.forEach(function (warning) {
        parts.push(paragraph(warning, 'BodyText', { spacing: '80' }));
      });
    }
    parts.push(buildTable(rows, colWidths));
    parts.push(paragraph('Confidence rating legend', 'Heading3', { spacing: '80' }));
    parts.push(paragraph(confidenceRating.legend.replace(/\n/g, ' '), 'BodyText', { spacing: '80' }));
    parts.push(paragraph(confidenceRating.disclaimer, 'Disclaimer', { spacing: '80' }));
    return parts.join('');
  }

  function buildValidationTable(validationLibrary) {
    if (!validationLibrary) {
      return '';
    }
    var parts = [];
    parts.push(paragraph(validationLibrary.intro, 'BodyText', { spacing: '80' }));
    if (validationLibrary.noCaseSelected) {
      parts.push(paragraph(validationLibrary.message, 'BodyText', { spacing: '80' }));
    } else {
      var c = validationLibrary.case;
      parts.push(paragraph(
        'Selected case: ' + c.caseName + ' (' + c.caseType + '). Evidence quality: ' + c.evidenceQuality + '.',
        'BodyText',
        { spacing: '80' }
      ));
      parts.push(paragraph('Source reference: ' + c.sourceReference, 'BodyText', { spacing: '80' }));
      if (validationLibrary.warnings && validationLibrary.warnings.length) {
        validationLibrary.warnings.forEach(function (w) {
          parts.push(paragraph(w, 'BodyText', { spacing: '80' }));
        });
      }
      parts.push(paragraph(
        'Validation confidence: ' + validationLibrary.confidence.label + '. ' + validationLibrary.confidence.detail,
        'BodyText',
        { spacing: '80' }
      ));
      var rows = [{
        header: true,
        cells: ['Parameter', 'Reference', 'Calculator', 'Difference', 'Error %', 'Status']
      }];
      (validationLibrary.rows || []).forEach(function (row) {
        rows.push({
          cells: [
            row.parameter,
            row.referenceValue != null ? String(row.referenceValue) : '—',
            row.calculatorValue != null ? String(row.calculatorValue) : '—',
            row.difference != null ? String(row.difference) : '—',
            row.percentError != null ? String(row.percentError) + '%' : '—',
            row.status
          ]
        });
      });
      var tableWidth = CONTENT_WIDTH;
      var colWidths = [0.18, 0.14, 0.14, 0.12, 0.12, 0.14].map(function (f) {
        return Math.floor(tableWidth * f);
      });
      colWidths[5] = tableWidth - colWidths[0] - colWidths[1] - colWidths[2] - colWidths[3] - colWidths[4];
      parts.push(buildTable(rows, colWidths));
      if (c.notes) {
        parts.push(paragraph('Notes: ' + c.notes, 'BodyText', { spacing: '80' }));
      }
      if (c.limitations) {
        parts.push(paragraph('Limitations: ' + c.limitations, 'BodyText', { spacing: '80' }));
      }
    }
    parts.push(paragraph(validationLibrary.disclaimer, 'Disclaimer', { spacing: '80' }));
    return parts.join('');
  }

  function buildAdvancedTcVoltageDropTable(advancedTcVoltageDrop) {
    if (!advancedTcVoltageDrop || !advancedTcVoltageDrop.calculated) {
      return '';
    }
    var d = advancedTcVoltageDrop;
    var disclaimer = global.PwaAdvancedTcVoltageDrop && PwaAdvancedTcVoltageDrop.DISCLAIMER
      ? PwaAdvancedTcVoltageDrop.DISCLAIMER
      : 'Supplementary Advanced Tc voltage-drop comparison.';
    var num = function (v, digits) {
      return v == null || !isFinite(v) ? '—' : String(Math.round(v * Math.pow(10, digits)) / Math.pow(10, digits));
    };
    var parts = [];
    parts.push(paragraph(disclaimer, 'BodyText', { spacing: '80' }));
    var rows = [{
      header: true,
      cells: ['Item', 'Value']
    }, {
      cells: ['Feature enabled', 'Yes']
    }, {
      cells: ['Supplementary assessment basis', d.temperatureBasisUsed || '—']
    }, {
      cells: ['AWG column', 'AWG ' + d.awg]
    }, {
      cells: ['Existing T₂ voltage drop (V)', num(d.vdropT2V, 3)]
    }, {
      cells: ['Existing T₂ voltage drop (%)', num(d.vdropT2Percent, 3)]
    }, {
      cells: ['Advanced Tc voltage drop (V)', num(d.vdropAdvancedTcV, 3)]
    }, {
      cells: ['Advanced Tc voltage drop (%)', num(d.vdropAdvancedTcPercent, 3)]
    }, {
      cells: ['Difference (V)', num(d.differenceV, 3)]
    }, {
      cells: ['Difference (% points)', num(d.differencePercentPoints, 3)]
    }, {
      cells: ['Supplementary status', d.supplementaryStatus]
    }];
    parts.push(buildTable(rows, [Math.floor(CONTENT_WIDTH * 0.42), CONTENT_WIDTH - Math.floor(CONTENT_WIDTH * 0.42)]));

    if (d.interpretation && d.interpretation.length) {
      parts.push(paragraph('Interpretation', 'Heading3', { spacing: '80' }));
      d.interpretation.forEach(function (line) {
        parts.push(paragraph(line, 'BodyText', { spacing: '80' }));
      });
    }

    if (d.assumptions && d.assumptions.length) {
      parts.push(paragraph('Assumptions', 'Heading3', { spacing: '80' }));
      var aRows = [{ header: true, cells: ['Parameter', 'Value', 'Source', 'Comment'] }];
      d.assumptions.forEach(function (a) {
        aRows.push({ cells: [a.parameter, a.value, a.source, a.comment] });
      });
      parts.push(buildTable(aRows, [
        Math.floor(CONTENT_WIDTH * 0.22),
        Math.floor(CONTENT_WIDTH * 0.18),
        Math.floor(CONTENT_WIDTH * 0.22),
        CONTENT_WIDTH - Math.floor(CONTENT_WIDTH * 0.62)
      ]));
    }

    parts.push(paragraph(
      'Traceability note: see Standards Traceability Matrix — Advanced Tc voltage-drop option. Confidence note: Advanced Tc Voltage Drop row.',
      'BodyText',
      { spacing: '80' }
    ));
    return parts.join('');
  }

  function buildAdvancedThermalTable(advancedThermal) {
    if (!advancedThermal || !advancedThermal.enabled) {
      return '';
    }
    var labelWidth = Math.floor(CONTENT_WIDTH * 0.38);
    var disclaimer = global.PwaAdvancedThermal && PwaAdvancedThermal.DISCLAIMER
      ? PwaAdvancedThermal.DISCLAIMER
      : 'Supplementary heat-balance analysis.';
    var passStyle = advancedThermal.passFail;
    var rows = [{
      header: true,
      cells: ['Advanced Heat-Balance Model', 'Value']
    }, {
      cells: ['Disclaimer', disclaimer]
    }, {
      cells: ['Conservative Authority Mode', advancedThermal.conservativeAuthorityMode ? 'Enabled' : 'Disabled']
    }, {
      cells: ['Analysis AWG', advancedThermal.awg]
    }, {
      cells: ['Advanced conductor temperature (°C)', String(advancedThermal.tcAdvanced)]
    }, {
      cells: ['Existing T₂ estimate (°C)', String(advancedThermal.existingT2)]
    }, {
      cells: ['Difference (°C)', String(advancedThermal.differenceC)]
    }, {
      cells: ['Percentage difference', String(advancedThermal.differencePct) + '%']
    }, {
      cells: ['Comparison classification', advancedThermal.comparisonStatus]
    }, {
      cells: ['Margin to conductor rating (°C)', String(advancedThermal.ratingMarginC)]
    }, {
      cells: ['Margin to installation limit (°C)',
        advancedThermal.installMarginC != null ? String(advancedThermal.installMarginC) : '—']
    }, {
      cells: ['Existing method — margin to rating (°C)', String(advancedThermal.existingRatingMarginC)]
    }, {
      cells: ['Existing method — installation margin (°C)',
        advancedThermal.existingInstallMarginC != null ? String(advancedThermal.existingInstallMarginC) : '—']
    }, {
      cells: ['Dominant heat transfer mechanism', advancedThermal.dominantMechanism]
    }, {
      cells: ['Advanced result status', passStyle]
    }, {
      cells: ['Generated heat (W)', String(advancedThermal.heatBalance.qGenW)]
    }, {
      cells: ['Convective heat rejection (W)', String(advancedThermal.heatBalance.qConvW)]
    }, {
      cells: ['Radiative heat rejection (W)', String(advancedThermal.heatBalance.qRadW)]
    }, {
      cells: ['Conductive heat rejection (W)', String(advancedThermal.heatBalance.qCondW)]
    }, {
      cells: ['Effective heat rejection total (W)', String(advancedThermal.heatBalance.qLossTotalW)]
    }, {
      cells: ['Solver residual error (W)', String(advancedThermal.heatBalance.residualW)]
    }, {
      cells: ['Solver iteration count',
        String(advancedThermal.solver ? advancedThermal.solver.iterations : advancedThermal.iterations)]
    }, {
      cells: ['Convection coefficient h (W/m²·K)',
        advancedThermal.solver ? String(advancedThermal.solver.convectionCoeff) : '—']
    }, {
      cells: ['Combined heat rejection penalty',
        advancedThermal.solver ? String(advancedThermal.solver.combinedPenalty) : '—']
    }, {
      cells: ['ISA density (kg/m³) / pressure (kPa)',
        advancedThermal.atmosphere.densityKgM3 + ' / ' + advancedThermal.atmosphere.pressureKPa]
    }];

    if (advancedThermal.assumptions && advancedThermal.assumptions.length) {
      rows.push({
        header: true,
        cells: ['Assumption', 'Value / Source / Comment']
      });
      advancedThermal.assumptions.forEach(function (item) {
        rows.push({
          cells: [item.parameter, item.value + ' (' + item.source + ' — ' + (item.comment || '') + ')']
        });
      });
    }

    rows.push({
      cells: ['References statement',
        'Final acceptability remains subject to the applicable certification basis, aircraft Design Authority and installation-specific evidence.']
    });

    return buildTable(rows, [labelWidth, CONTENT_WIDTH - labelWidth]);
  }

  function buildTransientThermalTable(transientThermal) {
    if (!transientThermal || !transientThermal.enabled || !transientThermal.summary) {
      return '';
    }
    var s = transientThermal.summary;
    var disclaimer = global.PwaTransientThermal && PwaTransientThermal.DISCLAIMER
      ? PwaTransientThermal.DISCLAIMER
      : 'Supplementary transient thermal analysis.';
    var labelWidth = Math.floor(CONTENT_WIDTH * 0.38);
    var rows = [{
      header: true,
      cells: ['Transient thermal analysis', 'Value']
    }, {
      cells: ['Disclaimer', disclaimer]
    }, {
      cells: ['Integrator / timestep', transientThermal.integrator + ' @ ' + transientThermal.timestepSec + ' s']
    }, {
      cells: ['Peak temperature (°C)', String(s.peakTempC)]
    }, {
      cells: ['Time to peak', s.peakTimeFormatted]
    }, {
      cells: ['Time to rating limit', s.timeToRatingFormatted]
    }, {
      cells: ['Time to installation limit', s.timeToInstallFormatted]
    }, {
      cells: ['Degree-hours', String(s.thermalExposure.degreeHours)]
    }, {
      cells: ['Max thermal utilisation (%)', String(s.maxUtilisationPct)]
    }, {
      cells: ['Min safety margin (°C)', String(s.minSafetyMarginC)]
    }, {
      cells: ['Engineering status', s.engineeringStatus]
    }];

    if (transientThermal.sensitivity && transientThermal.sensitivity.length) {
      rows.push({ header: true, cells: ['Sensitivity', 'Peak T / ΔT'] });
      transientThermal.sensitivity.forEach(function (row) {
        rows.push({
          cells: [row.variable + ' ' + row.changePct + '%', row.peakTempC + ' / ' + row.differenceC + ' °C']
        });
      });
    }

    return buildTable(rows, [labelWidth, CONTENT_WIDTH - labelWidth]);
  }

  function buildSectionBody(section, meta) {
    var snapshot = section.snapshot || {};
    var projectNumber = snapshot.projectNumber || meta.projectNumber || '';
    var project = snapshot.projectName || meta.projectName || 'Unnamed project / system';
    var wireId = section.wireId || snapshot.wireNumber || '';
    var dateStr = formatReportDate(snapshot.exportedAt || meta.exportedAt);
    var parts = [];

    if (section.sectionTitle) {
      parts.push(paragraph(section.sectionTitle, 'Heading1'));
    }
    parts.push(buildTable([{
      header: true,
      cells: ['Item', 'Detail']
    }, {
      cells: ['Project number', projectNumber || '—']
    }, {
      cells: ['Project / system name', project]
    }, {
      cells: ['Wire number', wireId || '—']
    }, {
      cells: ['Source workbook', section.filename || '—']
    }, {
      cells: ['Analysis generated', dateStr]
    }], [Math.floor(CONTENT_WIDTH * 0.28), CONTENT_WIDTH - Math.floor(CONTENT_WIDTH * 0.28)]));
    parts.push(paragraph('1. Input parameters', 'Heading2', { spacing: '80' }));
    parts.push(buildParameterTable(snapshot));
    if (snapshot.wireDataAudit || (global.PwaWireDataLoader && PwaWireDataLoader.getAuditInfo)) {
      parts.push(paragraph('1a. Wire data source audit', 'Heading2', { spacing: '80' }));
      parts.push(buildWireDataAuditTable(
        snapshot.wireDataAudit || (global.PwaWireDataLoader ? PwaWireDataLoader.getAuditInfo() : null)
      ));
    }
    parts.push(paragraph('2. Engineering assessment', 'Heading2', { spacing: '80' }));
    parts.push(buildEngineeringAssessmentTable(section.engineeringAssessment));
    parts.push(paragraph('3. AWG analysis grid', 'Heading2', { spacing: '80' }));
    parts.push(buildAnalysisTable(section.tableRows));

    var sectionNum = 4;
    if (section.standardsTraceability) {
      parts.push(paragraph(sectionNum + '. Standards Traceability Matrix', 'Heading2', { spacing: '80' }));
      parts.push(buildTraceabilityTable(section.standardsTraceability));
      sectionNum += 1;
    }
    if (section.confidenceRating) {
      parts.push(paragraph(sectionNum + '. Confidence Rating System', 'Heading2', { spacing: '80' }));
      parts.push(buildConfidenceTable(section.confidenceRating));
      sectionNum += 1;
    }
    if (section.validationLibrary) {
      parts.push(paragraph(sectionNum + '. Validation Library', 'Heading2', { spacing: '80' }));
      parts.push(buildValidationTable(section.validationLibrary));
      sectionNum += 1;
    }
    if (section.advancedThermal) {
      parts.push(paragraph(sectionNum + '. Advanced Heat-Balance Model', 'Heading2', { spacing: '80' }));
      parts.push(buildAdvancedThermalTable(section.advancedThermal));
      sectionNum += 1;
    }
    if (section.advancedTcVoltageDrop) {
      parts.push(paragraph(sectionNum + '. Advanced Tc Voltage-Drop Comparison', 'Heading2', { spacing: '80' }));
      parts.push(buildAdvancedTcVoltageDropTable(section.advancedTcVoltageDrop));
      sectionNum += 1;
    }
    if (section.transientThermal) {
      parts.push(paragraph(sectionNum + '. Transient thermal analysis', 'Heading2', { spacing: '80' }));
      parts.push(buildTransientThermalTable(section.transientThermal));
    }
    var legend = global.PwaWorkbook && PwaWorkbook.buildTemperatureStatusLegend
      ? PwaWorkbook.buildTemperatureStatusLegend(snapshot)
      : 'Grid legend: (PASS) = within limit; (CAUTION) = 80%–100% of limit; (FAIL) exceeds limit.';
    parts.push(paragraph(legend, 'BodyText', { spacing: '80' }));
    if (global.PwaWorkbook && PwaWorkbook.buildTemperatureAssessmentNote) {
      var assessmentNote = PwaWorkbook.buildTemperatureAssessmentNote(snapshot);
      if (assessmentNote) {
        parts.push(paragraph(assessmentNote, 'BodyText', { spacing: '80' }));
      }
    }
    if (global.PwaWorkbook && PwaWorkbook.getGlobalDisclaimer) {
      parts.push(paragraph(PwaWorkbook.getGlobalDisclaimer(), 'Disclaimer', { spacing: '80' }));
    }
    return parts.join('');
  }

  function buildSectPr() {
    return '<w:sectPr>' +
      '<w:headerReference w:type="default" r:id="rId2"/>' +
      '<w:footerReference w:type="default" r:id="rId3"/>' +
      '<w:pgSz w:w="' + PAGE_WIDTH_A3_LANDSCAPE + '" w:h="' + PAGE_HEIGHT_A3_LANDSCAPE + '"/>' +
      '<w:pgMar w:top="' + PAGE_MARGIN_TOP + '" w:right="' + PAGE_MARGIN_RIGHT + '" ' +
        'w:bottom="' + PAGE_MARGIN_BOTTOM + '" w:left="' + PAGE_MARGIN_LEFT + '" ' +
        'w:header="360" w:footer="360" w:gutter="0"/>' +
      '<w:cols w:space="720"/>' +
      '</w:sectPr>';
  }

  function buildHeaderXml(meta) {
    var subtitle = meta.projectTitle || buildDocumentSubtitle(meta, meta.sections || []);
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="CBD5E1"/></w:pBdr>' +
      '<w:spacing w:after="40"/></w:pPr>' +
      '<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>' +
      '<w:b/><w:sz w:val="18"/><w:color w:val="0F2942"/></w:rPr>' +
      '<w:t xml:space="preserve">' + escapeXml(REPORT_TITLE) + '  |  ' + escapeXml(subtitle) + '</w:t></w:r></w:p>' +
      '</w:hdr>';
  }

  function buildFooterXml(meta) {
    var projectNumber = meta.projectNumber || '';
    var leftText = projectNumber ? ('Project ' + projectNumber) : REPORT_TITLE;
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="40"/></w:pPr>' +
      '<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="16"/><w:color w:val="64748B"/></w:rPr>' +
      '<w:t xml:space="preserve">' + escapeXml(leftText) + '   |   Power Wire Analysis   |   Page </w:t></w:r>' +
      '<w:fldSimple w:instr=" PAGE "><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>' +
      '<w:sz w:val="16"/><w:color w:val="64748B"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple>' +
      '</w:p></w:ftr>';
  }

  function buildDocumentXml(sections, meta) {
    meta = meta || {};
    meta.sections = sections;
    var body = [];
    body.push(paragraph(REPORT_TITLE, 'Title'));
    body.push(paragraph(
      meta.projectTitle || buildDocumentSubtitle(meta, sections),
      'Subtitle'
    ));
    body.push(buildCoverSummaryTable(meta, sections));
    body.push(paragraph(
      global.PwaWorkbook && PwaWorkbook.getGlobalDisclaimer
        ? PwaWorkbook.getGlobalDisclaimer()
        : 'The calculator determines conductor temperature using SAE ARP4404 methodology. Installation acceptance criteria are project-specific.',
      'Disclaimer',
      { spacing: '120' }
    ));

    sections.forEach(function (section, idx) {
      if (sections.length > 1) {
        section.sectionTitle = section.sectionTitle ||
          ('Wire ' + (section.wireId || String(idx + 1)));
      }
      body.push('<w:p><w:pPr/><w:r><w:br w:type="page"/></w:r></w:p>');
      body.push(buildSectionBody(section, meta));
    });

    body.push(buildSectPr());

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<w:body>' + body.join('') + '</w:body></w:document>';
  }

  function buildDocumentSubtitle(meta, sections) {
    var snapshot = sections && sections[0] ? sections[0].snapshot : {};
    var parts = [];
    var projectNumber = meta.projectNumber || (snapshot && snapshot.projectNumber);
    var projectName = meta.projectName || (snapshot && snapshot.projectName);
    if (projectNumber) {
      parts.push('Project ' + projectNumber);
    }
    if (projectName) {
      parts.push(projectName);
    }
    return parts.length ? parts.join(' — ') : 'Power wire analysis';
  }

  function buildStylesXml() {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:docDefaults><w:rPrDefault><w:rPr>' +
      '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>' +
      '<w:sz w:val="22"/><w:szCs w:val="22"/>' +
      '</w:rPr></w:rPrDefault></w:docDefaults>' +
      '<w:style w:type="paragraph" w:styleId="Normal" w:default="1">' +
      '<w:name w:val="Normal"/>' +
      '<w:qFormat/>' +
      '<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Title" w:default="0">' +
      '<w:name w:val="Title"/><w:basedOn w:val="Normal"/>' +
      '<w:rPr><w:b/><w:sz w:val="44"/><w:color w:val="0F2942"/></w:rPr>' +
      '<w:pPr><w:spacing w:after="120"/></w:pPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Subtitle" w:default="0">' +
      '<w:name w:val="Subtitle"/>' +
      '<w:rPr><w:b/><w:sz w:val="30"/><w:color w:val="1E5A8A"/></w:rPr>' +
      '<w:pPr><w:spacing w:after="120"/></w:pPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Heading1" w:default="0">' +
      '<w:name w:val="heading 1"/>' +
      '<w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="0F2942"/></w:rPr>' +
      '<w:pPr><w:spacing w:before="160" w:after="80"/></w:pPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Heading2" w:default="0">' +
      '<w:name w:val="heading 2"/>' +
      '<w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="0F2942"/></w:rPr>' +
      '<w:pPr><w:spacing w:before="120" w:after="60"/></w:pPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="BodyText" w:default="0">' +
      '<w:name w:val="Body Text"/>' +
      '<w:rPr><w:sz w:val="20"/><w:color w:val="334155"/></w:rPr>' +
      '<w:pPr><w:spacing w:after="60"/></w:pPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Disclaimer" w:default="0">' +
      '<w:name w:val="Disclaimer"/>' +
      '<w:rPr><w:i/><w:sz w:val="18"/><w:color w:val="64748B"/></w:rPr>' +
      '<w:pPr><w:spacing w:before="120"/></w:pPr></w:style>' +
      '</w:styles>';
  }

  function buildSettingsXml() {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:defaultTabStop w:val="720"/>' +
      '<w:characterSpacingControl w:val="doNotCompress"/>' +
      '<w:compat>' +
      '<w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/>' +
      '</w:compat></w:settings>';
  }

  function buildWebSettingsXml() {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:webSettings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:optimizeForBrowser/></w:webSettings>';
  }

  function buildFontTableXml() {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:font w:name="Calibri">' +
      '<w:panose1 w:val="020F0502020204030204"/>' +
      '<w:charset w:val="00"/>' +
      '<w:family w:val="swiss"/>' +
      '<w:pitch w:val="variable"/>' +
      '<w:sig w:usb0="E0002EFF" w:usb1="C000247B" w:usb2="00000009" w:usb3="00000000" w:csb0="000001FF" w:csb1="00000000"/>' +
      '</w:font></w:fonts>';
  }

  function buildAppXml() {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" ' +
      'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
      '<Application>Power Wire Analysis Calculator</Application>' +
      '<Company>Engineering</Company>' +
      '</Properties>';
  }

  function buildDocxFiles(sections, meta) {
    meta = meta || {};
    meta.sections = sections;
    var documentXml = buildDocumentXml(sections, meta);
    var created = formatCoreDate(meta.exportedAt);
    var title = REPORT_TITLE + ' — ' + (meta.projectName || 'Power Wire Analysis');
    return [
      { name: '[Content_Types].xml', data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
        '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>' +
        '<Override PartName="/word/webSettings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.webSettings+xml"/>' +
        '<Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>' +
        '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' +
        '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' +
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
        '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
        '</Types>' },
      { name: '_rels/.rels', data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
        '</Relationships>' },
      { name: 'docProps/core.xml', data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
        'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
        '<dc:title>' + escapeXml(title) + '</dc:title>' +
        '<dc:subject>' + escapeXml(REPORT_STANDARDS) + '</dc:subject>' +
        '<dc:creator>Power Wire Analysis Calculator</dc:creator>' +
        '<dcterms:created xsi:type="dcterms:W3CDTF">' + escapeXml(created) + '</dcterms:created>' +
        '<dcterms:modified xsi:type="dcterms:W3CDTF">' + escapeXml(created) + '</dcterms:modified>' +
        '</cp:coreProperties>' },
      { name: 'docProps/app.xml', data: buildAppXml() },
      { name: 'word/_rels/document.xml.rels', data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>' +
        '<Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/webSettings" Target="webSettings.xml"/>' +
        '<Relationship Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>' +
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>' +
        '</Relationships>' },
      { name: 'word/document.xml', data: documentXml },
      { name: 'word/styles.xml', data: buildStylesXml() },
      { name: 'word/settings.xml', data: buildSettingsXml() },
      { name: 'word/webSettings.xml', data: buildWebSettingsXml() },
      { name: 'word/fontTable.xml', data: buildFontTableXml() },
      { name: 'word/header1.xml', data: buildHeaderXml(meta) },
      { name: 'word/footer1.xml', data: buildFooterXml(meta) }
    ];
  }

  function sanitizeFilename(name) {
    var base = String(name || 'power-wire-analysis')
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return base || 'power-wire-analysis';
  }

  function defaultFilename(snapshot, meta) {
    meta = meta || {};
    if (typeof meta === 'string') {
      meta = { extension: meta.replace(/^[-.]/, '').replace(/^report\.docx$/, 'docx') };
    }
    if (global.PwaWorkbook && PwaWorkbook.buildExportFilename) {
      return PwaWorkbook.buildExportFilename(snapshot, Object.assign({ extension: 'docx' }, meta));
    }
    var date = new Date().toISOString().slice(0, 10);
    return sanitizeFilename(snapshot.projectName) + '-PWA-' + date + '.docx';
  }

  function resolveReportFilename(sections, meta) {
    meta = meta || {};
    if (meta.filename) {
      return meta.filename;
    }
    if (global.PwaWorkbook) {
      if (sections.length > 1 && PwaWorkbook.buildProjectReportFilename) {
        return PwaWorkbook.buildProjectReportFilename(sections[0] && sections[0].snapshot, meta);
      }
      if (PwaWorkbook.buildExportFilename) {
        return PwaWorkbook.buildExportFilename(sections[0] && sections[0].snapshot, {
          wireNumber: meta.wireNumber,
          projectNumber: meta.projectNumber,
          projectName: meta.projectName,
          awgLabels: meta.awgLabels,
          exportedAt: meta.exportedAt,
          extension: 'docx'
        });
      }
    }
    return defaultFilename(sections[0] && sections[0].snapshot, meta);
  }

  function buildReportBlob(sections, meta) {
    meta = meta || {};
    var zip = buildZip(buildDocxFiles(sections, meta));
    return {
      blob: new Blob([zip], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }),
      filename: resolveReportFilename(sections, meta)
    };
  }

  function downloadBlob(blob, filename) {
    if (global.PwaWorkbook && PwaWorkbook.downloadBlob) {
      PwaWorkbook.downloadBlob(blob, filename);
      return;
    }
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function exportReport(snapshot, tableRows, meta) {
    var out = buildReportBlob([{
      snapshot: snapshot,
      tableRows: tableRows,
      wireId: meta.wireId,
      filename: meta.sourceFilename
    }], meta);
    downloadBlob(out.blob, out.filename);
    return out;
  }

  function exportProjectReport(sections, meta) {
    var out = buildReportBlob(sections, meta);
    downloadBlob(out.blob, out.filename);
    return out;
  }

  global.PwaWordReport = {
    exportReport: exportReport,
    exportProjectReport: exportProjectReport,
    buildReportBlob: buildReportBlob,
    defaultFilename: defaultFilename
  };
})(typeof window !== 'undefined' ? window : this);
