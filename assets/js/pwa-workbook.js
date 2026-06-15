(function (global) {
  'use strict';

  var WORKBOOK_VERSION = '2.1.0';
  var REPORT_TITLE = 'Power Wire Analysis Report';
  var REPORT_STANDARDS =
    'Reference standards: SAE ARP4404C §9.3.4.2 (T₂, allowable voltage drop U) · ' +
    'AS50881 / manufacturer wire catalog · FAA AC 43.13-1B Ch.11 (Figs 11-4–11-6 de-rating x, y, z)';

  var STYLE = {
    default: 0,
    reportTitle: 1,
    reportSubtitle: 2,
    reportMeta: 3,
    sectionHeader: 4,
    tableHeader: 5,
    tableLabel: 6,
    tableSymbol: 7,
    tableData: 8,
    tableNum6: 9,
    tableNum3: 10,
    tableNum2: 11,
    tableUnit: 12,
    pass: 13,
    fail: 14,
    caution: 24,
    paramHeader: 15,
    paramKey: 16,
    paramValue: 17,
    paramDesc: 18,
    paramNotes: 19,
    sectionDivider: 20,
    footerNote: 21,
    reportProjectBanner: 22,
    reportWireBanner: 23
  };
  var REPORT_HEADER_ROW_HEIGHT = 33;
  var PARAMETERS_SHEET = 'Parameters';
  var OPTIONS_SHEET = 'Parameter options';
  var ANALYSIS_SHEET = 'Analysis';
  var ENGINEERING_ASSESSMENT_SHEET = 'Engineering Assessment';
  var TRACEABILITY_SHEET = 'Standards Traceability';
  var CONFIDENCE_SHEET = 'Confidence Rating';
  var VALIDATION_SHEET = 'Validation Library';
  var ADVANCED_THERMAL_SHEET = 'Advanced Heat-Balance';
  var ADVANCED_TC_VDROP_SHEET = 'Advanced Tc Vdrop';
  var TRANSIENT_SHEET = 'Transient Thermal';
  var WIRE_DATA_AUDIT_SHEET = 'Wire Data Audit';
  var SECTION_COL_COUNT = 6;
  var META_KEYS = ['pwa_workbook_version', 'pwa_exported_at', 'pwa_grid_title'];

  var PARAM_DEFINITIONS = [
    { key: 'projectNumber', label: 'Project number' },
    { key: 'projectName', label: 'Project / system name' },
    { key: 'wireNumber', label: 'Wire number / identifier' },
    { key: 'filenameIncludeTimestamp', label: 'Include date/time in export filename' },
    { key: 'wireType', label: 'Wire type' },
    { key: 'generatorLineVoltagePreset', label: 'Voltage preset' },
    { key: 'generatorLineVoltageCustom', label: 'Custom voltage (V)' },
    { key: 'circuitCurrent', label: 'Circuit current (A)' },
    { key: 'operationType', label: 'Operation basis' },
    { key: 'allowableDrop', label: 'Allowable drop U (V)' },
    { key: 'ambientTemp', label: 'Ambient temperature T1 (°C)' },
    { key: 'conductorTempRatingPreset', label: 'Conductor rating TR preset' },
    { key: 'conductorTempRatingCustom', label: 'Custom TR (°C)' },
    { key: 'applyInstallationTempLimit', label: 'Apply installation temperature assessment' },
    { key: 'installationGuidancePreset', label: 'Engineering guidance preset (optional)' },
    { key: 'installationTempLimit', label: 'Installation temperature limit (°C)' },
    { key: 'tSafe', label: 'Assessment limit T_SAFE (°C)' },
    { key: 't2Standard', label: 'T2 calculation standard' },
    { key: 'altitudeFt', label: 'Altitude (ft)' },
    { key: 'bundleWireCount', label: 'Wires in bundle' },
    { key: 'bundleLoadingPct', label: 'Bundle loading (%)' },
    { key: 'wireLength', label: 'Voltage drop — run length (one-way)' },
    { key: 'wireLengthUnit', label: 'Voltage drop — run length unit' },
    { key: 'routingPct', label: 'Routing allowance (%)' }
  ];

  function isApplyInstallationTempLimitEnabled(snapshot) {
    var val = snapshot && snapshot.applyInstallationTempLimit;
    if (val == null || val === '') {
      return false;
    }
    if (val === true) {
      return true;
    }
    if (val === false) {
      return false;
    }
    var normalized = String(val).trim().toLowerCase();
    if (normalized === 'no' || normalized === '0' || normalized === 'off' || normalized === 'false') {
      return false;
    }
    if (normalized === 'yes' || normalized === '1' || normalized === 'on' || normalized === 'true') {
      return true;
    }
    return false;
  }

  function formatApplyInstallationTempLimitDisplay(val) {
    return isApplyInstallationTempLimitEnabled({ applyInstallationTempLimit: val }) ? 'Yes' : 'No';
  }

  function buildTemperatureStatusLegend(snapshot) {
    if (isApplyInstallationTempLimitEnabled(snapshot)) {
      return 'Apply installation temperature assessment: Yes. Grid status: green (PASS) = T₂ ≤ 80% T_SAFE or V_drop ≤ U; ' +
        'amber (CAUTION) = 80% T_SAFE < T₂ ≤ T_SAFE; red (FAIL) = exceeds limit. ' +
        'T_SAFE = MIN(T_R, installation temperature limit). Installation assessment applies.';
    }
    return 'Apply installation temperature assessment: No. Grid status: green (PASS) = T₂ ≤ 80% T_R or V_drop ≤ U; ' +
      'amber (CAUTION) = 80% T_R < T₂ ≤ T_R; red (FAIL) = exceeds T_R. Cable rating assessment applies.';
  }

  function buildTemperatureAssessmentNote(snapshot) {
    if (isApplyInstallationTempLimitEnabled(snapshot)) {
      return '';
    }
    return 'Note: Installation temperature assessment disabled. Temperature pass/fail assessed against cable rating T_R only.';
  }

  function getGlobalDisclaimer() {
    if (global.PwaGridCalculator && PwaGridCalculator.GLOBAL_DISCLAIMER) {
      return PwaGridCalculator.GLOBAL_DISCLAIMER;
    }
    return 'The calculator determines conductor temperature using SAE ARP4404 methodology. ' +
      'Installation acceptance criteria are project-specific and shall be established by the Design Authority.';
  }

  function buildEngineeringAssessmentRows(assessment, colCount) {
    if (!assessment) {
      return [];
    }
    colCount = colCount || 3;
    var rows = [
      { spacer: true, height: 8 },
      {
        cells: [{ text: 'ENGINEERING ASSESSMENT', span: colCount }],
        styleKey: 'sectionHeader',
        height: 20
      },
      {
        cells: [
          { text: 'Apply installation temperature assessment', styleKey: 'tableLabel' },
          { text: assessment.applyInstallationTempLimit ? 'Yes' : 'No', styleKey: 'tableData', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Assessment basis', styleKey: 'tableLabel' },
          { text: assessment.assessmentBasis, styleKey: 'tableData', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Cable rating T_R (°C)', styleKey: 'tableLabel' },
          { text: String(assessment.cableRatingTr), styleKey: 'tableNum3', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Installation temperature limit (°C)', styleKey: 'tableLabel' },
          {
            text: assessment.installationTempLimit != null ? String(assessment.installationTempLimit) : '—',
            styleKey: 'tableData',
            span: colCount - 1
          }
        ]
      },
      {
        cells: [
          { text: 'Assessment limit T_SAFE (°C)', styleKey: 'tableLabel' },
          { text: String(assessment.tSafe), styleKey: 'tableNum3', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Calculated T₂ (°C) — AWG ' + assessment.worstAwg, styleKey: 'tableLabel' },
          { text: String(Math.round(assessment.calculatedT2 * 10) / 10), styleKey: 'tableNum3', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Assessment result', styleKey: 'tableLabel' },
          {
            text: assessment.result,
            styleKey: assessment.result === 'PASS' ? 'pass' : 'fail',
            span: colCount - 1
          }
        ]
      },
      {
        cells: [
          { text: 'Reason', styleKey: 'tableLabel' },
          { text: assessment.reason, styleKey: 'tableData', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Engineering notes', styleKey: 'tableLabel' },
          { text: assessment.engineeringNotes, styleKey: 'paramNotes', span: colCount - 1 }
        ]
      }
    ];
    return rows;
  }

  function buildWireDataAuditRows(audit, colCount) {
    if (!audit) {
      return [];
    }
    colCount = colCount || 3;
    return [
      { spacer: true, height: 8 },
      {
        cells: [{ text: 'WIRE DATA SOURCE AUDIT', span: colCount }],
        styleKey: 'sectionHeader',
        height: 20
      },
      {
        cells: [
          { text: 'Data source mode', styleKey: 'tableLabel' },
          { text: audit.dataSourceLabel || audit.dataSourceMode || '—', styleKey: 'tableData', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Internal / external declaration', styleKey: 'tableLabel' },
          { text: audit.internalExternalDeclaration || '—', styleKey: 'paramNotes', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Wire spreadsheet file', styleKey: 'tableLabel' },
          { text: audit.wireSpreadsheetFileName || '—', styleKey: 'tableData', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Wire specification revision', styleKey: 'tableLabel' },
          { text: audit.wireSpecificationRevision || '—', styleKey: 'tableData', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Wire specification name', styleKey: 'tableLabel' },
          { text: audit.wireSpecificationName || '—', styleKey: 'tableData', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Data validation status', styleKey: 'tableLabel' },
          { text: audit.dataValidationStatus || '—', styleKey: 'tableData', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Calculation timestamp (UTC)', styleKey: 'tableLabel' },
          { text: audit.calculationTimestamp || '—', styleKey: 'tableData', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Browser folder API', styleKey: 'tableLabel' },
          {
            text: audit.browserFolderApiSupported ? 'Supported' : 'Not supported',
            styleKey: 'tableData',
            span: colCount - 1
          }
        ]
      },
      {
        cells: [
          { text: 'Project folder status', styleKey: 'tableLabel' },
          { text: audit.projectFolderStatus || '—', styleKey: 'tableData', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Project folder label', styleKey: 'tableLabel' },
          { text: audit.projectFolderLabel || '—', styleKey: 'tableData', span: colCount - 1 }
        ]
      }
    ];
  }

  function advancedPassFailStyle(passFail) {
    if (passFail === 'PASS') {
      return 'pass';
    }
    if (passFail === 'WARNING') {
      return 'caution';
    }
    return 'fail';
  }

  function buildAdvancedThermalRows(advancedThermal, colCount) {
    if (!advancedThermal || !advancedThermal.enabled) {
      return [];
    }
    colCount = colCount || 3;
    var disclaimer = global.PwaAdvancedThermal && global.PwaAdvancedThermal.DISCLAIMER
      ? global.PwaAdvancedThermal.DISCLAIMER
      : 'Supplementary heat-balance analysis.';
    var rows = [
      { spacer: true, height: 8 },
      {
        cells: [{ text: 'ADVANCED HEAT-BALANCE MODEL', span: colCount }],
        styleKey: 'sectionHeader',
        height: 20
      },
      {
        cells: [
          { text: disclaimer, styleKey: 'paramNotes', span: colCount }
        ]
      },
      {
        cells: [
          { text: 'Conservative Authority Mode', styleKey: 'tableLabel' },
          {
            text: advancedThermal.conservativeAuthorityMode ? 'Enabled' : 'Disabled',
            styleKey: 'tableData',
            span: colCount - 1
          }
        ]
      },
      {
        cells: [
          { text: 'Analysis AWG', styleKey: 'tableLabel' },
          { text: advancedThermal.awg, styleKey: 'tableData', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Advanced conductor temperature (°C)', styleKey: 'tableLabel' },
          { text: String(advancedThermal.tcAdvanced), styleKey: 'tableNum3', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Existing T₂ estimate (°C)', styleKey: 'tableLabel' },
          { text: String(advancedThermal.existingT2), styleKey: 'tableNum3', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Difference (°C / %)', styleKey: 'tableLabel' },
          {
            text: String(advancedThermal.differenceC) + ' / ' + String(advancedThermal.differencePct) + '%',
            styleKey: 'tableData',
            span: colCount - 1
          }
        ]
      },
      {
        cells: [
          { text: 'Comparison classification', styleKey: 'tableLabel' },
          { text: advancedThermal.comparisonStatus, styleKey: 'tableData', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Margin to conductor rating (°C)', styleKey: 'tableLabel' },
          { text: String(advancedThermal.ratingMarginC), styleKey: 'tableNum3', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Margin to installation limit (°C)', styleKey: 'tableLabel' },
          {
            text: advancedThermal.installMarginC != null ? String(advancedThermal.installMarginC) : '—',
            styleKey: 'tableData',
            span: colCount - 1
          }
        ]
      },
      {
        cells: [
          { text: 'Existing method — margin to rating / install (°C)', styleKey: 'tableLabel' },
          {
            text: String(advancedThermal.existingRatingMarginC) + ' / ' +
              (advancedThermal.existingInstallMarginC != null ? String(advancedThermal.existingInstallMarginC) : '—'),
            styleKey: 'tableData',
            span: colCount - 1
          }
        ]
      },
      {
        cells: [
          { text: 'Dominant heat transfer mechanism', styleKey: 'tableLabel' },
          { text: advancedThermal.dominantMechanism, styleKey: 'tableData', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Advanced result status', styleKey: 'tableLabel' },
          {
            text: advancedThermal.passFail,
            styleKey: advancedPassFailStyle(advancedThermal.passFail),
            span: colCount - 1
          }
        ]
      },
      {
        cells: [
          { text: 'Heat balance (W): Q_gen / Q_conv / Q_rad / Q_cond / effective total / residual', styleKey: 'tableLabel' },
          {
            text: [
              advancedThermal.heatBalance.qGenW,
              advancedThermal.heatBalance.qConvW,
              advancedThermal.heatBalance.qRadW,
              advancedThermal.heatBalance.qCondW,
              advancedThermal.heatBalance.qLossTotalW,
              advancedThermal.heatBalance.residualW
            ].join(' / '),
            styleKey: 'tableData',
            span: colCount - 1
          }
        ]
      },
      {
        cells: [
          { text: 'Solver iterations / h / combined penalty', styleKey: 'tableLabel' },
          {
            text: (advancedThermal.solver ? advancedThermal.solver.iterations : advancedThermal.iterations) + ' / ' +
              (advancedThermal.solver ? advancedThermal.solver.convectionCoeff : '—') + ' / ' +
              (advancedThermal.solver ? advancedThermal.solver.combinedPenalty : '—'),
            styleKey: 'tableData',
            span: colCount - 1
          }
        ]
      },
      {
        cells: [
          { text: 'ISA atmosphere: density (kg/m³) / pressure (kPa)', styleKey: 'tableLabel' },
          {
            text: advancedThermal.atmosphere.densityKgM3 + ' / ' + advancedThermal.atmosphere.pressureKPa,
            styleKey: 'tableData',
            span: colCount - 1
          }
        ]
      }
    ];

    if (advancedThermal.assumptions && advancedThermal.assumptions.length) {
      rows.push({
        cells: [{ text: 'Advanced Model Assumptions', span: colCount }],
        styleKey: 'tableHeader',
        height: 18
      });
      advancedThermal.assumptions.forEach(function (item) {
        rows.push({
          cells: [
            { text: item.parameter, styleKey: 'tableLabel' },
            { text: item.value, styleKey: 'tableData' },
            {
              text: item.source + (item.comment ? ' — ' + item.comment : ''),
              styleKey: 'tableData',
              span: Math.max(colCount - 2, 1)
            }
          ]
        });
      });
    }

    rows.push({
      cells: [{
        text: 'Final acceptability remains subject to the applicable certification basis, aircraft Design Authority and installation-specific evidence.',
        styleKey: 'paramNotes',
        span: colCount
      }]
    });

    return rows;
  }

  function buildAdvancedTcVoltageDropRows(advancedTcVoltageDrop, colCount) {
    if (!advancedTcVoltageDrop || !advancedTcVoltageDrop.calculated) {
      return [];
    }
    colCount = colCount || 3;
    var d = advancedTcVoltageDrop;
    var disclaimer = global.PwaAdvancedTcVoltageDrop && PwaAdvancedTcVoltageDrop.DISCLAIMER
      ? PwaAdvancedTcVoltageDrop.DISCLAIMER
      : 'Supplementary Advanced Tc voltage-drop comparison.';
    var num = function (v, digits) {
      return v == null || !isFinite(v) ? '—' : String(Math.round(v * Math.pow(10, digits)) / Math.pow(10, digits));
    };
    var rows = [
      { spacer: true, height: 8 },
      {
        cells: [{ text: 'ADVANCED TC VOLTAGE-DROP COMPARISON', span: colCount }],
        styleKey: 'sectionHeader',
        height: 20
      },
      {
        cells: [{ text: disclaimer, styleKey: 'paramNotes', span: colCount }]
      },
      {
        cells: [
          { text: 'Feature enabled', styleKey: 'tableLabel' },
          { text: 'Yes', styleKey: 'tableData', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Assessment basis (supplementary)', styleKey: 'tableLabel' },
          { text: d.temperatureBasisUsed || '—', styleKey: 'tableData', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'AWG column', styleKey: 'tableLabel' },
          { text: 'AWG ' + d.awg, styleKey: 'tableData', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Existing T₂ voltage drop (V)', styleKey: 'tableLabel' },
          { text: num(d.vdropT2V, 3), styleKey: 'tableNum3', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Existing T₂ voltage drop (%)', styleKey: 'tableLabel' },
          { text: num(d.vdropT2Percent, 3), styleKey: 'tableNum3', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Advanced Tc voltage drop (V)', styleKey: 'tableLabel' },
          { text: num(d.vdropAdvancedTcV, 3), styleKey: 'tableNum3', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Advanced Tc voltage drop (%)', styleKey: 'tableLabel' },
          { text: num(d.vdropAdvancedTcPercent, 3), styleKey: 'tableNum3', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Difference (V / % pts)', styleKey: 'tableLabel' },
          {
            text: num(d.differenceV, 3) + ' V / ' + num(d.differencePercentPoints, 3) + ' % pts',
            styleKey: 'tableData',
            span: colCount - 1
          }
        ]
      },
      {
        cells: [
          { text: 'Supplementary status (Advanced Tc)', styleKey: 'tableLabel' },
          {
            text: d.supplementaryStatus,
            styleKey: advancedPassFailStyle(d.supplementaryStatus),
            span: colCount - 1
          }
        ]
      }
    ];

    if (d.interpretation && d.interpretation.length) {
      d.interpretation.forEach(function (line) {
        rows.push({
          cells: [{ text: line, styleKey: 'paramNotes', span: colCount }]
        });
      });
    }

    if (d.assumptions && d.assumptions.length) {
      rows.push({
        cells: [{ text: 'Assumptions', span: colCount }],
        styleKey: 'sectionHeader',
        height: 18
      });
      d.assumptions.forEach(function (a) {
        rows.push({
          cells: [
            { text: a.parameter, styleKey: 'tableLabel' },
            { text: a.value, styleKey: 'tableData' },
            { text: a.source, styleKey: 'tableData' },
            { text: a.comment, styleKey: 'paramNotes', span: Math.max(colCount - 3, 1) }
          ]
        });
      });
    }

    rows.push({
      cells: [{
        text: 'Traceability: Advanced Tc voltage-drop option (Standards Traceability Matrix). Confidence: Advanced Tc Voltage Drop row.',
        styleKey: 'paramNotes',
        span: colCount
      }]
    });

    return rows;
  }

  function buildValidationRows(validationLibrary, colCount) {
    if (!validationLibrary) {
      return [];
    }
    colCount = colCount || 3;
    var rows = [
      { spacer: true, height: 8 },
      {
        cells: [{ text: 'VALIDATION LIBRARY', span: colCount }],
        styleKey: 'sectionHeader',
        height: 20
      },
      {
        cells: [{ text: validationLibrary.intro, styleKey: 'paramNotes', span: colCount }]
      }
    ];

    if (validationLibrary.noCaseSelected) {
      rows.push({
        cells: [{ text: validationLibrary.message, styleKey: 'paramNotes', span: colCount }]
      });
    } else {
      var c = validationLibrary.case;
      rows.push({
        cells: [{
          text: 'Case: ' + c.caseName + ' | Type: ' + c.caseType + ' | Evidence: ' + c.evidenceQuality,
          styleKey: 'paramNotes',
          span: colCount
        }]
      });
      rows.push({
        cells: [{ text: 'Source: ' + c.sourceReference, styleKey: 'paramNotes', span: colCount }]
      });
      if (validationLibrary.warnings && validationLibrary.warnings.length) {
        validationLibrary.warnings.forEach(function (w) {
          rows.push({ cells: [{ text: w, styleKey: 'paramNotes', span: colCount }] });
        });
      }
      rows.push({
        cells: [{
          text: 'Validation confidence: ' + validationLibrary.confidence.label + ' — ' + validationLibrary.confidence.detail,
          styleKey: 'paramNotes',
          span: colCount
        }]
      });
      rows.push({
        cells: [
          { text: 'Parameter', styleKey: 'tableHeader' },
          { text: 'Reference / Calculator / Error / Status', styleKey: 'tableHeader', span: Math.max(colCount - 1, 1) }
        ],
        height: 18
      });
      (validationLibrary.rows || []).forEach(function (row) {
        rows.push({
          cells: [
            { text: row.parameter, styleKey: 'tableLabel' },
            {
              text: [
                row.referenceValue != null ? row.referenceValue : '—',
                row.calculatorValue != null ? row.calculatorValue : '—',
                row.difference != null ? row.difference : '—',
                row.status
              ].join(' | '),
              styleKey: 'tableData',
              span: Math.max(colCount - 1, 1)
            }
          ]
        });
      });
      var m = validationLibrary.metrics;
      if (m) {
        rows.push({
          cells: [{
            text: 'MAE: ' + (m.meanAbsoluteError != null ? m.meanAbsoluteError : '—') +
              ' | Max AE: ' + (m.maxAbsoluteError != null ? m.maxAbsoluteError : '—') +
              ' | Comparable: ' + m.comparableCount + ' | Outside tolerance: ' + m.outsideCount,
            styleKey: 'paramNotes',
            span: colCount
          }]
        });
      }
      if (c.notes) {
        rows.push({ cells: [{ text: 'Notes: ' + c.notes, styleKey: 'paramNotes', span: colCount }] });
      }
      if (c.limitations) {
        rows.push({ cells: [{ text: 'Limitations: ' + c.limitations, styleKey: 'paramNotes', span: colCount }] });
      }
    }

    rows.push({
      cells: [{ text: validationLibrary.disclaimer, styleKey: 'paramNotes', span: colCount }]
    });
    return rows;
  }

  function buildConfidenceRows(confidenceRating, colCount) {
    if (!confidenceRating || !confidenceRating.rows || !confidenceRating.rows.length) {
      return [];
    }
    colCount = colCount || 3;
    var rows = [
      { spacer: true, height: 8 },
      {
        cells: [{ text: 'CONFIDENCE RATING SYSTEM', span: colCount }],
        styleKey: 'sectionHeader',
        height: 20
      },
      {
        cells: [{ text: confidenceRating.intro, styleKey: 'paramNotes', span: colCount }]
      },
      {
        cells: [{ text: confidenceRating.crossReference, styleKey: 'paramNotes', span: colCount }]
      },
      {
        cells: [{
          text: 'Overall classification: ' + confidenceRating.overallClassification +
            ' | Lowest rating: ' + confidenceRating.lowestRating,
          styleKey: 'paramNotes',
          span: colCount
        }]
      }
    ];

    if (confidenceRating.warnings && confidenceRating.warnings.length) {
      confidenceRating.warnings.forEach(function (warning) {
        rows.push({
          cells: [{ text: warning, styleKey: 'paramNotes', span: colCount }]
        });
      });
    }

    rows.push({
      cells: [
        { text: 'Item', styleKey: 'tableHeader' },
        { text: 'Category / value', styleKey: 'tableHeader' },
        { text: 'Evidence / rating', styleKey: 'tableHeader' },
        { text: 'Basis / risk / action', styleKey: 'tableHeader', span: Math.max(colCount - 3, 1) }
      ],
      height: 18
    });

    confidenceRating.rows.forEach(function (item) {
      var overrideNote = item.manuallyOverridden ? ' (manual override)' : '';
      rows.push({
        cells: [
          { text: item.item, styleKey: 'tableLabel' },
          {
            text: item.category + ' | ' + item.currentValue,
            styleKey: 'tableData'
          },
          {
            text: item.evidenceSource + ' / ' + item.confidenceRating + overrideNote,
            styleKey: 'tableData'
          },
          {
            text: item.basis + ' | Risk: ' + item.riskIfIncorrect + ' | Action: ' + item.recommendedAction,
            styleKey: 'tableData',
            span: Math.max(colCount - 3, 1)
          }
        ]
      });
    });

    rows.push({
      cells: [{ text: confidenceRating.legend, styleKey: 'paramNotes', span: colCount }]
    });
    rows.push({
      cells: [{ text: confidenceRating.disclaimer, styleKey: 'paramNotes', span: colCount }]
    });

    return rows;
  }

  function buildTraceabilityRows(traceability, colCount) {
    if (!traceability || !traceability.rows || !traceability.rows.length) {
      return [];
    }
    colCount = colCount || 3;
    var rows = [
      { spacer: true, height: 8 },
      {
        cells: [{ text: 'STANDARDS TRACEABILITY MATRIX', span: colCount }],
        styleKey: 'sectionHeader',
        height: 20
      },
      {
        cells: [{ text: traceability.intro, styleKey: 'paramNotes', span: colCount }]
      },
      {
        cells: [{ text: traceability.warning, styleKey: 'paramNotes', span: colCount }]
      },
      {
        cells: [
          { text: 'Function', styleKey: 'tableHeader' },
          { text: 'What the tool does', styleKey: 'tableHeader' },
          { text: 'Primary reference', styleKey: 'tableHeader' },
          { text: 'Type / Level', styleKey: 'tableHeader' },
          { text: 'Evidence / user action', styleKey: 'tableHeader', span: Math.max(colCount - 4, 1) }
        ],
        height: 18
      }
    ];

    traceability.rows.forEach(function (item) {
      rows.push({
        cells: [
          { text: item.functionName, styleKey: 'tableLabel' },
          { text: item.toolAction, styleKey: 'tableData' },
          { text: item.primaryReference, styleKey: 'tableData' },
          {
            text: item.referenceType + ' / ' + item.traceabilityLevel,
            styleKey: 'tableData'
          },
          {
            text: item.evidenceNotes + ' | Action: ' + item.userAction,
            styleKey: 'tableData',
            span: Math.max(colCount - 4, 1)
          }
        ]
      });
    });

    rows.push({
      cells: [{ text: traceability.legend, styleKey: 'paramNotes', span: colCount }]
    });
    rows.push({
      cells: [{ text: traceability.legendDisclaimer, styleKey: 'paramNotes', span: colCount }]
    });

    return rows;
  }

  function buildTransientThermalRows(transientThermal, colCount) {
    if (!transientThermal || !transientThermal.enabled || !transientThermal.summary) {
      return [];
    }
    colCount = colCount || 3;
    var s = transientThermal.summary;
    var disclaimer = global.PwaTransientThermal
      ? global.PwaTransientThermal.DISCLAIMER
      : 'Supplementary transient thermal analysis.';
    var rows = [
      { spacer: true, height: 8 },
      {
        cells: [{ text: 'TRANSIENT THERMAL ANALYSIS', span: colCount }],
        styleKey: 'sectionHeader',
        height: 20
      },
      {
        cells: [{ text: disclaimer, styleKey: 'paramNotes', span: colCount }]
      },
      {
        cells: [
          { text: 'Integrator / timestep', styleKey: 'tableLabel' },
          {
            text: transientThermal.integrator + ' @ ' + transientThermal.timestepSec + ' s',
            styleKey: 'tableData',
            span: colCount - 1
          }
        ]
      },
      {
        cells: [
          { text: 'Peak temperature (°C)', styleKey: 'tableLabel' },
          { text: String(s.peakTempC), styleKey: 'tableNum3', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Time to peak', styleKey: 'tableLabel' },
          { text: s.peakTimeFormatted, styleKey: 'tableData', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Time to rating limit', styleKey: 'tableLabel' },
          { text: s.timeToRatingFormatted, styleKey: 'tableData', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Time to installation limit', styleKey: 'tableLabel' },
          { text: s.timeToInstallFormatted, styleKey: 'tableData', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Degree-hours exposure', styleKey: 'tableLabel' },
          { text: String(s.thermalExposure.degreeHours), styleKey: 'tableNum3', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Max thermal utilisation (%)', styleKey: 'tableLabel' },
          { text: String(s.maxUtilisationPct), styleKey: 'tableNum3', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Min safety margin (°C)', styleKey: 'tableLabel' },
          { text: String(s.minSafetyMarginC), styleKey: 'tableNum3', span: colCount - 1 }
        ]
      },
      {
        cells: [
          { text: 'Engineering status', styleKey: 'tableLabel' },
          {
            text: s.engineeringStatus,
            styleKey: s.engineeringStatus === 'PASS' ? 'pass' : (s.engineeringStatus === 'WARNING' ? 'caution' : 'fail'),
            span: colCount - 1
          }
        ]
      }
    ];

    if (transientThermal.sensitivity && transientThermal.sensitivity.length) {
      rows.push({
        cells: [{ text: 'Sensitivity analysis', span: colCount }],
        styleKey: 'tableHeader',
        height: 18
      });
      transientThermal.sensitivity.forEach(function (row) {
        rows.push({
          cells: [
            { text: row.variable + ' (' + row.changePct + '%)', styleKey: 'tableLabel' },
            { text: String(row.peakTempC) + ' (Δ ' + row.differenceC + ' °C)', styleKey: 'tableData', span: colCount - 1 }
          ]
        });
      });
    }

    return rows;
  }

  function escapeXml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeFormula(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function colName(index) {
    var n = index + 1;
    var letters = '';
    while (n > 0) {
      var rem = (n - 1) % 26;
      letters = String.fromCharCode(65 + rem) + letters;
      n = Math.floor((n - 1) / 26);
    }
    return letters;
  }

  function cellRef(col, row) {
    return colName(col) + String(row);
  }

  function crc32(buf) {
    var table = crc32.table || (function () {
      var c;
      var tbl = new Uint32Array(256);
      for (var n = 0; n < 256; n += 1) {
        c = n;
        for (var k = 0; k < 8; k += 1) {
          c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        tbl[n] = c >>> 0;
      }
      crc32.table = tbl;
      return tbl;
    })();
    var crc = 0 ^ (-1);
    for (var i = 0; i < buf.length; i += 1) {
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

  function textEncoder(str) {
    return new TextEncoder().encode(str);
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

  function readUint32(view, offset) {
    return view.getUint32(offset, true);
  }

  function readUint16(view, offset) {
    return view.getUint16(offset, true);
  }

  async function readFileArrayBuffer(file) {
    function viaFileReader() {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () {
          resolve(reader.result);
        };
        reader.onerror = function () {
          reject(new Error('Could not read the selected file.'));
        };
        reader.readAsArrayBuffer(file);
      });
    }

    if (!file || typeof file.arrayBuffer !== 'function') {
      return viaFileReader();
    }

    try {
      return await file.arrayBuffer();
    } catch (err) {
      return viaFileReader();
    }
  }

  async function inflateZipEntry(data) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('This browser cannot decompress Excel files. Try Chrome or Edge.');
    }

    var formats = ['deflate-raw', 'deflate'];
    var lastError = null;

    for (var i = 0; i < formats.length; i += 1) {
      try {
        var stream = new Blob([data]).stream().pipeThrough(new DecompressionStream(formats[i]));
        var buffer = await new Response(stream).arrayBuffer();
        return new Uint8Array(buffer);
      } catch (err) {
        lastError = err;
      }
    }

    throw new Error(
      lastError && lastError.message && lastError.message.indexOf('fetch') === -1
        ? lastError.message
        : 'Could not decompress the Excel file. Re-export from this calculator and try again.'
    );
  }

  async function extractZipEntries(buffer) {
    var view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    var eocd = -1;
    for (var i = buffer.length - 22; i >= 0; i -= 1) {
      if (readUint32(view, i) === 0x06054b50) {
        eocd = i;
        break;
      }
    }
    if (eocd < 0) throw new Error('Invalid Excel file (zip archive missing).');

    var centralOffset = readUint32(view, eocd + 16);
    var totalEntries = readUint16(view, eocd + 10);
    var files = {};
    var ptr = centralOffset;

    for (var n = 0; n < totalEntries; n += 1) {
      if (readUint32(view, ptr) !== 0x02014b50) break;
      var compression = readUint16(view, ptr + 10);
      var compSize = readUint32(view, ptr + 20);
      var nameLen = readUint16(view, ptr + 28);
      var extraLen = readUint16(view, ptr + 30);
      var commentLen = readUint16(view, ptr + 32);
      var localOffset = readUint32(view, ptr + 42);
      var name = new TextDecoder().decode(buffer.subarray(ptr + 46, ptr + 46 + nameLen));
      ptr += 46 + nameLen + extraLen + commentLen;

      var localNameLen = readUint16(view, localOffset + 26);
      var localExtraLen = readUint16(view, localOffset + 28);
      var localCompression = readUint16(view, localOffset + 8);
      var localCompSize = readUint32(view, localOffset + 18);
      var dataStart = localOffset + 30 + localNameLen + localExtraLen;
      var size = localCompSize || compSize;
      var raw = buffer.subarray(dataStart, dataStart + size);
      var method = localCompression || compression;
      if (method === 0) {
        files[name] = raw;
      } else if (method === 8) {
        files[name] = await inflateZipEntry(raw);
      } else {
        throw new Error('Unsupported Excel compression in file.');
      }
    }

    return files;
  }

  function resolveStyle(styleKey, fallback) {
    if (styleKey && STYLE[styleKey] != null) {
      return STYLE[styleKey];
    }
    if (fallback && STYLE[fallback] != null) {
      return STYLE[fallback];
    }
    return STYLE.default;
  }

  function normalizeCell(cell, fallbackStyleKey) {
    if (cell != null && typeof cell === 'object' &&
        ('text' in cell || 'value' in cell || 'formula' in cell || 'span' in cell)) {
      return {
        text: cell.text,
        value: cell.value,
        formula: cell.formula,
        span: cell.span,
        styleKey: cell.styleKey,
        style: cell.style != null
          ? cell.style
          : resolveStyle(cell.styleKey, fallbackStyleKey)
      };
    }
    return {
      text: cell,
      style: resolveStyle(fallbackStyleKey, STYLE.default)
    };
  }

  function sheetCellXml(col, row, cell, fallbackStyleKey) {
    var ref = cellRef(col, row);
    var data = normalizeCell(cell, fallbackStyleKey);
    var styleAttr = data.style != null ? ' s="' + Number(data.style) + '"' : '';

    if (data.formula) {
      return '<c r="' + ref + '"' + styleAttr + '><f>' + escapeXml(data.formula) + '</f></c>';
    }
    if (typeof data.value === 'number' && isFinite(data.value)) {
      return '<c r="' + ref + '"' + styleAttr + '><v>' + data.value + '</v></c>';
    }
    return '<c r="' + ref + '" t="inlineStr"' + styleAttr + '><is><t>' +
      escapeXml(data.text == null ? '' : data.text) + '</t></is></c>';
  }

  function buildMergeCellsXml(rows) {
    var merges = [];
    rows.forEach(function (row, rowIdx) {
      var rowNumber = rowIdx + 1;
      (row.cells || []).forEach(function (cell, colIdx) {
        var span = cell && cell.span;
        if (span && span > 1) {
          merges.push(cellRef(colIdx, rowNumber) + ':' + cellRef(colIdx + span - 1, rowNumber));
        }
      });
    });
    if (!merges.length) {
      return '';
    }
    return '<mergeCells count="' + merges.length + '">' +
      merges.map(function (ref) { return '<mergeCell ref="' + ref + '"/>'; }).join('') +
      '</mergeCells>';
  }

  function buildSheetDimension(rows) {
    var maxRow = rows.length;
    var maxCol = 1;
    rows.forEach(function (row) {
      if (row.divider) {
        maxCol = Math.max(maxCol, row.colspan || 1);
        return;
      }
      (row.cells || []).forEach(function (cell, colIdx) {
        var span = cell && cell.span ? cell.span : 1;
        maxCol = Math.max(maxCol, colIdx + span);
      });
    });
    return 'A1:' + cellRef(maxCol - 1, maxRow);
  }

  function buildWorksheetXml(rows, options) {
    options = options || {};
    var xmlRows = [];
    var maxCol = 0;

    rows.forEach(function (row, rowIdx) {
      var rowNumber = rowIdx + 1;
      var rowAttrs = ' r="' + rowNumber + '"';
      if (row.height) {
        rowAttrs += ' ht="' + row.height + '" customHeight="1"';
      }

      if (row.spacer) {
        xmlRows.push('<row' + rowAttrs + '><c r="A' + rowNumber + '"/></row>');
        return;
      }

      if (row.divider) {
        var span = row.colspan || maxCol || 4;
        maxCol = Math.max(maxCol, span);
        xmlRows.push('<row' + rowAttrs + '>' +
          sheetCellXml(0, rowNumber, {
            text: row.label || '',
            span: span,
            styleKey: 'sectionDivider'
          }, 'sectionDivider') + '</row>');
        return;
      }

      var cells = row.cells || [];
      cells.forEach(function (cell, colIdx) {
        var span = cell && cell.span ? cell.span : 1;
        maxCol = Math.max(maxCol, colIdx + span);
      });
      if (!cells.length) {
        maxCol = Math.max(maxCol, 1);
      }
      var rowStyleKey = row.styleKey || (row.isHeader ? 'tableHeader' : 'default');
      var cellXml = '';

      cells.forEach(function (cell, colIdx) {
        if (cell && cell.span && cell.span > 1) {
          cellXml += sheetCellXml(colIdx, rowNumber, cell, rowStyleKey);
          return;
        }
        var fallback = rowStyleKey;
        if (!row.isHeader && colIdx === 0) {
          fallback = 'tableLabel';
        } else if (!row.isHeader && colIdx === 1) {
          fallback = 'tableSymbol';
        } else if (!row.isHeader && colIdx === cells.length - 1 && cells.length > 2) {
          fallback = 'tableUnit';
        } else if (!row.isHeader && colIdx >= 2) {
          fallback = 'tableData';
        }
        cellXml += sheetCellXml(colIdx, rowNumber, cell, fallback);
      });

      xmlRows.push('<row' + rowAttrs + '>' + cellXml + '</row>');
    });

    var colsXml = '';
    if (options.colWidths && options.colWidths.length) {
      colsXml = '<cols>';
      options.colWidths.forEach(function (width, idx) {
        colsXml += '<col min="' + (idx + 1) + '" max="' + (idx + 1) +
          '" width="' + width + '" customWidth="1"/>';
      });
      colsXml += '</cols>';
    }

    var sheetViewsXml = '';
    if (options.sheetView) {
      var sv = options.sheetView;
      sheetViewsXml =
        '<sheetViews><sheetView workbookViewId="0"' +
        (sv.showGridLines === false ? ' showGridLines="0"' : '') + '>' +
        '<pane xSplit="' + (sv.xSplit || 0) + '" ySplit="' + sv.ySplit +
        '" topLeftCell="' + sv.topLeftCell + '" activePane="' + sv.activePane +
        '" state="frozen"/></sheetView></sheetViews>';
    }

    var dataValidationsXml = '';
    if (options.dataValidations && options.dataValidations.length) {
      dataValidationsXml = '<dataValidations count="' + options.dataValidations.length + '">';
      options.dataValidations.forEach(function (dv) {
        dataValidationsXml +=
          '<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" ' +
          'showDropDown="0" errorStyle="stop" sqref="' + escapeXml(dv.sqref) + '">';
        if (dv.promptTitle) {
          dataValidationsXml += '<promptTitle>' + escapeXml(dv.promptTitle) + '</promptTitle>';
        }
        if (dv.prompt) {
          dataValidationsXml += '<prompt>' + escapeXml(dv.prompt) + '</prompt>';
        }
        dataValidationsXml +=
          '<formula1>' + escapeFormula(dv.formula1) + '</formula1></dataValidation>';
      });
      dataValidationsXml += '</dataValidations>';
    }

    var pageSectionXml = '';
    if (options.landscape) {
      pageSectionXml =
        '<printOptions horizontalCentered="1"/>' +
        '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>' +
        '<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0" paperSize="9"/>';
    }

    var sheetPrXml = options.landscape
      ? '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>'
      : '';

    var dimensionXml = '<dimension ref="' + buildSheetDimension(rows) + '"/>';

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      sheetPrXml + dimensionXml +
      sheetViewsXml + colsXml +
      '<sheetData>' + xmlRows.join('') + '</sheetData>' +
      buildMergeCellsXml(rows) +
      dataValidationsXml +
      pageSectionXml +
      '</worksheet>';
  }

  function buildStylesXml() {
    function xf(numFmtId, fontId, fillId, borderId, opts) {
      opts = opts || {};
      var align = opts.align ? '<alignment horizontal="' + opts.align.h + '" vertical="' +
        (opts.align.v || 'center') + '"' +
        (opts.align.wrap ? ' wrapText="1"' : '') + '/>' : '';
      return '<xf numFmtId="' + numFmtId + '" fontId="' + fontId + '" fillId="' + fillId +
        '" borderId="' + borderId + '" xfId="0"' +
        (opts.applyNumber ? ' applyNumberFormat="1"' : '') +
        (opts.applyFont ? ' applyFont="1"' : '') +
        (opts.applyFill ? ' applyFill="1"' : '') +
        (opts.applyBorder ? ' applyBorder="1"' : '') +
        (align ? ' applyAlignment="1"' : '') + '>' + align + '</xf>';
    }

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<numFmts count="4">' +
      '<numFmt numFmtId="164" formatCode="0.000000"/>' +
      '<numFmt numFmtId="165" formatCode="0.000"/>' +
      '<numFmt numFmtId="166" formatCode="0.00"/>' +
      '<numFmt numFmtId="167" formatCode="0.0"/>' +
      '</numFmts>' +
      '<fonts count="8">' +
      '<font><sz val="11"/><color rgb="FF000000"/><name val="Calibri"/><family val="2"/></font>' +
      '<font><b/><sz val="18"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>' +
      '<font><b/><sz val="12"/><color rgb="FF0F2942"/><name val="Calibri"/><family val="2"/></font>' +
      '<font><sz val="10"/><color rgb="FF475569"/><name val="Calibri"/><family val="2"/></font>' +
      '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>' +
      '<font><i/><sz val="9"/><color rgb="FF64748B"/><name val="Calibri"/><family val="2"/></font>' +
      '<font><b/><sz val="14"/><color rgb="FF0F2942"/><name val="Calibri"/><family val="2"/></font>' +
      '<font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>' +
      '</fonts>' +
      '<fills count="10">' +
      '<fill><patternFill patternType="none"/></fill>' +
      '<fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FF0F2942"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFE8F1F8"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFBBF7D0"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFFECACA"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFFFFBEB"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/><bgColor indexed="64"/></patternFill></fill>' +
      '</fills>' +
      '<borders count="4">' +
      '<border/>' +
      '<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right>' +
      '<top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom></border>' +
      '<border><bottom style="medium"><color rgb="FF1E5A8A"/></bottom></border>' +
      '<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right>' +
      '<top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="medium"><color rgb="FF0F2942"/></bottom></border>' +
      '</borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="25">' +
      xf(0, 0, 0, 1, { applyBorder: true, align: { h: 'left', v: 'center' } }) +
      xf(0, 1, 2, 0, { applyFont: true, applyFill: true, align: { h: 'center', v: 'center' } }) +
      xf(0, 2, 3, 2, { applyFont: true, applyFill: true, applyBorder: true, align: { h: 'left', v: 'center' } }) +
      xf(0, 3, 0, 0, { applyFont: true, align: { h: 'left', v: 'center', wrap: true } }) +
      xf(0, 2, 0, 2, { applyFont: true, applyBorder: true, align: { h: 'left', v: 'center' } }) +
      xf(0, 4, 2, 3, { applyFont: true, applyFill: true, applyBorder: true, align: { h: 'center', v: 'center', wrap: true } }) +
      xf(0, 0, 3, 1, { applyFill: true, applyBorder: true, align: { h: 'left', v: 'center', wrap: true } }) +
      xf(0, 0, 4, 1, { applyFill: true, applyBorder: true, align: { h: 'center', v: 'center' } }) +
      xf(0, 0, 0, 1, { applyBorder: true, align: { h: 'center', v: 'center' } }) +
      xf(164, 0, 0, 1, { applyNumber: true, applyBorder: true, align: { h: 'center', v: 'center' } }) +
      xf(165, 0, 0, 1, { applyNumber: true, applyBorder: true, align: { h: 'center', v: 'center' } }) +
      xf(166, 0, 0, 1, { applyNumber: true, applyBorder: true, align: { h: 'center', v: 'center' } }) +
      xf(0, 5, 0, 1, { applyFont: true, applyBorder: true, align: { h: 'center', v: 'center' } }) +
      xf(166, 0, 5, 1, { applyNumber: true, applyFill: true, applyBorder: true, align: { h: 'center', v: 'center' } }) +
      xf(166, 0, 6, 1, { applyNumber: true, applyFill: true, applyBorder: true, align: { h: 'center', v: 'center' } }) +
      xf(0, 4, 2, 3, { applyFont: true, applyFill: true, applyBorder: true, align: { h: 'center', v: 'center' } }) +
      xf(0, 0, 4, 1, { applyFill: true, applyBorder: true, align: { h: 'left', v: 'center' } }) +
      xf(0, 0, 0, 1, { applyBorder: true, align: { h: 'left', v: 'center' } }) +
      xf(0, 0, 0, 1, { applyBorder: true, align: { h: 'left', v: 'center' } }) +
      xf(0, 5, 0, 1, { applyFont: true, applyBorder: true, align: { h: 'left', v: 'center', wrap: true } }) +
      xf(0, 4, 2, 3, { applyFont: true, applyFill: true, applyBorder: true, align: { h: 'left', v: 'center', wrap: true } }) +
      xf(0, 5, 7, 1, { applyFont: true, applyFill: true, align: { h: 'left', v: 'center', wrap: true } }) +
      xf(0, 6, 3, 2, { applyFont: true, applyFill: true, applyBorder: true, align: { h: 'left', v: 'center' } }) +
      xf(0, 7, 2, 3, { applyFont: true, applyFill: true, applyBorder: true, align: { h: 'left', v: 'center' } }) +
      xf(166, 0, 9, 1, { applyNumber: true, applyFill: true, applyBorder: true, align: { h: 'center', v: 'center' } }) +
      '</cellXfs>' +
      '<cellStyles count="1">' +
      '<cellStyle name="Normal" xfId="0" builtinId="0"/>' +
      '</cellStyles>' +
      '</styleSheet>';
  }

  function formatReportDate(iso) {
    if (!iso) {
      return new Date().toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });
    }
    try {
      return new Date(iso).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });
    } catch (err) {
      return String(iso);
    }
  }

  function buildProjectBannerText(snapshot) {
    snapshot = snapshot || {};
    var parts = [];
    if (snapshot.projectNumber) {
      parts.push('Project No. ' + snapshot.projectNumber);
    }
    if (snapshot.projectName) {
      parts.push(snapshot.projectName);
    }
    if (parts.length) {
      return parts.join('  ·  ');
    }
    return 'PROJECT NOT SET — enter Project number and Project / system name in the calculator';
  }

  function buildWireBannerText(snapshot) {
    snapshot = snapshot || {};
    if (snapshot.wireNumber) {
      return 'Wire No. ' + snapshot.wireNumber;
    }
    return 'WIRE NUMBER NOT SET — enter Wire number in the calculator';
  }

  function buildReportIdentificationRows(snapshot, colCount, row4Text, row5Text) {
    return [
      {
        cells: [{ text: REPORT_TITLE.toUpperCase(), span: colCount }],
        styleKey: 'reportTitle',
        height: REPORT_HEADER_ROW_HEIGHT
      },
      {
        cells: [{ text: buildProjectBannerText(snapshot), span: colCount }],
        styleKey: 'reportProjectBanner',
        height: REPORT_HEADER_ROW_HEIGHT
      },
      {
        cells: [{ text: buildWireBannerText(snapshot), span: colCount }],
        styleKey: 'reportWireBanner',
        height: REPORT_HEADER_ROW_HEIGHT
      },
      {
        cells: [{ text: row4Text, span: colCount }],
        styleKey: 'reportMeta',
        height: REPORT_HEADER_ROW_HEIGHT
      },
      {
        cells: [{ text: row5Text, span: colCount }],
        styleKey: 'reportMeta',
        height: REPORT_HEADER_ROW_HEIGHT
      }
    ];
  }

  function buildDocProps(snapshot) {
    snapshot = snapshot || {};
    var titleParts = [REPORT_TITLE];
    if (snapshot.projectNumber) {
      titleParts.push('Project ' + snapshot.projectNumber);
    }
    if (snapshot.projectName) {
      titleParts.push(snapshot.projectName);
    }
    if (snapshot.wireNumber) {
      titleParts.push('Wire ' + snapshot.wireNumber);
    }
    var created = snapshot && snapshot.exportedAt ? snapshot.exportedAt : new Date().toISOString();
    return {
      core:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<cp:coreProperties ' +
        'xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
        'xmlns:dc="http://purl.org/dc/elements/1.1/" ' +
        'xmlns:dcterms="http://purl.org/dc/terms/" ' +
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
        '<dc:title>' + escapeXml(titleParts.join(' — ')) + '</dc:title>' +
        '<dc:subject>' + escapeXml(REPORT_STANDARDS) + '</dc:subject>' +
        '<dc:creator>Power Wire Analysis Calculator</dc:creator>' +
        '<cp:lastModifiedBy>Power Wire Analysis Calculator</cp:lastModifiedBy>' +
        '<dcterms:created xsi:type="dcterms:W3CDTF">' + escapeXml(created) + '</dcterms:created>' +
        '</cp:coreProperties>',
      app:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" ' +
        'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
        '<Application>Power Wire Analysis Calculator</Application>' +
        '<Company>Engineering</Company>' +
        '</Properties>'
    };
  }

  function decorateAnalysisSheet(tableRows, meta) {
    meta = meta || {};
    var snapshot = meta.snapshot || {};
    var colCount = (tableRows[0] && tableRows[0].cells) ? tableRows[0].cells.length : 3;
    var dateStr = formatReportDate(snapshot.exportedAt);
    var prefix = buildReportIdentificationRows(
      snapshot,
      colCount,
      (meta.gridTitle || 'AWG comparison grid') + '  |  Generated ' + dateStr +
        '  |  Workbook v' + WORKBOOK_VERSION,
      REPORT_STANDARDS
    ).concat([
      {
        cells: [{
          text: buildTemperatureStatusLegend(snapshot),
          span: colCount
        }],
        styleKey: 'reportMeta',
        height: REPORT_HEADER_ROW_HEIGHT
      },
      {
        cells: [{
          text: getGlobalDisclaimer(),
          span: colCount
        }],
        styleKey: 'footerNote',
        height: REPORT_HEADER_ROW_HEIGHT
      },
      { spacer: true, height: 6 },
      {
        cells: [{ text: 'AWG ANALYSIS GRID', span: colCount }],
        styleKey: 'sectionHeader',
        height: 20
      }
    ]);

    var body = tableRows.map(function (row) {
      if (row.divider) {
        return {
          divider: true,
          label: row.label || 'Voltage drop at entered run length',
          colspan: colCount
        };
      }

      var styledCells = (row.cells || []).map(function (cell, colIdx) {
        var out = {
          text: cell.text,
          value: cell.value,
          styleKey: cell.styleKey,
          numStyle: cell.numStyle
        };
        if (row.isHeader) {
          out.styleKey = 'tableHeader';
        } else if (colIdx === 0) {
          out.styleKey = out.styleKey || 'tableLabel';
        } else if (colIdx === 1) {
          out.styleKey = out.styleKey || 'tableSymbol';
        } else if (colIdx === row.cells.length - 1) {
          out.styleKey = out.styleKey || 'tableUnit';
        } else if (out.styleKey !== 'pass' && out.styleKey !== 'fail' && out.styleKey !== 'caution') {
          out.styleKey = out.styleKey || (out.value != null ? (cell.numStyle || 'tableNum3') : 'tableData');
        }
        return out;
      });

      return {
        cells: styledCells,
        isHeader: row.isHeader,
        section: row.section
      };
    });

    return prefix.concat(body);
  }

  function optionsSheetRange(col, startRow, endRow) {
    var sheetRef = OPTIONS_SHEET.replace(/'/g, "''");
    return "'" + sheetRef + "'!$" + col + '$' + startRow + ':$' + col + '$' + endRow;
  }

  function buildDropdownFormula1(options, rangeRef) {
    if (!options || !options.length) {
      return rangeRef;
    }
    var parts = options.map(function (opt) {
      return String(opt.value).replace(/"/g, '""');
    });
    var inline = '"' + parts.join(',') + '"';
    if (inline.length <= 255) {
      return inline;
    }
    return rangeRef;
  }

  function buildOptionsSheetData(parameterOptions) {
    if (!parameterOptions) {
      return null;
    }

    var columns = [];
    PARAM_DEFINITIONS.forEach(function (def) {
      var opts = parameterOptions[def.key];
      if (opts && opts.length) {
        columns.push({ key: def.key, label: def.label, options: opts });
      }
    });
    if (!columns.length) {
      return null;
    }

    var rows = [
      { cells: [{ text: 'Parameter option lists — values for Parameters sheet column B' }] },
      {
        cells: [{
          text: 'Each column lists allowed values for one parameter key. Use the Value rows when editing Parameters; labels below are for reference only.'
        }]
      },
      { divider: true },
      {
        cells: columns.map(function (col) {
          return { text: col.key };
        }),
        isHeader: true
      },
      {
        cells: columns.map(function (col) {
          return { text: col.label };
        })
      }
    ];

    var maxLen = 0;
    columns.forEach(function (col) {
      maxLen = Math.max(maxLen, col.options.length);
    });

    var valueStartRow = rows.length + 1;
    var ranges = {};

    for (var r = 0; r < maxLen; r += 1) {
      rows.push({
        cells: columns.map(function (col) {
          var opt = col.options[r];
          if (!opt) {
            return { text: '' };
          }
          return { text: String(opt.value) };
        })
      });
    }

    columns.forEach(function (col, colIdx) {
      if (!col.options.length) {
        return;
      }
      var startRow = valueStartRow;
      var endRow = valueStartRow + col.options.length - 1;
      ranges[col.key] = optionsSheetRange(colName(colIdx), startRow, endRow);
    });

    rows.push({ divider: true });
    rows.push({
      cells: [{ text: 'Option labels (reference only — import reads Value rows above)' }]
    });
    rows.push({
      cells: columns.map(function () {
        return { text: 'Label' };
      }),
      isHeader: true
    });

    for (var labelRow = 0; labelRow < maxLen; labelRow += 1) {
      rows.push({
        cells: columns.map(function (col) {
          var opt = col.options[labelRow];
          if (!opt) {
            return { text: '' };
          }
          return { text: opt.label || String(opt.value) };
        })
      });
    }

    var colWidths = columns.map(function (col) {
      return Math.min(32, Math.max(12, col.key.length + 6));
    });

    return { rows: rows, ranges: ranges, colWidths: colWidths };
  }

  function buildParametersRows(snapshot, meta) {
    meta = meta || {};
    var optionRanges = meta.optionRanges || {};
    var parameterOptions = meta.parameterOptions || {};
    var colCount = 4;
    var dateStr = formatReportDate(snapshot.exportedAt);
    var rows = buildReportIdentificationRows(
      snapshot,
      colCount,
      'Generated ' + dateStr + '  |  Workbook v' + WORKBOOK_VERSION +
        '  |  ' + (meta.gridTitle || 'Wire analysis grid'),
      REPORT_STANDARDS
    ).concat([
      {
        cells: [{
          text: 'Section 1 — Input parameters. Edit column B (dropdown where provided) and re-import to restore settings in the calculator.',
          span: colCount
        }],
        styleKey: 'reportMeta',
        height: REPORT_HEADER_ROW_HEIGHT
      },
      { spacer: true, height: 6 },
      {
        cells: [{ text: '1. INPUT PARAMETERS', span: colCount }],
        styleKey: 'sectionHeader',
        height: 20
      },
      {
        cells: [
          { text: 'Key', styleKey: 'paramHeader' },
          { text: 'Value', styleKey: 'paramHeader' },
          { text: 'Description', styleKey: 'paramHeader' },
          { text: 'Notes', styleKey: 'paramHeader' }
        ],
        isHeader: true
      }
    ]);
    var rowByKey = {};
    var dataValidations = [];

    PARAM_DEFINITIONS.forEach(function (def) {
      var excelRow = rows.length + 1;
      rowByKey[def.key] = excelRow;
      var notes = '';
      if (def.key === 'applyInstallationTempLimit') {
        notes = 'Yes = T₂ assessed against installation limit (T_SAFE); No = assessed against cable rating T_R only';
      } else if (def.key === 'installationGuidancePreset' || def.key === 'aircraftZone') {
        notes = 'Optional engineering guidance preset — not a certification limit';
      } else if (def.key === 'tSafe') {
        notes = 'Computed: MIN(T_R, installation limit) when assessment enabled; otherwise T_R';
      } else if (!isApplyInstallationTempLimitEnabled(snapshot) &&
          (def.key === 'installationTempLimit')) {
        notes = 'Stored for re-import; not used when installation assessment is disabled';
      } else if (optionRanges[def.key]) {
        notes = 'Dropdown in column B';
      } else if (def.key === 'generatorLineVoltageCustom' || def.key === 'conductorTempRatingCustom') {
        notes = 'Numeric — only when preset is custom';
      } else {
        notes = 'Free entry (number or text)';
      }
      var rawVal = snapshot[def.key];
      var valueCell = {
        text: def.key === 'applyInstallationTempLimit'
          ? formatApplyInstallationTempLimitDisplay(rawVal)
          : (rawVal == null ? '' : String(rawVal)),
        styleKey: 'paramValue'
      };
      if (rawVal != null && rawVal !== '' && def.key !== 'applyInstallationTempLimit' &&
          !isNaN(parseFloat(rawVal)) &&
          def.key !== 'projectNumber' && def.key !== 'projectName' && def.key !== 'wireNumber' &&
          def.key !== 'wireType' &&
          def.key !== 'operationType' && def.key !== 't2Standard' &&
          def.key !== 'wireLengthUnit' && def.key !== 'generatorLineVoltagePreset' &&
          def.key !== 'conductorTempRatingPreset') {
        valueCell.value = parseFloat(rawVal);
      }
      rows.push({
        cells: [
          { text: def.key, styleKey: 'paramKey' },
          valueCell,
          { text: def.label, styleKey: 'paramDesc' },
          { text: notes, styleKey: 'paramNotes' }
        ]
      });
    });

    rows.push({ spacer: true, height: 8 });
    rows.push({
      cells: [{
        text: getGlobalDisclaimer(),
        span: colCount,
        styleKey: 'footerNote'
      }],
      height: 48
    });

    Object.keys(optionRanges).forEach(function (key) {
      if (rowByKey[key] && optionRanges[key]) {
        dataValidations.push({
          sqref: 'B' + rowByKey[key],
          formula1: buildDropdownFormula1(parameterOptions[key], optionRanges[key]),
          promptTitle: 'Select a value',
          prompt: 'Choose from the dropdown list.'
        });
      }
    });

    return { rows: rows, dataValidations: dataValidations };
  }

  function addWorksheetFile(files, contentTypesRef, workbookRelsRef, workbookSheetsRef, ctx, xml, sheetName, hidden) {
    var sheetNum = ctx.sheetId;
    var rel = ctx.relId;
    files.push({ name: 'xl/worksheets/sheet' + sheetNum + '.xml', data: xml });
    contentTypesRef.value +=
      '<Override PartName="/xl/worksheets/sheet' + sheetNum + '.xml" ' +
      'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
    workbookRelsRef.value +=
      '<Relationship Id="rId' + rel + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + sheetNum + '.xml"/>';
    workbookSheetsRef.value +=
      '<sheet name="' + escapeXml(sheetName) + '" sheetId="' + sheetNum + '" r:id="rId' + rel + '"' +
      (hidden ? ' state="hidden"' : '') + '/>';
    ctx.sheetId += 1;
    ctx.relId += 1;
  }

  function analysisLabelColumnWidth(tableRows) {
    var maxLen = 48;
    (tableRows || []).forEach(function (row) {
      if (row.divider || !row.cells || !row.cells[0]) {
        return;
      }
      var text = String(row.cells[0].text || '');
      if (text.length > maxLen) {
        maxLen = text.length;
      }
    });
    return Math.min(Math.max(maxLen + 6, 48), 80);
  }

  function trimSectionLeadingSpacer(sectionRows) {
    if (!sectionRows || !sectionRows.length) {
      return sectionRows;
    }
    if (sectionRows[0] && sectionRows[0].spacer) {
      return sectionRows.slice(1);
    }
    return sectionRows;
  }

  function buildSectionSheetRows(snapshot, sectionRows, subtitle) {
    if (!sectionRows || !sectionRows.length) {
      return null;
    }
    var colCount = SECTION_COL_COUNT;
    var dateStr = formatReportDate(snapshot.exportedAt);
    var header = buildReportIdentificationRows(
      snapshot,
      colCount,
      subtitle,
      'Generated ' + dateStr + '  |  Workbook v' + WORKBOOK_VERSION
    );
    return header.concat(trimSectionLeadingSpacer(sectionRows));
  }

  function sectionSheetColWidths() {
    return [28, 36, 24, 18, 30, 30];
  }

  function addSectionWorksheet(files, ctRef, relRef, sheetsRef, ctx, sheetName, sectionRows, snapshot, subtitle) {
    var rows = buildSectionSheetRows(snapshot, sectionRows, subtitle);
    if (!rows) {
      return;
    }
    var xml = buildWorksheetXml(rows, {
      colWidths: sectionSheetColWidths(),
      landscape: true,
      sheetView: {
        xSplit: 0,
        ySplit: 5,
        topLeftCell: 'A6',
        activePane: 'bottomLeft'
      }
    });
    addWorksheetFile(files, ctRef, relRef, sheetsRef, ctx, xml, sheetName, false);
  }

  function buildWorkbookFiles(snapshot, tableRows, meta) {
    meta = meta || {};
    var includeParameters = meta.includeParameters !== false;
    var files = [];
    var sheetCtx = { sheetId: 1, relId: 1 };

    var contentTypes =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>';

    var workbookRels =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';

    var ctRef = { value: contentTypes };
    var relRef = { value: workbookRels };
    var sheetsRef = { value: '' };

    var decoratedAnalysis = decorateAnalysisSheet(tableRows, {
      snapshot: snapshot,
      gridTitle: meta.gridTitle
    });
    var analysisHeaderRow = 9;
    var tableColWidths = [analysisLabelColumnWidth(tableRows), 9];
    if (tableRows[0] && tableRows[0].cells) {
      for (var i = 2; i < tableRows[0].cells.length; i += 1) {
        tableColWidths.push(i === tableRows[0].cells.length - 1 ? 11 : 13);
      }
    }
    var analysisXml = buildWorksheetXml(decoratedAnalysis, {
      colWidths: tableColWidths,
      landscape: true,
      sheetView: {
        xSplit: 2,
        ySplit: analysisHeaderRow,
        topLeftCell: 'C' + (analysisHeaderRow + 1),
        activePane: 'bottomRight'
      }
    });
    addWorksheetFile(files, ctRef, relRef, sheetsRef, sheetCtx, analysisXml, ANALYSIS_SHEET, false);

    addSectionWorksheet(
      files, ctRef, relRef, sheetsRef, sheetCtx,
      ENGINEERING_ASSESSMENT_SHEET,
      buildEngineeringAssessmentRows(meta.engineeringAssessment, SECTION_COL_COUNT),
      snapshot,
      'Installation assessment summary'
    );
    addSectionWorksheet(
      files, ctRef, relRef, sheetsRef, sheetCtx,
      WIRE_DATA_AUDIT_SHEET,
      buildWireDataAuditRows(meta.wireDataAudit || snapshot.wireDataAudit, SECTION_COL_COUNT),
      snapshot,
      'Wire data source and validation audit trail'
    );
    addSectionWorksheet(
      files, ctRef, relRef, sheetsRef, sheetCtx,
      TRACEABILITY_SHEET,
      buildTraceabilityRows(meta.standardsTraceability, SECTION_COL_COUNT),
      snapshot,
      'Standards Traceability Matrix'
    );
    addSectionWorksheet(
      files, ctRef, relRef, sheetsRef, sheetCtx,
      CONFIDENCE_SHEET,
      buildConfidenceRows(meta.confidenceRating, SECTION_COL_COUNT),
      snapshot,
      'Confidence Rating System'
    );
    addSectionWorksheet(
      files, ctRef, relRef, sheetsRef, sheetCtx,
      VALIDATION_SHEET,
      buildValidationRows(meta.validationLibrary, SECTION_COL_COUNT),
      snapshot,
      'Validation Library comparison'
    );
    addSectionWorksheet(
      files, ctRef, relRef, sheetsRef, sheetCtx,
      ADVANCED_THERMAL_SHEET,
      buildAdvancedThermalRows(meta.advancedThermal, SECTION_COL_COUNT),
      snapshot,
      'Advanced Heat-Balance Model (supplementary)'
    );
    addSectionWorksheet(
      files, ctRef, relRef, sheetsRef, sheetCtx,
      ADVANCED_TC_VDROP_SHEET,
      buildAdvancedTcVoltageDropRows(meta.advancedTcVoltageDrop, SECTION_COL_COUNT),
      snapshot,
      'Advanced Tc Voltage-Drop Comparison (supplementary)'
    );
    addSectionWorksheet(
      files, ctRef, relRef, sheetsRef, sheetCtx,
      TRANSIENT_SHEET,
      buildTransientThermalRows(meta.transientThermal, SECTION_COL_COUNT),
      snapshot,
      'Transient Thermal Analysis (supplementary)'
    );

    if (includeParameters) {
      var optionSheetData = meta.parameterOptions
        ? buildOptionsSheetData(meta.parameterOptions)
        : null;
      var parameterBuild = buildParametersRows(snapshot, {
        gridTitle: meta.gridTitle,
        parameterOptions: meta.parameterOptions || {},
        optionRanges: optionSheetData ? optionSheetData.ranges : {}
      });
      var paramHeaderRow = 9;
      var paramXml = buildWorksheetXml(parameterBuild.rows, {
        colWidths: [32, 26, 50, 48],
        sheetView: {
          xSplit: 0,
          ySplit: paramHeaderRow,
          topLeftCell: 'A' + (paramHeaderRow + 1),
          activePane: 'bottomLeft'
        },
        dataValidations: parameterBuild.dataValidations
      });
      addWorksheetFile(files, ctRef, relRef, sheetsRef, sheetCtx, paramXml, PARAMETERS_SHEET, false);

      if (optionSheetData) {
        var optionsXml = buildWorksheetXml(optionSheetData.rows, {
          colWidths: optionSheetData.colWidths
        });
        addWorksheetFile(files, ctRef, relRef, sheetsRef, sheetCtx, optionsXml, OPTIONS_SHEET, true);
      }
    }

    contentTypes = ctRef.value +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
      '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
      '</Types>';

    workbookRels = relRef.value +
      '<Relationship Id="rId' + sheetCtx.relId + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '</Relationships>';

    var rels =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
      '</Relationships>';

    var workbook =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets>' + sheetsRef.value + '</sheets></workbook>';

    var docProps = buildDocProps(snapshot);

    return [
      { name: '[Content_Types].xml', data: contentTypes },
      { name: '_rels/.rels', data: rels },
      { name: 'docProps/core.xml', data: docProps.core },
      { name: 'docProps/app.xml', data: docProps.app },
      { name: 'xl/workbook.xml', data: workbook },
      { name: 'xl/_rels/workbook.xml.rels', data: workbookRels },
      { name: 'xl/styles.xml', data: buildStylesXml() }
    ].concat(files);
  }

  function sanitizeFilename(name) {
    var base = String(name || '')
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return base || '';
  }

  function normalizeWireNumber(value) {
    return String(value || '').trim().replace(/\s+/g, '-');
  }

  function normalizeProjectNumber(value) {
    return String(value || '').trim().replace(/\s+/g, '');
  }

  function looksLikeWireToken(value) {
    var text = normalizeWireNumber(value);
    return !!text && (/^W?\d+$/i.test(text) || /^\d{1,6}$/.test(text));
  }

  function parseMiddleFilenameSegments(middle) {
    var empty = { projectNumber: '', projectName: '', wireNumber: '' };
    if (!middle || !middle.length) {
      return empty;
    }

    if (middle[middle.length - 1] === 'project') {
      middle = middle.slice(0, -1);
      if (!middle.length) {
        return empty;
      }
    }

    if (middle.length >= 2 && middle[middle.length - 2].toUpperCase() === 'AWG') {
      middle = middle.slice(0, -2);
    }

    if (!middle.length) {
      return empty;
    }

    var projectNumberOut = '';
    var projectNameOut = '';
    var wireNumberOut = '';
    var startIdx = 0;

    if (/^\d{4,6}$/.test(middle[0])) {
      projectNumberOut = middle[0];
      startIdx = 1;
    }

    var tail = middle.slice(startIdx);
    if (tail.length >= 2) {
      wireNumberOut = normalizeWireNumber(tail[tail.length - 1]);
      projectNameOut = tail.slice(0, -1).join('-');
    } else if (tail.length === 1) {
      if (looksLikeWireToken(tail[0])) {
        wireNumberOut = normalizeWireNumber(tail[0]);
      } else {
        projectNameOut = tail[0];
      }
    }

    return {
      projectNumber: projectNumberOut,
      projectName: projectNameOut,
      wireNumber: wireNumberOut
    };
  }

  function parseExportFilenameMetadata(filename) {
    var base = String(filename || '').replace(/\.[^.]+$/i, '');
    var parts = base.split('-');

    if (parts.length < 4 || parts[0] !== 'power' || parts[1] !== 'wire' || parts[2] !== 'analysis') {
      return {
        projectNumber: '',
        projectName: '',
        wireNumber: parseLegacyWireNumber(base)
      };
    }

    var middleEnd = parts.length;
    if (parts.length >= 9 && looksLikeDateSegment(parts, parts.length - 6)) {
      middleEnd = parts.length - 6;
    }

    var parsed = parseMiddleFilenameSegments(parts.slice(3, middleEnd));
    if (parsed.wireNumber || parsed.projectNumber || parsed.projectName) {
      return parsed;
    }

    return {
      projectNumber: '',
      projectName: '',
      wireNumber: parseLegacyWireNumber(base)
    };
  }

  function parseWireNumberFromFilename(filename) {
    return parseExportFilenameMetadata(filename).wireNumber;
  }

  function resolveIncludeTimestamp(snapshot, meta) {
    if (meta && meta.includeTimestamp != null) {
      return !!meta.includeTimestamp;
    }
    var value = snapshot && snapshot.filenameIncludeTimestamp;
    if (value == null || value === '') {
      return true;
    }
    var text = String(value).toLowerCase();
    return text !== 'no' && text !== '0' && text !== 'false';
  }

  function buildExportFilename(snapshot, meta) {
    meta = meta || {};
    snapshot = snapshot || {};
    var parts = ['power-wire-analysis'];
    var projectNumber = normalizeProjectNumber(
      meta.projectNumber != null ? meta.projectNumber : snapshot.projectNumber
    );
    var projectName = sanitizeFilename(
      meta.projectName != null ? meta.projectName : snapshot.projectName
    );
    var wireNumber = normalizeWireNumber(
      meta.wireNumber != null ? meta.wireNumber : snapshot.wireNumber
    );
    if (projectNumber) {
      parts.push(sanitizeFilename(projectNumber));
    }
    if (projectName) {
      parts.push(projectName);
    }
    if (wireNumber) {
      parts.push(sanitizeFilename(wireNumber));
    }
    if (meta.awgLabels && meta.awgLabels.length === 1) {
      parts.push('AWG-' + sanitizeFilename(meta.awgLabels[0]));
    }
    if (resolveIncludeTimestamp(snapshot, meta)) {
      var when = formatExportTimestamp(meta.exportedAt || snapshot.exportedAt);
      parts.push(when.date);
      parts.push(when.time);
    }
    var ext = String(meta.extension || 'xlsx').replace(/^\./, '');
    return parts.join('-') + '.' + ext;
  }

  function buildProjectReportFilename(snapshot, meta) {
    meta = meta || {};
    snapshot = snapshot || {};
    var parts = ['power-wire-analysis'];
    var projectNumber = normalizeProjectNumber(
      meta.projectNumber != null ? meta.projectNumber : snapshot.projectNumber
    );
    var projectName = sanitizeFilename(
      meta.projectName != null ? meta.projectName : snapshot.projectName
    );
    if (projectNumber) {
      parts.push(sanitizeFilename(projectNumber));
    }
    if (projectName) {
      parts.push(projectName);
    } else if (!projectNumber) {
      parts.push('project');
    }
    parts.push('project');
    if (resolveIncludeTimestamp(snapshot, meta)) {
      var when = formatExportTimestamp(meta.exportedAt || snapshot.exportedAt);
      parts.push(when.date);
      parts.push(when.time);
    }
    return parts.join('-') + '.docx';
  }

  function formatExportTimestamp(isoOrDate) {
    var d = isoOrDate ? new Date(isoOrDate) : new Date();
    if (isNaN(d.getTime())) {
      d = new Date();
    }
    function pad(n) {
      return String(n).padStart(2, '0');
    }
    return {
      date: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()),
      time: pad(d.getHours()) + '-' + pad(d.getMinutes()) + '-' + pad(d.getSeconds())
    };
  }

  function looksLikeDateSegment(parts, idx) {
    var year = parts[idx];
    var month = parts[idx + 1];
    var day = parts[idx + 2];
    return /^(19|20)\d{2}$/.test(year) && /^\d{2}$/.test(month) && /^\d{2}$/.test(day);
  }

  function parseLegacyWireNumber(base) {
    var patterns = [
      /(?:^|[-_\s])W(\d{1,4})\b/i,
      /(?:^|[-_\s])wire[-_\s#]*(\d{1,4})\b/i,
      /PWA[-_](\d{1,4})/i
    ];
    var i;
    var match;
    for (i = 0; i < patterns.length; i += 1) {
      match = base.match(patterns[i]);
      if (match && match[1]) {
        return 'W' + String(parseInt(match[1], 10)).padStart(3, '0');
      }
    }
    return '';
  }

  function defaultFilename(snapshot, meta) {
    return buildExportFilename(snapshot, Object.assign({ extension: 'xlsx' }, meta || {}));
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function buildWorkbookBlob(snapshot, tableRows, meta) {
    meta = meta || {};
    var files = buildWorkbookFiles(snapshot, tableRows, meta);
    var zip = buildZip(files);
    return {
      blob: new Blob([zip], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }),
      filename: meta.filename || defaultFilename(snapshot)
    };
  }

  function exportWorkbook(snapshot, tableRows, meta) {
    meta = meta || {};
    var out = buildWorkbookBlob(snapshot, tableRows, meta);
    downloadBlob(out.blob, out.filename);
    return out;
  }

  function findParametersSheetPath(entries) {
    var workbookXml = entries['xl/workbook.xml'];
    var relsXml = entries['xl/_rels/workbook.xml.rels'];
    if (workbookXml && relsXml) {
      var workbookText = new TextDecoder().decode(workbookXml);
      var relsText = new TextDecoder().decode(relsXml);
      var sheetMatch = workbookText.match(
        new RegExp('<sheet[^>]*name="' + PARAMETERS_SHEET.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
          '"[^>]*r:id="([^"]+)"', 'i')
      );
      if (sheetMatch) {
        var relMatch = relsText.match(
          new RegExp('<Relationship[^>]*Id="' + sheetMatch[1] + '"[^>]*Target="([^"]+)"', 'i')
        );
        if (relMatch) {
          var target = relMatch[1].replace(/^\//, '');
          if (target.indexOf('xl/') !== 0) {
            target = 'xl/' + target;
          }
          if (entries[target]) {
            return target;
          }
        }
      }
    }

    if (entries['xl/worksheets/sheet1.xml']) {
      return 'xl/worksheets/sheet1.xml';
    }

    var names = Object.keys(entries).filter(function (name) {
      return /^xl\/worksheets\/sheet\d+\.xml$/i.test(name);
    }).sort();
    return names[0] || null;
  }

  function parseSharedStrings(entries) {
    var sharedXml = entries['xl/sharedStrings.xml'];
    if (!sharedXml) {
      return null;
    }
    var text = new TextDecoder().decode(sharedXml);
    var strings = [];
    var siRegex = /<si(?:[^>]*)>([\s\S]*?)<\/si>/g;
    var match;

    while ((match = siRegex.exec(text)) !== null) {
      var content = match[1];
      var parts = [];
      var tRegex = /<t(?:[^>]*)?>([\s\S]*?)<\/t>/g;
      var tMatch;
      while ((tMatch = tRegex.exec(content)) !== null) {
        parts.push(decodeXml(tMatch[1]));
      }
      strings.push(parts.join(''));
    }
    return strings;
  }

  function parseCellValue(attrs, inner, sharedStrings) {
    var typeMatch = attrs.match(/\st="([^"]+)"/);
    var cellType = typeMatch ? typeMatch[1] : '';
    var inlineMatch = inner.match(/<is><t(?:[^>]*)?>([\s\S]*?)<\/t><\/is>/);
    if (inlineMatch) {
      return decodeXml(inlineMatch[1]);
    }
    var valueMatch = inner.match(/<v>([\s\S]*?)<\/v>/);
    if (!valueMatch) {
      return '';
    }
    var raw = valueMatch[1];
    if (cellType === 's' && sharedStrings) {
      var idx = parseInt(raw, 10);
      return sharedStrings[idx] != null ? sharedStrings[idx] : '';
    }
    return decodeXml(raw);
  }

  function parseSheetRows(sheetXml, sharedStrings) {
    var rows = [];
    var rowRegex = /<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
    var cellRegex = /<c([^>]*)>([\s\S]*?)<\/c>/g;
    var match;

    while ((match = rowRegex.exec(sheetXml)) !== null) {
      var rowNum = parseInt(match[1], 10);
      var rowContent = match[2];
      var cells = {};
      var cellMatch;
      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        var attrs = cellMatch[1];
        var inner = cellMatch[2];
        var refMatch = attrs.match(/\sr="([A-Z]+)(\d+)"/);
        if (!refMatch) {
          continue;
        }
        cells[refMatch[1]] = parseCellValue(attrs, inner, sharedStrings);
      }
      rows[rowNum] = cells;
    }
    return rows;
  }

  function decodeXml(text) {
    return String(text)
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&');
  }

  async function parseWorkbookEntriesFromFile(file) {
    var arrayBuffer = await readFileArrayBuffer(file);
    var buffer = new Uint8Array(arrayBuffer);
    return extractZipEntries(buffer);
  }

  function findSheetPathByName(entries, sheetName) {
    if (!entries || !sheetName) {
      return null;
    }
    var workbookXml = entries['xl/workbook.xml'];
    var relsXml = entries['xl/_rels/workbook.xml.rels'];
    if (!workbookXml || !relsXml) {
      return null;
    }
    var workbookText = new TextDecoder().decode(workbookXml);
    var relsText = new TextDecoder().decode(relsXml);
    var escaped = String(sheetName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var sheetMatch = workbookText.match(
      new RegExp('<sheet[^>]*name="' + escaped + '"[^>]*r:id="([^"]+)"', 'i')
    );
    if (!sheetMatch) {
      return null;
    }
    var relMatch = relsText.match(
      new RegExp('<Relationship[^>]*Id="' + sheetMatch[1] + '"[^>]*Target="([^"]+)"', 'i')
    );
    if (!relMatch) {
      return null;
    }
    var target = relMatch[1].replace(/^\//, '');
    if (target.indexOf('xl/') !== 0) {
      target = 'xl/' + target;
    }
    return entries[target] ? target : null;
  }

  function parseSheetRowsFromEntries(entries, sheetPath) {
    if (!entries || !sheetPath || !entries[sheetPath]) {
      return [];
    }
    var sheetXml = new TextDecoder().decode(entries[sheetPath]);
    var sharedStrings = parseSharedStrings(entries);
    return parseSheetRows(sheetXml, sharedStrings);
  }

  function parseKeyValueSheet(rows, keyCol, valueCol) {
    keyCol = keyCol || 'A';
    valueCol = valueCol || 'B';
    var out = {};
    var r;
    for (r = 0; r < rows.length; r += 1) {
      var cells = rows[r];
      if (!cells || !cells[keyCol]) {
        continue;
      }
      var rawKey = String(cells[keyCol]).trim();
      if (!rawKey || rawKey.toLowerCase() === 'field' || rawKey.toLowerCase() === 'key') {
        continue;
      }
      out[rawKey] = cells[valueCol] == null ? '' : String(cells[valueCol]).trim();
    }
    return out;
  }

  function parseTableSheet(rows, headerRowNum) {
    headerRowNum = headerRowNum || 1;
    var headers = rows[headerRowNum];
    if (!headers) {
      return [];
    }
    var cols = Object.keys(headers).sort(function (a, b) {
      return a.charCodeAt(0) - b.charCodeAt(0);
    });
    var headerMap = {};
    cols.forEach(function (col) {
      var label = String(headers[col] || '').trim();
      if (label) {
        headerMap[col] = label;
      }
    });
    var records = [];
    var r;
    for (r = headerRowNum + 1; r < rows.length; r += 1) {
      var cells = rows[r];
      if (!cells) {
        continue;
      }
      var hasData = false;
      var record = {};
      Object.keys(headerMap).forEach(function (col) {
        var val = cells[col];
        if (val != null && String(val).trim() !== '') {
          hasData = true;
        }
        record[headerMap[col]] = val == null ? '' : String(val).trim();
      });
      if (hasData) {
        records.push(record);
      }
    }
    return records;
  }

  async function importWorkbook(file) {
    var entries = await parseWorkbookEntriesFromFile(file);
    var sheetPath = findParametersSheetPath(entries);
    if (!sheetPath) {
      throw new Error('Parameters sheet not found. Use Export Excel report to create an importable workbook.');
    }
    var rows = parseSheetRowsFromEntries(entries, sheetPath);
    var parameters = {};
    var knownKeys = {};
    var hasKeyHeader = false;

    PARAM_DEFINITIONS.forEach(function (def) {
      knownKeys[def.key] = true;
    });

    for (var r = 0; r < rows.length; r += 1) {
      var cells = rows[r];
      if (!cells) continue;
      if (cells.A === 'Key' && cells.B === 'Value') {
        hasKeyHeader = true;
      }
      if (cells.A === 'aircraftZone' && !parameters.installationGuidancePreset) {
        parameters.installationGuidancePreset = cells.B == null ? '' : String(cells.B);
      } else if (cells.A && knownKeys[cells.A]) {
        parameters[cells.A] = cells.B == null ? '' : String(cells.B);
      }
    }

    if (!parameters.wireType) {
      if (!hasKeyHeader) {
        throw new Error(
          'This workbook does not have a Parameters sheet from the web calculator. Use Export Excel report on the Power Wire Analysis page.'
        );
      }
      throw new Error(
        'Could not read parameter values from the Parameters sheet. Re-export from the calculator without changing the Key/Value rows.'
      );
    }
    if (global.PwaWireCatalog && !PwaWireCatalog.getWireType(parameters.wireType)) {
      if (!(global.PwaWireDataLoader && PwaWireDataLoader.isExternalActive() &&
          PwaWireDataLoader.getWireType(parameters.wireType))) {
        throw new Error('Unknown wire type in workbook: ' + parameters.wireType);
      }
    }

    return { parameters: parameters, version: WORKBOOK_VERSION };
  }

  global.PwaWorkbook = {
    WORKBOOK_VERSION: WORKBOOK_VERSION,
    PARAM_DEFINITIONS: PARAM_DEFINITIONS,
    exportWorkbook: exportWorkbook,
    buildWorkbookBlob: buildWorkbookBlob,
    importWorkbook: importWorkbook,
    parseWorkbookEntriesFromFile: parseWorkbookEntriesFromFile,
    findSheetPathByName: findSheetPathByName,
    parseSheetRowsFromEntries: parseSheetRowsFromEntries,
    parseKeyValueSheet: parseKeyValueSheet,
    parseTableSheet: parseTableSheet,
    readFileArrayBuffer: readFileArrayBuffer,
    sanitizeFilename: sanitizeFilename,
    normalizeWireNumber: normalizeWireNumber,
    normalizeProjectNumber: normalizeProjectNumber,
    parseExportFilenameMetadata: parseExportFilenameMetadata,
    parseWireNumberFromFilename: parseWireNumberFromFilename,
    buildExportFilename: buildExportFilename,
    buildProjectReportFilename: buildProjectReportFilename,
    defaultFilename: defaultFilename,
    downloadBlob: downloadBlob,
    isApplyInstallationTempLimitEnabled: isApplyInstallationTempLimitEnabled,
    formatApplyInstallationTempLimitDisplay: formatApplyInstallationTempLimitDisplay,
    buildTemperatureStatusLegend: buildTemperatureStatusLegend,
    buildTemperatureAssessmentNote: buildTemperatureAssessmentNote,
    buildEngineeringAssessmentRows: buildEngineeringAssessmentRows,
    buildWireDataAuditRows: buildWireDataAuditRows,
    buildAdvancedThermalRows: buildAdvancedThermalRows,
    buildTraceabilityRows: buildTraceabilityRows,
    buildConfidenceRows: buildConfidenceRows,
    buildValidationRows: buildValidationRows,
    buildAdvancedTcVoltageDropRows: buildAdvancedTcVoltageDropRows,
    buildTransientThermalRows: buildTransientThermalRows,
    getGlobalDisclaimer: getGlobalDisclaimer
  };
})(typeof window !== 'undefined' ? window : this);
