(function () {
  'use strict';

  var COPPER_REF = 254.5;
  var COPPER_COEF = 234.5;
  var FT_TO_M = 0.3048;
  var IN_TO_M = 0.0254;

  function lengthToInches(value, unit) {
    if (unit === 'm') {
      return value / IN_TO_M;
    }
    if (unit === 'ft') {
      return value * 12;
    }
    return value;
  }

  function inchesToLength(inches, unit) {
    if (unit === 'm') {
      return inches * IN_TO_M;
    }
    if (unit === 'ft') {
      return inches / 12;
    }
    return inches;
  }

  function formatLengthForUnit(value, unit) {
    var digits = unit === 'm' ? 4 : (unit === 'ft' ? 3 : 2);
    var factor = Math.pow(10, digits);
    return String(Math.round(value * factor) / factor);
  }

  var WIRE_TYPE_LABEL = '';
  var currentWireTypeId = 'kp260';
  var lastGridColumns = [];

  // AC 43.13-1B Fig 11-5 — see pwa-bundle-derating.js
  function bundleDeratingFactor(wireCount, loadingPct) {
    if (window.PwaBundleDerating) {
      return PwaBundleDerating.bundleDeratingFactor(wireCount, loadingPct);
    }
    return 1;
  }

  var ALLOWABLE_DROPS = {
    continuous: [
      { nominal: 14, drop: 0.5 },
      { nominal: 28, drop: 1 },
      { nominal: 115, drop: 4 },
      { nominal: 200, drop: 7 }
    ],
    intermittent: [
      { nominal: 14, drop: 1 },
      { nominal: 28, drop: 2 },
      { nominal: 115, drop: 8 },
      { nominal: 200, drop: 14 }
    ]
  };

  // AC 43.13-1B Fig 11-6 — see pwa-altitude-derating.js

  // Resistance per AWG from manufacturer datasheet — see pwa-wire-catalog.js
  var WIRES = [];

  var INSTALLATION_GUIDANCE_PRESETS = [
    { id: 'crew', label: 'Crew Occupied Area', guidanceLimit: 70 },
    { id: 'passenger', label: 'Passenger Area', guidanceLimit: 70 },
    { id: 'avionics', label: 'Avionics Equipment Area', guidanceLimit: 70 },
    { id: 'general', label: 'General Aircraft Structure', guidanceLimit: 85 },
    { id: 'highTemp', label: 'High Temperature Area', guidanceLimit: 135 },
    { id: 'custom', label: 'Custom', guidanceLimit: null }
  ];

  var LEGACY_ZONE_ID_MAP = {
    cockpit: 'crew',
    cabin: 'passenger',
    avionics: 'avionics',
    fuselage: 'general',
    wing: 'highTemp',
    engine: 'highTemp',
    custom: 'custom'
  };

  var PWA_GLOBAL_DISCLAIMER =
    'The calculator determines conductor temperature using SAE ARP4404 methodology. ' +
    'Installation acceptance criteria are project-specific and shall be established by the Design Authority ' +
    'using applicable certification requirements, system safety assessments, EWIS requirements, ' +
    'environmental requirements and approved aircraft design data.';

  var GUIDANCE_PRESET_DISCLAIMER =
    'Guidance value only. Final limit shall be defined by the applicable aircraft requirements and Design Authority.';

  var GRID_ROW_TOOLTIPS = {
    TR: 'Cable insulation temperature capability',
    Tsafe: 'Assessment limit: MIN(T_R, installation temperature limit) when installation assessment is enabled'
  };

  var INSTALL_ASSESSMENT_ROW_KEYS = {
    guidancePreset: true,
    installTempLimit: true,
    Tsafe: true
  };

  var GRID_ROWS = [
    { key: 'awg', labelB: 'Cable size (AWG)', labelC: 'AWG', unit: '', fmt: 'awg' },
    { key: 'L1', labelB: 'Maximum wire length (NOT DE-RATED)', labelC: 'L1', unit: 'ft', fmt: 'num', digits: 3 },
    { key: 'V', labelB: 'System Voltage', labelC: 'V', unit: 'V', fmt: 'num', digits: 2 },
    { key: 'U', labelB: 'Allowable voltage drop', labelC: 'U', unit: 'V', fmt: 'num' },
    { key: 'I', labelB: 'Circuit current', labelC: 'I', unit: 'A', fmt: 'num', digits: 2 },
    { key: 'Rft', labelB: 'Resistance of wire per feet @ 20\u00B0C', labelC: 'R', unit: '\u03A9/ft', fmt: 'sci' },
    { key: 'R1000', labelB: 'Resistance of wire per 1000 feet @ 20\u00B0C', labelC: '', unit: '\u03A9/1000ft', fmt: 'num', digits: 3 },
    { key: 'T1', labelB: 'Ambient temperature', labelC: 'T1', unit: '\u00B0C', fmt: 'num' },
    { key: 'TR', labelB: 'Cable rating (insulation T_R)', labelC: 'TR', unit: '\u00B0C', fmt: 'num' },
    { key: 'guidancePreset', labelB: 'Engineering guidance preset', labelC: '', unit: '', fmt: 'text' },
    { key: 'installTempLimit', labelB: 'Installation temperature limit', labelC: 'T_INST', unit: '\u00B0C', fmt: 'num' },
    { key: 'Tsafe', labelB: 'Assessment limit (T_SAFE)', labelC: 'T_SAFE', unit: '\u00B0C', fmt: 'num' },
    { key: 'T2', labelB: 'Estimated conductor temperature', labelC: 'T2', unit: '\u00B0C', fmt: 'num', digits: 3 },
    { key: 'Imax', labelB: 'Maximum allowable current @ TR', labelC: 'IMAX', unit: 'A', fmt: 'num', digits: 3 },
    { key: 'IfreePct', labelB: 'Actual % of current against free air current', labelC: '%', unit: '%', fmt: 'pct' },
    { key: 'freeAir', labelB: 'De-rating (Max conductor current in free air)', labelC: 'x', unit: 'A', fmt: 'num' },
    { key: 'bundle', labelB: 'De-rating (Bundle)', labelC: 'y', unit: '', fmt: 'factor', digits: 2 },
    { key: 'altitude', labelB: 'De-rating (Altitude)', labelC: 'z', unit: '', fmt: 'factor' },
    { key: 'IImax', labelB: 'I/IMAX', labelC: '', unit: '', fmt: 'num', digits: 3 },
    { key: 't2Factor', labelB: 'I/IMAX squared', labelC: '', unit: '', fmt: 'num', digits: 3 },
    { key: 'L2in', labelB: 'Maximum wire length (DE-RATED) (MOST SEVERE) (in)', labelC: 'L2', unit: 'in', fmt: 'num', digits: 3 },
    { key: 'L2ft', labelB: 'Maximum wire length (DE-RATED) (MOST SEVERE) (ft)', labelC: 'L2', unit: 'ft', fmt: 'num', digits: 3 },
    { key: 'L2m', labelB: 'Maximum wire length (DE-RATED) (MOST SEVERE) (m)', labelC: 'L2', unit: 'm', fmt: 'num', digits: 3 },
    { key: 'Vdrop', labelB: 'Voltage drop (volts)', labelC: 'U', unit: 'V', fmt: 'num', digits: 3, section: 'vdrop' },
    { key: 'wireLenIn', labelB: 'Wire Length for purposes of Voltage Drop (in)', labelC: 'L', unit: 'in', fmt: 'num', digits: 3, section: 'vdrop' },
    { key: 'wireLenFt', labelB: 'Wire Length for purposes of Voltage Drop (ft)', labelC: 'L', unit: 'ft', fmt: 'num', digits: 3, section: 'vdrop' },
    { key: 'wireLenM', labelB: 'Wire Length for purposes of Voltage Drop (m)', labelC: 'L', unit: 'm', fmt: 'num', digits: 3, section: 'vdrop' }
  ];

  function num(val, digits) {
    if (val === null || val === undefined || val === '') return '';
    if (typeof val !== 'number' || !isFinite(val)) return '';
    return val.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: typeof digits === 'number' ? digits : 6
    });
  }

  function sci(val) {
    if (typeof val !== 'number' || !isFinite(val)) return '';
    if (val === 0) return '0';
    if (val >= 0.001) return num(val, 6);
    return val.toExponential(4);
  }

  // AC 43.13-1B Fig 11-4a / 11-4b — see pwa-free-air.js
  function freeAirCurrent(wire, ambientTemp, conductorRating) {
    if (window.PwaFreeAir) {
      var current = PwaFreeAir.freeAirCurrent(wire.label, ambientTemp, conductorRating);
      if (current !== null) return current;
    }
    return 0;
  }

  function altitudeDeratingFactor(altitudeFt) {
    if (window.PwaAltitudeDerating) {
      return PwaAltitudeDerating.altitudeDeratingFactor(altitudeFt);
    }
    return 1;
  }

  function formatAltitudeLabel(altitudeFt) {
    return altitudeFt.toLocaleString('en-US') + ' ft';
  }

  function initAltitudeSelect(form) {
    var selectEl = form.elements.altitudeFt;
    if (!selectEl) return;

    var html = '';
    for (var altitudeFt = 0; altitudeFt <= 100000; altitudeFt += 1000) {
      var factor = altitudeDeratingFactor(altitudeFt);
      html +=
        '<option value="' + altitudeFt + '">' +
        formatAltitudeLabel(altitudeFt) + ' — ' + num(factor, 4) +
        '</option>';
    }
    selectEl.innerHTML = html;
    selectEl.value = '35000';
  }

  function getAllowableDropEntries(operationType) {
    return ALLOWABLE_DROPS[operationType] || ALLOWABLE_DROPS.continuous;
  }

  function getAllowableDropNominalForVoltage(voltageV) {
    if (!isFinite(voltageV)) {
      return 200;
    }
    if (voltageV === 26 || voltageV === 28) {
      return 28;
    }
    if (voltageV === 5) {
      return 14;
    }
    if (voltageV === 115) {
      return 115;
    }
    if (voltageV === 200) {
      return 200;
    }
    if (voltageV >= 22 && voltageV <= 50) {
      return 28;
    }

    var nominals = [14, 28, 115, 200];
    var best = nominals[0];
    var bestDist = Math.abs(voltageV - best);
    var i;
    for (i = 1; i < nominals.length; i += 1) {
      var dist = Math.abs(voltageV - nominals[i]);
      if (dist < bestDist) {
        bestDist = dist;
        best = nominals[i];
      }
    }
    return best;
  }

  function syncAllowableDropToVoltage(form) {
    var nominal = getAllowableDropNominalForVoltage(readGeneratorLineVoltage(form));
    updateAllowableDropOptions(form, nominal);
  }

  function formatAllowableDropOption(entry) {
    return entry.nominal + ' V nominal — ' + num(entry.drop, entry.drop % 1 ? 1 : 0) + ' V drop';
  }

  function getSelectedAllowableNominal(selectEl) {
    if (!selectEl || !selectEl.selectedOptions.length) return null;
    var nominal = parseInt(selectEl.selectedOptions[0].dataset.nominal, 10);
    return isFinite(nominal) ? nominal : null;
  }

  function updateAllowableDropOptions(form, preferredNominal) {
    var operationEl = form.elements.operationType;
    var selectEl = form.elements.allowableDrop;
    if (!operationEl || !selectEl) return;

    var entries = getAllowableDropEntries(operationEl.value);
    var currentNominal = preferredNominal || getSelectedAllowableNominal(selectEl);
    var html = '';

    entries.forEach(function (entry) {
      html +=
        '<option value="' + entry.drop + '" data-nominal="' + entry.nominal + '">' +
        formatAllowableDropOption(entry) +
        '</option>';
    });
    selectEl.innerHTML = html;

    var match = null;
    entries.forEach(function (entry) {
      if (entry.nominal === currentNominal) match = entry;
    });
    if (!match && currentNominal) {
      entries.forEach(function (entry) {
        if (!match || Math.abs(entry.nominal - currentNominal) < Math.abs(match.nominal - currentNominal)) {
          match = entry;
        }
      });
    }
    if (!match) {
      match = entries[entries.length - 1];
    }
    selectEl.value = String(match.drop);
  }

  function initAllowableDropControls(form) {
    updateAllowableDropOptions(form, 200);

    var operationEl = form.elements.operationType;
    if (operationEl) {
      operationEl.addEventListener('change', function () {
        updateAllowableDropOptions(form);
        recalc();
      });
    }
  }

  function t2FactorRowLabel(standard) {
    return standard === 'ac43' ? 'SQRT I/IMAX' : 'I/IMAX squared';
  }

  function t2FactorValue(IImax, standard) {
    return standard === 'ac43' ? Math.sqrt(IImax) : IImax * IImax;
  }

  function t2StandardNote(standard) {
    if (standard === 'ac43') {
      return 'T<sub>1</sub> + (T<sub>R</sub> &minus; T<sub>1</sub>) &times; &radic;(I/I<sub>max</sub>)';
    }
    return 'T<sub>1</sub> + (T<sub>R</sub> &minus; T<sub>1</sub>) &times; (I/I<sub>max</sub>)&sup2;';
  }

  function getGuidancePresetConfig(presetId) {
    var i;
    for (i = 0; i < INSTALLATION_GUIDANCE_PRESETS.length; i += 1) {
      if (INSTALLATION_GUIDANCE_PRESETS[i].id === presetId) {
        return INSTALLATION_GUIDANCE_PRESETS[i];
      }
    }
    return INSTALLATION_GUIDANCE_PRESETS[3];
  }

  function normalizeGuidancePresetId(presetId) {
    if (!presetId) {
      return 'general';
    }
    if (LEGACY_ZONE_ID_MAP[presetId]) {
      return LEGACY_ZONE_ID_MAP[presetId];
    }
    var i;
    for (i = 0; i < INSTALLATION_GUIDANCE_PRESETS.length; i += 1) {
      if (INSTALLATION_GUIDANCE_PRESETS[i].id === presetId) {
        return presetId;
      }
    }
    return 'general';
  }

  function getGuidancePresetLabel(presetId) {
    return getGuidancePresetConfig(normalizeGuidancePresetId(presetId)).label;
  }

  function getGuidancePresetLimit(presetId) {
    var config = getGuidancePresetConfig(normalizeGuidancePresetId(presetId));
    return config.guidanceLimit == null ? 85 : config.guidanceLimit;
  }

  function readInstallationTempLimit(form) {
    var el = form.elements.installationTempLimit;
    var val = el ? parseFloat(el.value, 10) : NaN;
    if (!isFinite(val)) {
      return getGuidancePresetLimit(readInstallationGuidancePreset(form));
    }
    return val;
  }

  function readInstallationGuidancePreset(form) {
    var el = form.elements.installationGuidancePreset || form.elements.aircraftZone;
    return normalizeGuidancePresetId(el && el.value ? el.value : 'general');
  }

  function computeTSafe(conductorRating, installationLimit) {
    return Math.min(conductorRating, installationLimit);
  }

  function readApplyInstallationTempLimit(form) {
    var el = form.elements.applyInstallationTempLimit;
    if (!el) {
      return false;
    }
    return el.checked;
  }

  function parseApplyInstallationTempLimitValue(value) {
    if (value == null || value === '') {
      return false;
    }
    if (value === true) {
      return true;
    }
    if (value === false) {
      return false;
    }
    var normalized = String(value).trim().toLowerCase();
    if (normalized === 'no' || normalized === '0' || normalized === 'off' || normalized === 'false') {
      return false;
    }
    if (normalized === 'yes' || normalized === '1' || normalized === 'on' || normalized === 'true') {
      return true;
    }
    return false;
  }

  function formatApplyInstallationTempLimit(value) {
    return parseApplyInstallationTempLimitValue(value) ? 'Yes' : 'No';
  }

  function shouldShowInstallAssessmentRow(rowKey, params) {
    if (!INSTALL_ASSESSMENT_ROW_KEYS[rowKey]) {
      return true;
    }
    return params && params.applyInstallationTempLimit;
  }

  function getT2TempLimit(params) {
    return params.tTempLimit;
  }

  function temperatureBasisLabel(params) {
    return params.applyInstallationTempLimit ? 'Installation limit' : 'Cable rating (T_R)';
  }

  function buildInstallationAssessment(params, columns) {
    var worst = null;
    var i;
    for (i = 0; i < columns.length; i += 1) {
      var col = columns[i];
      if (typeof col.T2 !== 'number' || !isFinite(col.T2)) {
        continue;
      }
      if (!worst || col.T2 > worst.T2) {
        worst = col;
      }
    }
    if (!worst) {
      return null;
    }

    var limit = getT2TempLimit(params);
    var pass = worst.T2 <= limit;
    var basis = temperatureBasisLabel(params);
    var reason;
    var engineeringNotes;

    if (params.applyInstallationTempLimit) {
      if (pass) {
        reason = 'Conductor temperature is within the installation temperature requirement.';
      } else if (worst.T2 <= params.conductorTempRating) {
        reason =
          'Conductor temperature exceeds installation requirement although remaining below insulation rating.';
      } else {
        reason = 'Conductor temperature exceeds installation requirement and cable insulation rating.';
      }
      engineeringNotes =
        'Standards referenced: SAE ARP4404 (T₂ calculation); AS50881 / AC 43.13-1B (installation practices); ' +
        'EWIS and system safety assessments per project requirements. ' +
        'Installation limit is Design Authority defined — guidance presets are not certification limits.';
    } else {
      if (pass) {
        reason = 'Conductor temperature is within cable insulation rating.';
      } else {
        reason = 'Conductor temperature exceeds cable insulation rating.';
      }
      engineeringNotes =
        'Standards referenced: SAE ARP4404 (T₂ calculation and conductor temperature methodology). ' +
        'Installation temperature assessment is disabled; acceptance is based on cable insulation rating T_R only.';
    }

    return {
      applyInstallationTempLimit: params.applyInstallationTempLimit,
      calculatedT2: worst.T2,
      worstAwg: worst.awg,
      cableRatingTr: params.conductorTempRating,
      installationTempLimit: params.applyInstallationTempLimit ? params.installationTempLimit : null,
      tSafe: params.tSafe,
      assessmentBasis: basis,
      result: pass ? 'PASS' : 'FAIL',
      reason: reason,
      engineeringNotes: engineeringNotes
    };
  }

  function updateInstallationAssessmentPanel(params, columns) {
    var assessment = buildInstallationAssessment(params, columns);
    var t2El = document.getElementById('pwa-assess-t2');
    var trEl = document.getElementById('pwa-assess-tr');
    var limitEl = document.getElementById('pwa-assess-limit');
    var basisEl = document.getElementById('pwa-assess-basis');
    var resultEl = document.getElementById('pwa-assess-result');
    var reasonEl = document.getElementById('pwa-assess-reason');
    var awgEl = document.getElementById('pwa-assess-awg');
    var panelEl = document.getElementById('pwa-assessment-panel');

    if (!panelEl || !assessment) {
      return;
    }

    if (t2El) {
      t2El.textContent = num(assessment.calculatedT2, 1) + ' \u00B0C';
    }
    if (trEl) {
      trEl.textContent = num(assessment.cableRatingTr, 0) + ' \u00B0C';
    }
    if (limitEl) {
      limitEl.textContent = assessment.installationTempLimit != null
        ? num(assessment.installationTempLimit, 0) + ' \u00B0C'
        : '\u2014';
    }
    if (basisEl) {
      basisEl.textContent = assessment.assessmentBasis;
    }
    if (resultEl) {
      resultEl.textContent = assessment.result;
      resultEl.className = 'pwa-assessment-panel__result pwa-assessment-panel__result--' +
        assessment.result.toLowerCase();
    }
    if (reasonEl) {
      reasonEl.textContent = assessment.reason;
    }
    if (awgEl) {
      var visibleCount = getSelectedAwgLabels().length;
      if (visibleCount === 1) {
        awgEl.textContent = 'Assessment for visible column AWG ' + assessment.worstAwg + '.';
      } else {
        awgEl.textContent =
          'Assessment uses highest T\u2082 among ' + visibleCount + ' visible columns (AWG ' +
          assessment.worstAwg + ').';
      }
    }
  }

  var awgColumnControlsBound = false;

  function updateAwgColumnSummary() {
    var summaryEl = document.getElementById('pwa-grid-awg-summary');
    if (!summaryEl) return;

    var allEl = document.getElementById('pwa-grid-awg-all');
    var total = WIRES.length;
    var selected = getSelectedAwgLabels();

    if (!selected.length) {
      summaryEl.textContent = 'No columns selected';
      return;
    }

    if (allEl && allEl.checked && selected.length === total) {
      summaryEl.textContent = total === 1
        ? 'Showing 1 size'
        : 'Showing all ' + total + ' sizes';
      return;
    }

    if (selected.length === total) {
      summaryEl.textContent = 'Showing all ' + total + ' sizes';
      return;
    }

    if (selected.length <= 4) {
      summaryEl.textContent =
        'Showing ' + selected.length + ' of ' + total + ' (AWG ' + selected.join(', ') + ')';
    } else {
      summaryEl.textContent = 'Showing ' + selected.length + ' of ' + total + ' sizes';
    }
  }

  function syncGridAwgAllCheckbox() {
    var allEl = document.getElementById('pwa-grid-awg-all');
    if (!allEl) return;
    var awgBoxes = document.querySelectorAll('input[name="gridAwg"]');
    var checkedCount = 0;
    awgBoxes.forEach(function (box) {
      if (box.checked) checkedCount += 1;
    });
    allEl.checked = awgBoxes.length > 0 && checkedCount === awgBoxes.length;
    updateAwgColumnSummary();
  }

  function setAllGridAwgColumns(checked) {
    var allEl = document.getElementById('pwa-grid-awg-all');
    document.querySelectorAll('input[name="gridAwg"]').forEach(function (box) {
      box.checked = checked;
    });
    if (allEl) allEl.checked = checked;
    updateAwgColumnSummary();
  }

  function initAwgColumnPicker() {
    var container = document.getElementById('pwa-grid-awg-checks');
    if (!container) return;

    var allEl = document.getElementById('pwa-grid-awg-all');
    var wasAllMode = allEl ? allEl.checked : true;
    var previousSelected = {};
    document.querySelectorAll('input[name="gridAwg"]:checked').forEach(function (box) {
      previousSelected[box.value] = true;
    });
    var hadIndividualChecks = Object.keys(previousSelected).length > 0;

    var html = '';
    WIRES.forEach(function (wire) {
      var checked = wasAllMode || !hadIndividualChecks || !!previousSelected[wire.label];
      html +=
        '<label class="pwa-grid-column-picker__check">' +
          '<input type="checkbox" name="gridAwg" value="' + escapeHtml(wire.label) + '"' +
          (checked ? ' checked' : '') + '>' +
          'AWG ' + escapeHtml(wire.label) +
        '</label>';
    });
    container.innerHTML = html;

    if (!container.querySelector('input[name="gridAwg"]:checked')) {
      setAllGridAwgColumns(true);
    } else if (allEl) {
      if (wasAllMode || !hadIndividualChecks) {
        allEl.checked = true;
      } else {
        syncGridAwgAllCheckbox();
      }
    }
    updateAwgColumnSummary();
  }

  function initAwgColumnControls() {
    if (awgColumnControlsBound) return;
    var picker = document.getElementById('pwa-awg-column-picker');
    if (!picker) return;
    awgColumnControlsBound = true;

    picker.addEventListener('change', function (ev) {
      var target = ev.target;
      if (!target || target.type !== 'checkbox') return;

      if (target.id === 'pwa-grid-awg-all') {
        if (target.checked) {
          document.querySelectorAll('input[name="gridAwg"]').forEach(function (box) {
            box.checked = true;
          });
        }
        updateAwgColumnSummary();
        recalc();
        return;
      }

      if (target.name === 'gridAwg') {
        syncGridAwgAllCheckbox();
        recalc();
      }
    });

    picker.addEventListener('click', function (ev) {
      var target = ev.target;
      if (!target || target.tagName !== 'BUTTON') return;

      if (target.id === 'pwa-grid-awg-select-all') {
        setAllGridAwgColumns(true);
        recalc();
      } else if (target.id === 'pwa-grid-awg-clear') {
        setAllGridAwgColumns(false);
        recalc();
      }
    });
  }

  function clearInstallationAssessmentPanel() {
    var ids = [
      'pwa-assess-t2',
      'pwa-assess-tr',
      'pwa-assess-limit',
      'pwa-assess-basis',
      'pwa-assess-result',
      'pwa-assess-reason',
      'pwa-assess-awg'
    ];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = '\u2014';
    });
    var resultEl = document.getElementById('pwa-assess-result');
    if (resultEl) {
      resultEl.className = 'pwa-assessment-panel__result';
    }
    var awgEl = document.getElementById('pwa-assess-awg');
    if (awgEl) {
      awgEl.textContent = 'Select one or more AWG columns above to run assessment.';
    }
  }

  function initInstallationGuidanceControls(form) {
    var presetEl = form.elements.installationGuidancePreset || form.elements.aircraftZone;
    var limitEl = form.elements.installationTempLimit;
    if (!presetEl || !limitEl) {
      return;
    }

    presetEl.addEventListener('change', function () {
      if (presetEl.value !== 'custom') {
        limitEl.value = String(getGuidancePresetLimit(presetEl.value));
      }
      recalc();
    });
  }

  function readGeneratorLineVoltage(form) {
    var presetEl = form.elements.generatorLineVoltagePreset;
    if (presetEl && presetEl.value !== 'custom') {
      return parseFloat(presetEl.value, 10);
    }
    var customEl = form.elements.generatorLineVoltageCustom;
    return customEl ? parseFloat(customEl.value, 10) : 200;
  }

  function updateGeneratorLineVoltageCustomVisibility(form) {
    var presetEl = form.elements.generatorLineVoltagePreset;
    var wrap = document.getElementById('pwa-voltage-custom-wrap');
    var customEl = form.elements.generatorLineVoltageCustom;
    if (!presetEl || !wrap) return;

    var isCustom = presetEl.value === 'custom';
    wrap.hidden = !isCustom;
    if (customEl) {
      customEl.required = isCustom;
    }
  }

  function initGeneratorLineVoltageControls(form) {
    var presetEl = form.elements.generatorLineVoltagePreset;
    var customEl = form.elements.generatorLineVoltageCustom;
    if (!presetEl) return;

    updateGeneratorLineVoltageCustomVisibility(form);
    syncAllowableDropToVoltage(form);

    presetEl.addEventListener('change', function () {
      updateGeneratorLineVoltageCustomVisibility(form);
      syncAllowableDropToVoltage(form);
      recalc();
    });

    if (customEl) {
      var syncCustomVoltage = function () {
        if (presetEl.value !== 'custom') return;
        syncAllowableDropToVoltage(form);
        recalc();
      };
      customEl.addEventListener('input', syncCustomVoltage);
      customEl.addEventListener('change', syncCustomVoltage);
    }
  }

  function readConductorTempRating(form) {
    if (!window.PwaConductorTrControls) return 260;
    return PwaConductorTrControls.readConductorTempRating(
      form.elements.conductorTempRatingPreset,
      form.elements.conductorTempRatingCustom,
      260
    );
  }

  function updateConductorTempRatingCustomVisibility(form) {
    if (!window.PwaConductorTrControls) return;
    PwaConductorTrControls.updateCustomVisibility(
      form.elements.conductorTempRatingPreset,
      document.getElementById('pwa-conductor-tr-custom-wrap'),
      form.elements.conductorTempRatingCustom
    );
  }

  function initConductorTempRatingControls(form) {
    if (!window.PwaConductorTrControls) return;
    PwaConductorTrControls.initConductorTempRatingControls({
      presetEl: form.elements.conductorTempRatingPreset,
      customWrapEl: document.getElementById('pwa-conductor-tr-custom-wrap'),
      customEl: form.elements.conductorTempRatingCustom,
      onChange: recalc
    });
  }

  function applyExternalWireType(wireType) {
    if (!wireType) {
      return false;
    }
    var form = document.getElementById('pwa-params-form');
    if (!form || !form.elements.wireType) {
      return false;
    }
    var selectEl = form.elements.wireType;
    var i;
    var found = false;
    for (i = 0; i < selectEl.options.length; i += 1) {
      if (selectEl.options[i].value === wireType.id) {
        found = true;
        break;
      }
    }
    if (!found) {
      var opt = document.createElement('option');
      opt.value = wireType.id;
      opt.textContent = wireType.label + ' (external)';
      opt.setAttribute('data-external-wire', '1');
      selectEl.appendChild(opt);
    }
    selectEl.value = wireType.id;
    currentWireTypeId = wireType.id;
    WIRE_TYPE_LABEL = wireType.label;
    WIRES = PwaWireCatalog.getWireRows(wireType.id);
    updateWireSpecLink(wireType.id);
    syncConductorTempRatingForWireType(form, wireType.id);
    updateGridTitle();
    recalc();
    return true;
  }

  function removeExternalWireOptions() {
    var form = document.getElementById('pwa-params-form');
    if (!form || !form.elements.wireType) {
      return;
    }
    var selectEl = form.elements.wireType;
    var toRemove = [];
    var i;
    for (i = 0; i < selectEl.options.length; i += 1) {
      if (selectEl.options[i].getAttribute('data-external-wire') === '1') {
        toRemove.push(selectEl.options[i]);
      }
    }
    toRemove.forEach(function (opt) {
      selectEl.removeChild(opt);
    });
  }

  function applyWireType(wireTypeId) {
    if (!window.PwaWireCatalog) return false;

    var wireType = PwaWireCatalog.getWireType(wireTypeId);
    if (!wireType) return false;

    currentWireTypeId = wireTypeId;
    WIRE_TYPE_LABEL = wireType.label;
    WIRES = PwaWireCatalog.getWireRows(wireTypeId);
    return true;
  }

  function updateWireSpecLink(wireTypeId) {
    var linkEl = document.getElementById('pwa-wire-spec-link');
    if (!linkEl || !window.PwaWireCatalog) return;

    var wireType = PwaWireCatalog.getWireType(wireTypeId);
    if (!wireType) return;

    linkEl.href = wireType.specPage || '#';
    if (!wireType.specPage) {
      linkEl.setAttribute('aria-disabled', 'true');
      linkEl.classList.add('pwa-params__spec-link--disabled');
    } else {
      linkEl.removeAttribute('aria-disabled');
      linkEl.classList.remove('pwa-params__spec-link--disabled');
    }
    linkEl.setAttribute('aria-label', wireType.label + ' specification');
  }

  function syncConductorTempRatingForWireType(form, wireTypeId) {
    if (!window.PwaWireCatalog || !form) return;

    var wireType = PwaWireCatalog.getWireType(wireTypeId);
    if (!wireType || typeof wireType.defaultConductorTempRating !== 'number') return;

    var presetEl = form.elements.conductorTempRatingPreset;
    var customEl = form.elements.conductorTempRatingCustom;
    if (!presetEl) return;

    var defaultRating = String(wireType.defaultConductorTempRating);
    if (window.PwaConductorTrControls) {
      PwaConductorTrControls.setConductorTempRating(
        presetEl,
        customEl,
        document.getElementById('pwa-conductor-tr-custom-wrap'),
        defaultRating
      );
    }
  }

  function initWireTypeControls(form) {
    var selectEl = form.elements.wireType;
    if (!selectEl || !window.PwaWireCatalog) return;

    var html = '';
    PwaWireCatalog.listWireTypes().forEach(function (entry) {
      html +=
        '<option value="' + escapeHtml(entry.id) + '">' +
        escapeHtml(entry.label) +
        '</option>';
    });
    selectEl.innerHTML = html;
    selectEl.value = currentWireTypeId;
    applyWireType(currentWireTypeId);
    updateWireSpecLink(currentWireTypeId);
    syncConductorTempRatingForWireType(form, currentWireTypeId);

    selectEl.addEventListener('change', function () {
      if (!applyWireType(selectEl.value)) return;
      updateWireSpecLink(selectEl.value);
      syncConductorTempRatingForWireType(form, selectEl.value);
      initAwgColumnPicker();
      updateGridTitle();
      recalc();
    });
  }

  function readParams(form) {
    function f(name) {
      return parseFloat(form.elements[name].value, 10);
    }
    var routingPct = f('routingPct');
    var wireLength = f('wireLength');
    var unit = form.elements.wireLengthUnit.value;
    var baseIn = lengthToInches(wireLength, unit);
    var totalIn = baseIn * (1 + routingPct / 100);
    var wireLengthFt = totalIn / 12;

    var generatorLineVoltage = readGeneratorLineVoltage(form);
    var circuitCurrent = f('circuitCurrent');
    var altitudeFt = parseInt(form.elements.altitudeFt.value, 10);
    var altitudeDerating = altitudeDeratingFactor(altitudeFt);
    var bundleWireCount = parseInt(form.elements.bundleWireCount.value, 10);
    var bundleLoadingPct = parseInt(form.elements.bundleLoadingPct.value, 10);
    var bundleDerating = bundleDeratingFactor(bundleWireCount, bundleLoadingPct);
    var t2Standard = form.elements.t2Standard
      ? form.elements.t2Standard.value
      : 'arp4404';
    var guidancePreset = readInstallationGuidancePreset(form);
    var installationTempLimit = readInstallationTempLimit(form);
    var conductorTempRating = readConductorTempRating(form);
    var applyInstallationTempLimit = readApplyInstallationTempLimit(form);
    var tSafe = applyInstallationTempLimit
      ? computeTSafe(conductorTempRating, installationTempLimit)
      : conductorTempRating;
    var tTempLimit = tSafe;

    return {
      generatorLineVoltage: generatorLineVoltage,
      circuitCurrent: circuitCurrent,
      allowableDrop: f('allowableDrop'),
      ambientTemp: f('ambientTemp'),
      conductorTempRating: conductorTempRating,
      applyInstallationTempLimit: applyInstallationTempLimit,
      installationGuidancePreset: guidancePreset,
      guidancePresetLabel: getGuidancePresetLabel(guidancePreset),
      aircraftZone: guidancePreset,
      aircraftZoneLabel: getGuidancePresetLabel(guidancePreset),
      installationTempLimit: installationTempLimit,
      tSafe: tSafe,
      tTempLimit: tTempLimit,
      altitudeFt: altitudeFt,
      altitudeDerating: altitudeDerating,
      bundleWireCount: bundleWireCount,
      bundleLoadingPct: bundleLoadingPct,
      bundleDerating: bundleDerating,
      t2Standard: t2Standard,
      wireTypeId: form.elements.wireType ? form.elements.wireType.value : currentWireTypeId,
      wireLengthFt: wireLengthFt,
      wireLengthIn: totalIn,
      wireLengthM: wireLengthFt * FT_TO_M
    };
  }

  function computeColumn(params, wire) {
    var R1000 = wire.ohm1000ft;
    var Rft = R1000 / 1000;
    var U = params.allowableDrop;
    var I = params.circuitCurrent;
    var T1 = params.ambientTemp;
    var TR = params.conductorTempRating;
    var L1 = U / (I * Rft);
    var freeAir = freeAirCurrent(wire, T1, TR);
    var bundle = params.bundleDerating;
    var altitude = params.altitudeDerating;
    var Imax = freeAir * bundle * altitude;
    var IImax = I / Imax;
    var t2Factor = t2FactorValue(IImax, params.t2Standard);
    var T2 = T1 + (TR - T1) * t2Factor;
    var Tsafe = params.tSafe;
    var L2ft = (COPPER_REF * L1) / (COPPER_COEF + T2);
    var L2in = L2ft * 12;
    var L2m = L2ft * FT_TO_M;
    var wireLenFt = params.wireLengthFt;
    var Vdrop = (I * Rft * wireLenFt) * (COPPER_COEF + T2) / COPPER_REF;

    return {
      awg: wire.label,
      L1: L1,
      V: params.generatorLineVoltage,
      U: U,
      I: I,
      Rft: Rft,
      R1000: R1000,
      T1: T1,
      TR: TR,
      guidancePreset: params.guidancePresetLabel,
      installTempLimit: params.installationTempLimit,
      Tsafe: Tsafe,
      T2: T2,
      Imax: Imax,
      IfreePct: I / freeAir,
      freeAir: freeAir,
      bundle: bundle,
      altitude: altitude,
      IImax: IImax,
      t2Factor: t2Factor,
      L2in: L2in,
      L2ft: L2ft,
      L2m: L2m,
      Vdrop: Vdrop,
      wireLenIn: params.wireLengthIn,
      wireLenFt: wireLenFt,
      wireLenM: params.wireLengthM
    };
  }

  function formatCell(row, value) {
    if (row.fmt === 'blank') return '';
    if (row.fmt === 'text') return value == null ? '' : String(value);
    if (row.fmt === 'awg') return value;
    if (row.fmt === 'factor') {
      return num(value, typeof row.digits === 'number' ? row.digits : 4);
    }
    if (row.fmt === 'pct') {
      if (typeof value !== 'number' || !isFinite(value)) return '';
      return num(value * 100, 0) + '%';
    }
    if (row.fmt === 'sci') return sci(value);
    return num(value, typeof row.digits === 'number' ? row.digits : 6);
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getSelectedAwgLabels() {
    var allEl = document.getElementById('pwa-grid-awg-all');
    if (allEl && allEl.checked) {
      return WIRES.map(function (wire) { return wire.label; });
    }

    var awgLabels = [];
    document.querySelectorAll('input[name="gridAwg"]:checked').forEach(function (el) {
      awgLabels.push(el.value);
    });
    return awgLabels;
  }

  function getSelectedExportSettings() {
    return { awgLabels: getSelectedAwgLabels() };
  }

  function getVisibleGridColumns(allColumns) {
    return filterExportColumns(allColumns || lastGridColumns, getSelectedAwgLabels());
  }

  function getAdvancedTcVoltageDropColumn() {
    var visible = getVisibleGridColumns(lastGridColumns);
    if (!visible.length) {
      return null;
    }
    if (visible.length === 1) {
      return visible[0];
    }

    var worst = null;
    var i;
    for (i = 0; i < visible.length; i += 1) {
      var col = visible[i];
      if (typeof col.Vdrop !== 'number' || !isFinite(col.Vdrop)) {
        continue;
      }
      if (!worst || col.Vdrop > worst.Vdrop) {
        worst = col;
      }
    }

    if (!worst) {
      for (i = 0; i < visible.length; i += 1) {
        var t2Col = visible[i];
        if (typeof t2Col.T2 !== 'number' || !isFinite(t2Col.T2)) {
          continue;
        }
        if (!worst || t2Col.T2 > worst.T2) {
          worst = t2Col;
        }
      }
    }

    return worst || visible[0];
  }

  function findWire(awgLabel) {
    for (var i = 0; i < WIRES.length; i += 1) {
      if (WIRES[i].label === awgLabel) return WIRES[i];
    }
    return null;
  }

  function excelColumnLetter(colIndex) {
    var n = colIndex + 1;
    var letters = '';
    while (n > 0) {
      var rem = (n - 1) % 26;
      letters = String.fromCharCode(65 + rem) + letters;
      n = Math.floor((n - 1) / 26);
    }
    return letters;
  }

  function excelRawValue(val) {
    if (typeof val !== 'number' || !isFinite(val)) return '';
    return String(val);
  }

  function excelCellRef(rowMap, rowKey, colIndex) {
    return excelColumnLetter(colIndex) + rowMap[rowKey];
  }

  function getExportCellContent(row, col, wire, params, rowMap, colIndex) {
    function ref(key) {
      return excelCellRef(rowMap, key, colIndex);
    }

    switch (row.key) {
      case 'L1':
        return '=' + ref('U') + '/(' + ref('I') + '*' + ref('Rft') + ')';
      case 'V':
        return excelRawValue(params.generatorLineVoltage);
      case 'U':
        return excelRawValue(params.allowableDrop);
      case 'I':
        return excelRawValue(params.circuitCurrent);
      case 'Rft':
        return '=' + ref('R1000') + '/1000';
      case 'R1000':
        return excelRawValue(wire.ohm1000ft);
      case 'T1':
        return excelRawValue(params.ambientTemp);
      case 'TR':
        return excelRawValue(params.conductorTempRating);
      case 'guidancePreset':
        return params.guidancePresetLabel || '';
      case 'installTempLimit':
        return excelRawValue(params.installationTempLimit);
      case 'Tsafe':
        return excelRawValue(params.tSafe);
      case 'T2':
        return '=' + ref('T1') + '+(' + ref('TR') + '-' + ref('T1') + ')*' + ref('t2Factor');
      case 'Imax':
        return '=' + ref('freeAir') + '*' + ref('bundle') + '*' + ref('altitude');
      case 'IfreePct':
        return '=' + ref('I') + '/' + ref('freeAir') + '*100';
      case 'freeAir':
        return excelRawValue(col.freeAir);
      case 'bundle':
        return excelRawValue(params.bundleDerating);
      case 'altitude':
        return excelRawValue(params.altitudeDerating);
      case 'IImax':
        return '=' + ref('I') + '/' + ref('Imax');
      case 't2Factor':
        if (params.t2Standard === 'ac43') {
          return '=SQRT(' + ref('IImax') + ')';
        }
        return '=' + ref('IImax') + '*' + ref('IImax');
      case 'L2ft':
        return '=' + COPPER_REF + '*' + ref('L1') + '/(' + COPPER_COEF + '+' + ref('T2') + ')';
      case 'L2in':
        return '=' + ref('L2ft') + '*12';
      case 'L2m':
        return '=' + ref('L2ft') + '*' + FT_TO_M;
      case 'Vdrop':
        return '=' + ref('I') + '*' + ref('Rft') + '*' + ref('wireLenFt') +
          '*(' + COPPER_COEF + '+' + ref('T2') + ')/' + COPPER_REF;
      case 'wireLenIn':
        return excelRawValue(params.wireLengthIn);
      case 'wireLenFt':
        return excelRawValue(params.wireLengthFt);
      case 'wireLenM':
        return excelRawValue(params.wireLengthM);
      default:
        return excelRawValue(col[row.key]);
    }
  }

  function filterExportColumns(gridColumns, awgLabels) {
    if (!awgLabels.length) return [];
    return gridColumns.filter(function (col) {
      return awgLabels.indexOf(col.awg) >= 0;
    });
  }

  function exportNumStyle(row) {
    if (row.fmt === 'sci') {
      return 'tableNum6';
    }
    if (row.fmt === 'factor') {
      return 'tableNum2';
    }
    if (typeof row.digits === 'number') {
      if (row.digits <= 2) {
        return 'tableNum2';
      }
      if (row.digits === 3) {
        return 'tableNum3';
      }
    }
    return 'tableNum3';
  }

  function t2StatusKey(t2, tSafe) {
    if (typeof t2 !== 'number' || !isFinite(t2) || typeof tSafe !== 'number' || !isFinite(tSafe)) {
      return null;
    }
    if (t2 > tSafe) {
      return 'fail';
    }
    if (t2 > 0.8 * tSafe) {
      return 'caution';
    }
    return 'pass';
  }

  function exportCellStyleKey(row, rawVal, params) {
    if (params && typeof rawVal === 'number' && isFinite(rawVal)) {
      if (row.key === 'Vdrop') {
        return rawVal <= params.allowableDrop ? 'pass' : 'fail';
      }
      if (row.key === 'T2') {
        return t2StatusKey(rawVal, getT2TempLimit(params));
      }
    }
    return null;
  }

  function buildExportRowCells(row, gridColumns, settings, isAwgHeaderRow, options) {
    var cells = [];
    var exportColumns = filterExportColumns(gridColumns, settings.awgLabels);
    var useFormulas = options && options.useFormulas;
    var params = options && options.params;
    var rowMap = options && options.rowMap;

    cells.push({
      text: row.key === 't2Factor' && params
        ? t2FactorRowLabel(params.t2Standard)
        : row.labelB,
      align: 'left',
      styleKey: isAwgHeaderRow ? 'tableHeader' : 'tableLabel'
    });
    cells.push({
      text: row.labelC,
      align: 'center',
      styleKey: isAwgHeaderRow ? 'tableHeader' : 'tableSymbol'
    });
    exportColumns.forEach(function (col, awgIdx) {
      var rawVal = isAwgHeaderRow ? col.awg : col[row.key];
      var text;
      if (isAwgHeaderRow) {
        text = col.awg;
      } else if (useFormulas && rowMap && params) {
        var wire = findWire(col.awg);
        text = wire
          ? getExportCellContent(row, col, wire, params, rowMap, 2 + awgIdx)
          : formatCell(row, rawVal);
      } else {
        text = formatCell(row, rawVal);
      }
      var cell = {
        text: text,
        align: 'center',
        styleKey: isAwgHeaderRow ? 'tableHeader' : exportCellStyleKey(row, rawVal, params)
      };
      if (!isAwgHeaderRow && typeof rawVal === 'number' && isFinite(rawVal) &&
          row.fmt !== 'pct' && row.fmt !== 'awg' && row.fmt !== 'blank') {
        cell.value = rawVal;
        cell.numStyle = exportNumStyle(row);
      }
      cells.push(cell);
    });
    cells.push({
      text: isAwgHeaderRow ? '' : row.unit,
      align: 'center',
      styleKey: isAwgHeaderRow ? 'tableHeader' : 'tableUnit'
    });

    return cells;
  }

  function buildExportRows(settings, gridColumns, options) {
    options = options || {};
    var rows = [];
    var rowMap = {};
    var excelRow = 2;
    var dividerShown = false;
    var bodyEntries = [];

    GRID_ROWS.forEach(function (row) {
      if (row.key === 'awg') return;
      if (options.params && !shouldShowInstallAssessmentRow(row.key, options.params)) {
        return;
      }

      if (row.section === 'vdrop' && !dividerShown) {
        dividerShown = true;
        bodyEntries.push({ divider: true });
        excelRow += 1;
      }

      rowMap[row.key] = excelRow;
      bodyEntries.push({ row: row });
      excelRow += 1;
    });

    if (options.useFormulas) {
      options.rowMap = rowMap;
    }

    rows.push({
      cells: buildExportRowCells(GRID_ROWS[0], gridColumns, settings, true, options),
      isHeader: true
    });

    bodyEntries.forEach(function (entry) {
      if (entry.divider) {
        rows.push({
          divider: true,
          label: 'Voltage drop at entered run length'
        });
        return;
      }
      rows.push({
        cells: buildExportRowCells(entry.row, gridColumns, settings, false, options),
        isHeader: false,
        section: entry.row.section
      });
    });

    return rows;
  }

  function buildExportPlainText(rows) {
    var lines = [];
    rows.forEach(function (row) {
      if (row.divider) {
        lines.push('');
        return;
      }
      lines.push(row.cells.map(function (cell) { return cell.text; }).join('\t'));
    });
    return lines.join('\n');
  }

  function buildExportHtml(rows) {
    var table =
      '<table border="1" cellspacing="0" cellpadding="4" ' +
      'style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:10pt;">';

    rows.forEach(function (row) {
      if (row.divider) {
        var colspan = row.colspan || 1;
        table +=
          '<tr><td colspan="' + colspan + '" ' +
          'style="border:1px solid #000;border-top:2px solid #000;height:6px;">&nbsp;</td></tr>';
        return;
      }

      var tag = row.isHeader ? 'th' : 'td';
      table += '<tr>';
      row.cells.forEach(function (cell) {
        table +=
          '<' + tag + ' style="border:1px solid #000;text-align:' + cell.align +
          ';vertical-align:middle;">' + escapeHtml(cell.text) + '</' + tag + '>';
      });
      table += '</tr>';
    });

    table += '</table>';
    return table;
  }

  function buildWordClipboardHtml(tableHtml) {
    return (
      '<html><head><meta charset="utf-8"></head><body>' +
      '<!--StartFragment-->' + tableHtml + '<!--EndFragment-->' +
      '</body></html>'
    );
  }

  function copyHtmlFallback(tableHtml, plainText) {
    return new Promise(function (resolve, reject) {
      var container = document.createElement('div');
      container.contentEditable = 'true';
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.innerHTML = tableHtml;
      document.body.appendChild(container);

      var range = document.createRange();
      range.selectNodeContents(container);
      var selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);

      var copied = false;
      try {
        copied = document.execCommand('copy');
      } catch (err) {
        copied = false;
      }

      selection.removeAllRanges();
      document.body.removeChild(container);

      if (copied) {
        resolve();
        return;
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(plainText).then(resolve).catch(reject);
        return;
      }

      reject(new Error('Copy not supported'));
    });
  }

  function getFilenameIncludeTimestamp() {
    var el = document.getElementById('pwa-filename-include-timestamp');
    return el ? el.checked : true;
  }

  function getWireNumber() {
    var el = document.getElementById('pwa-wire-number');
    return el ? el.value.trim() : '';
  }

  function getProjectNumber() {
    var el = document.getElementById('pwa-project-number');
    return el ? el.value.trim() : '';
  }

  function applyFilenameMetadataToFields(metadata) {
    if (!metadata) {
      return;
    }
    var projectNumberEl = document.getElementById('pwa-project-number');
    var projectEl = document.getElementById('pwa-project-name');
    var wireEl = document.getElementById('pwa-wire-number');
    if (projectNumberEl && metadata.projectNumber && !getProjectNumber()) {
      projectNumberEl.value = metadata.projectNumber;
    }
    if (projectEl && metadata.projectName && !projectEl.value.trim()) {
      projectEl.value = metadata.projectName.replace(/-/g, ' ');
    }
    if (wireEl && metadata.wireNumber && !getWireNumber()) {
      wireEl.value = metadata.wireNumber;
    }
  }

  function collectParameterSnapshot(form) {
    var projectEl = document.getElementById('pwa-project-name');
    return {
      exportedAt: new Date().toISOString(),
      projectNumber: getProjectNumber(),
      projectName: projectEl ? projectEl.value.trim() : '',
      wireNumber: getWireNumber(),
      filenameIncludeTimestamp: getFilenameIncludeTimestamp() ? 'yes' : 'no',
      wireType: form.elements.wireType.value,
      generatorLineVoltagePreset: form.elements.generatorLineVoltagePreset.value,
      generatorLineVoltageCustom: form.elements.generatorLineVoltageCustom.value,
      circuitCurrent: form.elements.circuitCurrent.value,
      operationType: form.elements.operationType.value,
      allowableDrop: form.elements.allowableDrop.value,
      ambientTemp: form.elements.ambientTemp.value,
      conductorTempRatingPreset: form.elements.conductorTempRatingPreset.value,
      conductorTempRatingCustom: form.elements.conductorTempRatingCustom.value,
      applyInstallationTempLimit: form.elements.applyInstallationTempLimit
        ? (form.elements.applyInstallationTempLimit.checked ? 'yes' : 'no')
        : 'no',
      installationGuidancePreset: readInstallationGuidancePreset(form),
      installationTempLimit: form.elements.installationTempLimit
        ? form.elements.installationTempLimit.value
        : String(getGuidancePresetLimit('general')),
      tSafe: String(readParams(form).tSafe),
      t2Standard: form.elements.t2Standard.value,
      altitudeFt: form.elements.altitudeFt.value,
      bundleWireCount: form.elements.bundleWireCount.value,
      bundleLoadingPct: form.elements.bundleLoadingPct.value,
      wireLength: form.elements.wireLength.value,
      wireLengthUnit: form.elements.wireLengthUnit.value,
      routingPct: form.elements.routingPct.value,
      wireDataAudit: global.PwaWireDataLoader ? PwaWireDataLoader.getAuditInfo() : null
    };
  }

  function selectOptions(selectEl) {
    var out = [];
    if (!selectEl || !selectEl.options) {
      return out;
    }
    Array.prototype.forEach.call(selectEl.options, function (opt) {
      out.push({ value: opt.value, label: opt.textContent.trim() });
    });
    return out;
  }

  function collectParameterOptions(form) {
    if (!form) {
      return {};
    }

    var options = {};

    if (window.PwaWireCatalog && typeof PwaWireCatalog.listWireTypes === 'function') {
      options.wireType = PwaWireCatalog.listWireTypes().map(function (wire) {
        return { value: wire.id, label: wire.label };
      });
    } else if (form.elements.wireType) {
      options.wireType = selectOptions(form.elements.wireType);
    }

    if (form.elements.generatorLineVoltagePreset) {
      options.generatorLineVoltagePreset = selectOptions(form.elements.generatorLineVoltagePreset);
    }
    if (form.elements.operationType) {
      options.operationType = selectOptions(form.elements.operationType);
    }

    var dropMap = {};
    ['continuous', 'intermittent'].forEach(function (op) {
      (ALLOWABLE_DROPS[op] || []).forEach(function (entry) {
        var key = String(entry.drop);
        if (!dropMap[key]) {
          dropMap[key] = entry.nominal + ' V nominal — ' + entry.drop + ' V drop';
        }
      });
    });
    options.allowableDrop = Object.keys(dropMap).sort(function (a, b) {
      return parseFloat(a) - parseFloat(b);
    }).map(function (key) {
      return { value: key, label: dropMap[key] };
    });

    if (form.elements.conductorTempRatingPreset) {
      options.conductorTempRatingPreset = selectOptions(form.elements.conductorTempRatingPreset);
    }
    var presetEl = form.elements.installationGuidancePreset || form.elements.aircraftZone;
    if (presetEl) {
      options.installationGuidancePreset = INSTALLATION_GUIDANCE_PRESETS.map(function (preset) {
        return { value: preset.id, label: preset.label };
      });
      options.aircraftZone = options.installationGuidancePreset;
    }
    options.applyInstallationTempLimit = [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' }
    ];
    if (form.elements.t2Standard) {
      options.t2Standard = selectOptions(form.elements.t2Standard);
    }
    if (form.elements.altitudeFt) {
      options.altitudeFt = selectOptions(form.elements.altitudeFt);
    } else {
      options.altitudeFt = [];
      for (var ft = 0; ft <= 100000; ft += 1000) {
        options.altitudeFt.push({ value: String(ft), label: ft + ' ft' });
      }
    }

    options.bundleWireCount = [];
    for (var n = 1; n <= 41; n += 1) {
      options.bundleWireCount.push({ value: String(n), label: String(n) });
    }

    if (form.elements.bundleLoadingPct) {
      options.bundleLoadingPct = selectOptions(form.elements.bundleLoadingPct);
    }
    if (form.elements.wireLengthUnit) {
      options.wireLengthUnit = selectOptions(form.elements.wireLengthUnit);
    }

    options.filenameIncludeTimestamp = [
      { value: 'yes', label: 'Yes — append date and time to export filenames' },
      { value: 'no', label: 'No — stable filename without date/time' }
    ];

    return options;
  }

  function applyParameterSnapshot(form, snapshot) {
    if (!form || !snapshot) return;

    var projectEl = document.getElementById('pwa-project-name');
    if (projectEl && snapshot.projectName != null) {
      projectEl.value = snapshot.projectName;
    }

    var projectNumberEl = document.getElementById('pwa-project-number');
    if (projectNumberEl && snapshot.projectNumber != null) {
      projectNumberEl.value = snapshot.projectNumber;
    }

    var wireEl = document.getElementById('pwa-wire-number');
    if (wireEl && snapshot.wireNumber != null) {
      wireEl.value = snapshot.wireNumber;
    }

    var timestampEl = document.getElementById('pwa-filename-include-timestamp');
    if (timestampEl && snapshot.filenameIncludeTimestamp != null) {
      timestampEl.checked = String(snapshot.filenameIncludeTimestamp).toLowerCase() !== 'no';
    }

    if (snapshot.wireType && form.elements.wireType) {
      form.elements.wireType.value = snapshot.wireType;
      applyWireType(snapshot.wireType);
      updateWireSpecLink(snapshot.wireType);
    }

    if (form.elements.generatorLineVoltagePreset && snapshot.generatorLineVoltagePreset) {
      form.elements.generatorLineVoltagePreset.value = snapshot.generatorLineVoltagePreset;
    }
    if (form.elements.generatorLineVoltageCustom && snapshot.generatorLineVoltageCustom != null) {
      form.elements.generatorLineVoltageCustom.value = snapshot.generatorLineVoltageCustom;
    }
    updateGeneratorLineVoltageCustomVisibility(form);

    if (form.elements.circuitCurrent != null && snapshot.circuitCurrent != null) {
      form.elements.circuitCurrent.value = snapshot.circuitCurrent;
    }

    if (form.elements.operationType && snapshot.operationType) {
      form.elements.operationType.value = snapshot.operationType;
    }
    updateAllowableDropOptions(form);
    if (form.elements.allowableDrop && snapshot.allowableDrop != null) {
      var dropValue = String(snapshot.allowableDrop);
      if (form.elements.allowableDrop.querySelector('option[value="' + dropValue + '"]')) {
        form.elements.allowableDrop.value = dropValue;
      }
    }

    if (form.elements.ambientTemp != null && snapshot.ambientTemp != null) {
      form.elements.ambientTemp.value = snapshot.ambientTemp;
    }

    if (form.elements.conductorTempRatingPreset && snapshot.conductorTempRatingPreset) {
      form.elements.conductorTempRatingPreset.value = snapshot.conductorTempRatingPreset;
    }
    if (form.elements.conductorTempRatingCustom && snapshot.conductorTempRatingCustom != null) {
      form.elements.conductorTempRatingCustom.value = snapshot.conductorTempRatingCustom;
    }
    updateConductorTempRatingCustomVisibility(form);

    if (form.elements.applyInstallationTempLimit) {
      form.elements.applyInstallationTempLimit.checked =
        parseApplyInstallationTempLimitValue(snapshot.applyInstallationTempLimit);
    }

    if (!snapshot.installationGuidancePreset && snapshot.aircraftZone) {
      snapshot.installationGuidancePreset = snapshot.aircraftZone;
    }

    var presetId = normalizeGuidancePresetId(
      snapshot.installationGuidancePreset || snapshot.aircraftZone
    );
    var presetEl = form.elements.installationGuidancePreset || form.elements.aircraftZone;
    if (presetEl) {
      presetEl.value = presetId;
    }
    if (form.elements.installationTempLimit) {
      form.elements.installationTempLimit.value = snapshot.installationTempLimit != null
        ? String(snapshot.installationTempLimit)
        : String(getGuidancePresetLimit(presetId));
    }

    if (form.elements.t2Standard && snapshot.t2Standard) {
      form.elements.t2Standard.value = snapshot.t2Standard;
    }
    if (form.elements.altitudeFt && snapshot.altitudeFt != null) {
      form.elements.altitudeFt.value = String(snapshot.altitudeFt);
    }
    if (form.elements.bundleWireCount != null && snapshot.bundleWireCount != null) {
      form.elements.bundleWireCount.value = snapshot.bundleWireCount;
    }
    if (form.elements.bundleLoadingPct && snapshot.bundleLoadingPct != null) {
      form.elements.bundleLoadingPct.value = String(snapshot.bundleLoadingPct);
    }
    if (form.elements.wireLength != null && snapshot.wireLength != null) {
      form.elements.wireLength.value = snapshot.wireLength;
    }
    if (form.elements.wireLengthUnit && snapshot.wireLengthUnit) {
      form.elements.wireLengthUnit.value = snapshot.wireLengthUnit;
    }
    if (form.elements.routingPct != null && snapshot.routingPct != null) {
      form.elements.routingPct.value = snapshot.routingPct;
    }

    updateGridTitle();
    initAwgColumnPicker();
    recalc();
  }

  function setExportStatus(message, kind) {
    var statusEl = document.getElementById('pwa-export-status');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = 'pwa-export__status' + (kind ? ' pwa-export__status--' + kind : '');
  }

  function buildWorkbookTableRows(settings) {
    var form = document.getElementById('pwa-params-form');
    var rows = buildExportRows(settings, lastGridColumns, {
      params: form ? readParams(form) : null
    });
    rows.forEach(function (row) {
      if (row.divider) {
        row.colspan = rows[0] && rows[0].cells ? rows[0].cells.length : 1;
      }
    });
    return rows;
  }

  async function deliverExportBlob(blob, filename) {
    if (window.PwaProjectFolder && PwaProjectFolder.deliverExportBlob) {
      return PwaProjectFolder.deliverExportBlob(filename, blob);
    }
    if (window.PwaWorkbook && PwaWorkbook.downloadBlob) {
      PwaWorkbook.downloadBlob(blob, filename);
    }
    return { method: 'download', filename: filename };
  }

  function formatExportDeliveryMessage(baseMsg, delivery) {
    if (!delivery) {
      return baseMsg;
    }
    if (delivery.method === 'folder') {
      return baseMsg + ' Saved to project folder “' + delivery.folderLabel + '”: ' + delivery.filename + '.';
    }
    var msg = baseMsg + ' Downloaded ' + delivery.filename + '.';
    if (delivery.folderError) {
      msg += ' Could not save to the linked folder (' + delivery.folderError + ').';
    } else {
      msg += ' Use Choose folder (Chrome/Edge) to save directly into your project folder.';
    }
    return msg;
  }

  function buildExportLogFilename(reportFilename) {
    if (reportFilename) {
      return String(reportFilename).replace(/\.docx$/i, '-export-log.txt');
    }
    var stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return 'power-wire-analysis-export-log-' + stamp + '.txt';
  }

  function buildExportErrorLogText(meta) {
    meta = meta || {};
    var lines = [
      'Power Wire Analysis — Word project report export log',
      'Generated: ' + new Date().toLocaleString(),
      ''
    ];
    if (meta.reportFilename) {
      lines.push('Report file: ' + meta.reportFilename);
    }
    if (meta.includedCount != null) {
      lines.push('Wires included: ' + meta.includedCount);
    }
    if (meta.errors && meta.errors.length) {
      lines.push('');
      lines.push('Skipped workbooks (' + meta.errors.length + '):');
      meta.errors.forEach(function (entry, idx) {
        var colon = entry.indexOf(': ');
        if (colon >= 0) {
          lines.push('');
          lines.push((idx + 1) + '. ' + entry.slice(0, colon));
          lines.push('   ' + entry.slice(colon + 2));
        } else {
          lines.push('');
          lines.push((idx + 1) + '. ' + entry);
        }
      });
    }
    if (meta.folderError) {
      lines.push('');
      lines.push('Folder write error: ' + meta.folderError);
    }
    lines.push('');
    return lines.join('\r\n');
  }

  async function saveExportErrorLog(reportFilename, meta) {
    if (!window.PwaProjectFolder || !PwaProjectFolder.saveBlobToFolder) {
      return null;
    }
    var folderState = PwaProjectFolder.getState();
    if (!folderState.canWrite) {
      return null;
    }
    var logFilename = buildExportLogFilename(reportFilename);
    var blob = new Blob([buildExportErrorLogText(meta)], { type: 'text/plain;charset=utf-8' });
    try {
      await PwaProjectFolder.saveBlobToFolder(logFilename, blob);
      return logFilename;
    } catch (err) {
      return null;
    }
  }

  function exportWorkbookToExcel(exportAll) {
    if (!window.PwaWorkbook) {
      setExportStatus('Workbook export is unavailable.', 'error');
      return;
    }

    var form = document.getElementById('pwa-params-form');
    if (!form || !lastGridColumns.length) {
      setExportStatus('Grid is not ready yet. Try again in a moment.', 'error');
      return;
    }

    var settings = exportAll
      ? { awgLabels: WIRES.map(function (wire) { return wire.label; }) }
      : getSelectedExportSettings();

    if (!settings.awgLabels.length) {
      setExportStatus('Select at least one AWG column to export.', 'error');
      return;
    }

    try {
      var snapshot = collectParameterSnapshot(form);
      if (window.PwaAdvancedThermalUI) {
        PwaAdvancedThermalUI.extendSnapshot(snapshot);
      }
      if (window.PwaTransientThermalUI) {
        PwaTransientThermalUI.extendSnapshot(snapshot);
      }
      if (window.PwaAdvancedTcVoltageDrop) {
        PwaAdvancedTcVoltageDrop.extendSnapshot(snapshot);
      }
      var tableRows = buildWorkbookTableRows(settings);
      var gridTitleEl = document.getElementById('pwa-grid-title');
      var exportMeta = {
        includeParameters: exportAll,
        parameterOptions: exportAll ? collectParameterOptions(form) : null,
        gridTitle: gridTitleEl ? gridTitleEl.textContent : '',
        engineeringAssessment: buildInstallationAssessment(readParams(form), lastGridColumns),
        advancedThermal: window.PwaAdvancedThermalUI ? PwaAdvancedThermalUI.getExportData() : null,
        transientThermal: window.PwaTransientThermalUI ? PwaTransientThermalUI.getExportData() : null,
        standardsTraceability: window.PwaStandardsTraceability ? PwaStandardsTraceability.getExportData() : null,
        confidenceRating: window.PwaConfidenceRating ? PwaConfidenceRating.getExportData() : null,
        validationLibrary: window.PwaValidationLibrary ? PwaValidationLibrary.getExportData() : null,
        advancedTcVoltageDrop: window.PwaAdvancedTcVoltageDrop ? PwaAdvancedTcVoltageDrop.getExportData() : null,
        wireDataAudit: global.PwaWireDataLoader ? PwaWireDataLoader.getAuditInfo() : null,
        filename: PwaWorkbook.buildExportFilename(snapshot, {
          awgLabels: settings.awgLabels,
          extension: 'xlsx',
          includeTimestamp: getFilenameIncludeTimestamp()
        })
      };
      var out = PwaWorkbook.buildWorkbookBlob(snapshot, tableRows, exportMeta);
      deliverExportBlob(out.blob, out.filename).then(function (delivery) {
        if (delivery.method === 'folder' && window.PwaProjectFolder) {
          PwaProjectFolder.setActiveFile(out.filename);
          renderProjectFileList();
        }
        var statusMsg = formatExportDeliveryMessage(
          exportAll
            ? 'Exported Excel report workbook (Analysis, Parameters, and option lists).'
            : 'Exported Excel analysis grid.',
          delivery
        );
        if (!snapshot.wireNumber || !snapshot.projectNumber) {
          statusMsg += ' Tip: set Project number and Wire number for clearer filenames.';
        }
        setExportStatus(statusMsg, delivery.folderError ? 'error' : 'ok');
      }).catch(function (err) {
        setExportStatus(err && err.message ? err.message : 'Export failed.', 'error');
      });
    } catch (err) {
      setExportStatus(err && err.message ? err.message : 'Export failed.', 'error');
    }
  }

  function exportWordReport() {
    if (!window.PwaWordReport || !window.PwaWorkbook) {
      setExportStatus('Word export is unavailable.', 'error');
      return;
    }

    var form = document.getElementById('pwa-params-form');
    if (!form || !lastGridColumns.length) {
      setExportStatus('Grid is not ready yet. Try again in a moment.', 'error');
      return;
    }

    try {
      var snapshot = collectParameterSnapshot(form);
      if (window.PwaAdvancedThermalUI) {
        PwaAdvancedThermalUI.extendSnapshot(snapshot);
      }
      if (window.PwaTransientThermalUI) {
        PwaTransientThermalUI.extendSnapshot(snapshot);
      }
      if (window.PwaAdvancedTcVoltageDrop) {
        PwaAdvancedTcVoltageDrop.extendSnapshot(snapshot);
      }
      var exportSettings = getSelectedExportSettings();
      var tableRows = buildWorkbookTableRows({
        awgLabels: WIRES.map(function (wire) { return wire.label; })
      });
      var wireNumber = getWireNumber();
      var folderState = window.PwaProjectFolder ? PwaProjectFolder.getState() : {};
      var out = PwaWordReport.buildReportBlob([{
        snapshot: snapshot,
        tableRows: tableRows,
        wireId: wireNumber,
        filename: folderState.activeFileName || '',
        engineeringAssessment: buildInstallationAssessment(readParams(form), lastGridColumns),
        advancedThermal: window.PwaAdvancedThermalUI ? PwaAdvancedThermalUI.getExportData() : null,
        transientThermal: window.PwaTransientThermalUI ? PwaTransientThermalUI.getExportData() : null,
        standardsTraceability: window.PwaStandardsTraceability ? PwaStandardsTraceability.getExportData() : null,
        confidenceRating: window.PwaConfidenceRating ? PwaConfidenceRating.getExportData() : null,
        validationLibrary: window.PwaValidationLibrary ? PwaValidationLibrary.getExportData() : null,
        advancedTcVoltageDrop: window.PwaAdvancedTcVoltageDrop ? PwaAdvancedTcVoltageDrop.getExportData() : null,
        wireDataAudit: global.PwaWireDataLoader ? PwaWireDataLoader.getAuditInfo() : null
      }], {
        wireId: wireNumber,
        wireNumber: wireNumber,
        awgLabels: exportSettings.awgLabels,
        sourceFilename: folderState.activeFileName || '',
        projectName: snapshot.projectName,
        exportedAt: snapshot.exportedAt,
        includeTimestamp: getFilenameIncludeTimestamp()
      });
      deliverExportBlob(out.blob, out.filename).then(function (delivery) {
        var statusMsg = formatExportDeliveryMessage('Exported Word report.', delivery);
        if (!wireNumber || !snapshot.projectNumber) {
          statusMsg += ' Tip: set Project number and Wire number for clearer filenames.';
        }
        setExportStatus(statusMsg, delivery.folderError ? 'error' : 'ok');
      }).catch(function (err) {
        setExportStatus(err && err.message ? err.message : 'Word export failed.', 'error');
      });
    } catch (err) {
      setExportStatus(err && err.message ? err.message : 'Word export failed.', 'error');
    }
  }

  async function exportProjectWordReport() {
    if (!window.PwaWordReport || !window.PwaProjectFolder || !window.PwaWorkbook) {
      setExportStatus('Project Word export is unavailable.', 'error');
      return;
    }

    var folderState = PwaProjectFolder.getState();
    if (!folderState.files.length) {
      setExportStatus('Connect a project folder with Excel workbooks first.', 'error');
      return;
    }

    var form = document.getElementById('pwa-params-form');
    if (!form) {
      return;
    }

    var savedSnapshot = collectParameterSnapshot(form);
    var sections = [];
    var errors = [];
    var i;
    var entry;
    var file;
    var result;
    var snapshot;
    var tableRows;

    setExportStatus('Building Word project report from folder…', '');

    for (i = 0; i < folderState.files.length; i += 1) {
      entry = folderState.files[i];
      try {
        file = await PwaProjectFolder.getFile(entry);
        result = await PwaWorkbook.importWorkbook(file);
        applyParameterSnapshot(form, result.parameters);
        recalc();
        snapshot = collectParameterSnapshot(form);
        if (window.PwaAdvancedThermalUI) {
          PwaAdvancedThermalUI.extendSnapshot(snapshot);
        }
        if (window.PwaTransientThermalUI) {
          PwaTransientThermalUI.extendSnapshot(snapshot);
        }
        if (window.PwaAdvancedTcVoltageDrop) {
          PwaAdvancedTcVoltageDrop.extendSnapshot(snapshot);
        }
        if (!snapshot.projectName && savedSnapshot.projectName) {
          snapshot.projectName = savedSnapshot.projectName;
        }
        if (!snapshot.projectNumber && savedSnapshot.projectNumber) {
          snapshot.projectNumber = savedSnapshot.projectNumber;
        }
        tableRows = buildWorkbookTableRows({
          awgLabels: WIRES.map(function (wire) { return wire.label; })
        });
        sections.push({
          snapshot: snapshot,
          tableRows: tableRows,
          wireId: snapshot.wireNumber || entry.wireId,
          filename: entry.name,
          engineeringAssessment: buildInstallationAssessment(readParams(form), lastGridColumns),
          advancedThermal: window.PwaAdvancedThermalUI ? PwaAdvancedThermalUI.getExportData() : null,
          transientThermal: window.PwaTransientThermalUI ? PwaTransientThermalUI.getExportData() : null,
          standardsTraceability: window.PwaStandardsTraceability ? PwaStandardsTraceability.getExportData() : null,
        confidenceRating: window.PwaConfidenceRating ? PwaConfidenceRating.getExportData() : null,
        validationLibrary: window.PwaValidationLibrary ? PwaValidationLibrary.getExportData() : null,
        advancedTcVoltageDrop: window.PwaAdvancedTcVoltageDrop ? PwaAdvancedTcVoltageDrop.getExportData() : null
        });
      } catch (err) {
        errors.push(entry.name + ': ' + (err && err.message ? err.message : 'failed'));
      }
    }

    applyParameterSnapshot(form, savedSnapshot);
    recalc();

    if (!sections.length) {
      var failMsg =
        'Could not read any workbooks from the folder.' +
        (errors.length ? ' Skipped: ' + errors.join('; ') : '');
      var failLogName = await saveExportErrorLog(null, {
        includedCount: 0,
        errors: errors
      });
      if (failLogName) {
        failMsg += ' Error log saved as ' + failLogName + '.';
      }
      setExportStatus(failMsg, 'error');
      return;
    }

    try {
      var projectName = savedSnapshot.projectName || folderState.folderLabel;
      var out = PwaWordReport.buildReportBlob(sections, {
        projectNumber: savedSnapshot.projectNumber,
        projectName: projectName,
        projectTitle: buildProjectReportTitle(savedSnapshot, projectName),
        exportedAt: new Date().toISOString(),
        includeTimestamp: getFilenameIncludeTimestamp()
      });
      var delivery = await deliverExportBlob(out.blob, out.filename);
      var msg = formatExportDeliveryMessage(
        'Exported Word project report (' + sections.length + ' wire' +
          (sections.length === 1 ? '' : 's') + ').',
        delivery
      );
      if (errors.length) {
        msg += ' Skipped: ' + errors.join('; ');
        if (delivery.method === 'folder') {
          var logName = await saveExportErrorLog(out.filename, {
            reportFilename: out.filename,
            includedCount: sections.length,
            errors: errors
          });
          if (logName) {
            msg += ' Error log saved as ' + logName + '.';
          }
        }
      }
      setExportStatus(msg, errors.length || delivery.folderError ? 'error' : 'ok');
    } catch (err) {
      setExportStatus(err && err.message ? err.message : 'Word export failed.', 'error');
    }
  }

  var FOLDER_LIST_RENDER_LIMIT = 500;
  var FOLDER_LIST_LARGE_THRESHOLD = 200;
  var folderFilterTimer = null;

  function getFolderFilterQuery() {
    var el = document.getElementById('pwa-folder-filter');
    return el ? el.value.trim().toLowerCase() : '';
  }

  function resolveWireLabel(fileEntry, state) {
    if (fileEntry.name === state.activeFileName && getWireNumber()) {
      return getWireNumber();
    }
    if (window.PwaWorkbook && PwaWorkbook.parseExportFilenameMetadata) {
      var meta = PwaWorkbook.parseExportFilenameMetadata(fileEntry.name);
      if (meta.wireNumber) {
        return meta.wireNumber;
      }
    }
    if (fileEntry.wireId && fileEntry.wireId !== '—') {
      return fileEntry.wireId;
    }
    return '—';
  }

  function fileEntrySearchText(fileEntry, state) {
    var parts = [fileEntry.name, resolveWireLabel(fileEntry, state)];
    if (window.PwaWorkbook && PwaWorkbook.parseExportFilenameMetadata) {
      var meta = PwaWorkbook.parseExportFilenameMetadata(fileEntry.name);
      parts.push(meta.projectNumber, meta.projectName, meta.wireNumber);
    }
    return parts.join(' ').toLowerCase();
  }

  function fileEntryMatchesFilter(fileEntry, query, state) {
    if (!query) {
      return true;
    }
    return fileEntrySearchText(fileEntry, state).indexOf(query) >= 0;
  }

  function updateFolderListSummary(options) {
    var summaryEl = document.getElementById('pwa-folder-list-summary');
    var clearBtn = document.getElementById('pwa-folder-filter-clear');
    if (!summaryEl) {
      return;
    }

    options = options || {};
    var total = options.total || 0;
    var filtered = options.filtered != null ? options.filtered : total;
    var shown = options.shown || 0;
    var query = options.query || '';
    var capped = !!options.capped;

    if (clearBtn) {
      clearBtn.hidden = !query;
    }

    if (!total) {
      summaryEl.textContent = '';
      summaryEl.className = 'pwa-folder__list-summary';
      return;
    }

    var msg = '';
    if (query) {
      msg = filtered === 0
        ? 'No workbooks match “' + query + '”.'
        : 'Showing ' + shown + ' of ' + filtered + ' match' + (filtered === 1 ? '' : 'es') +
          ' (' + total + ' total in folder).';
      if (capped) {
        msg += ' Refine the filter to see more.';
      }
    } else if (total > FOLDER_LIST_LARGE_THRESHOLD) {
      msg = total.toLocaleString() + ' workbooks in folder — showing first ' + shown +
        '. Type in the filter to find a wire (required for very large projects).';
    } else {
      msg = 'Showing ' + shown + ' workbook' + (shown === 1 ? '' : 's') + '.';
    }

    summaryEl.textContent = msg;
    summaryEl.className = 'pwa-folder__list-summary' +
      ((!query && total > FOLDER_LIST_LARGE_THRESHOLD) || (query && filtered === 0) ? ' pwa-folder__list-summary--warn' : '');
  }

  function getFolderFilesToRender(state) {
    var query = getFolderFilterQuery();
    var filtered = query
      ? state.files.filter(function (fileEntry) {
        return fileEntryMatchesFilter(fileEntry, query, state);
      })
      : state.files.slice();

    var capped = false;
    var visible = filtered;
    if (!query && filtered.length > FOLDER_LIST_RENDER_LIMIT) {
      visible = filtered.slice(0, FOLDER_LIST_RENDER_LIMIT);
      capped = true;
    } else if (query && filtered.length > FOLDER_LIST_RENDER_LIMIT) {
      visible = filtered.slice(0, FOLDER_LIST_RENDER_LIMIT);
      capped = true;
    }

    return {
      query: query,
      total: state.files.length,
      filtered: filtered.length,
      shown: visible.length,
      capped: capped,
      visible: visible
    };
  }

  function supportsFolderPicker() {
    return typeof window.showDirectoryPicker === 'function';
  }

  function updateFolderBrowserHints() {
    var connectEl = document.getElementById('pwa-folder-connect');
    var pickerOption = document.getElementById('pwa-folder-option-picker');
    var uploadOption = document.getElementById('pwa-folder-option-upload');
    var pickerBadge = document.getElementById('pwa-folder-picker-badge');
    var uploadBadge = document.getElementById('pwa-folder-upload-badge');

    if (connectEl) {
      if (supportsFolderPicker()) {
        connectEl.classList.add('pwa-folder__connect--picker');
        connectEl.classList.remove('pwa-folder__connect--fallback');
      } else {
        connectEl.classList.add('pwa-folder__connect--fallback');
        connectEl.classList.remove('pwa-folder__connect--picker');
      }
    }

    if (pickerOption && uploadOption) {
      if (supportsFolderPicker()) {
        pickerOption.classList.add('pwa-folder__option--recommended');
        uploadOption.classList.remove('pwa-folder__option--recommended');
      } else {
        uploadOption.classList.add('pwa-folder__option--recommended');
        pickerOption.classList.remove('pwa-folder__option--recommended');
      }
    }

    if (pickerBadge) {
      pickerBadge.textContent = supportsFolderPicker()
        ? 'Recommended in Chrome / Edge'
        : 'Not supported in this browser';
    }
    if (uploadBadge) {
      uploadBadge.textContent = supportsFolderPicker()
        ? 'Alternative option'
        : 'Use this option in your browser';
    }

    var chooseBtn = document.getElementById('pwa-folder-choose');
    if (chooseBtn) {
      chooseBtn.disabled = !supportsFolderPicker();
      chooseBtn.title = supportsFolderPicker()
        ? 'Connect a project folder on your computer.'
        : 'Not available in this browser — use Load folder instead.';
    }
  }

  function updateFolderStatusPanel() {
    var pathEl = document.getElementById('pwa-folder-path');
    var detailEl = document.getElementById('pwa-folder-status-detail');
    var refreshBtn = document.getElementById('pwa-folder-refresh');
    if (!window.PwaProjectFolder || !pathEl) {
      return;
    }

    var state = PwaProjectFolder.getState();
    if (!state.hasFolder) {
      pathEl.textContent = 'No folder connected yet.';
      if (detailEl) {
        detailEl.textContent = supportsFolderPicker()
          ? 'Pick one option above (Choose folder is best in Chrome or Edge). Nothing is uploaded to this website.'
          : 'Your browser cannot use Choose folder — click Load folder on the right instead.';
      }
      if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.title = 'Connect a folder with Choose folder first.';
      }
      return;
    }

    pathEl.textContent = 'Connected: ' + state.folderLabel + ' (' + state.files.length +
      ' workbook' + (state.files.length === 1 ? '' : 's') + ')';

    if (detailEl) {
      if (state.canWrite) {
        detailEl.textContent =
          'Full access — exports save directly into this folder. Click Refresh after you add or rename workbooks on disk.';
      } else {
        detailEl.textContent =
          'Read-only snapshot — to see new or changed files, use Load folder again (Choose folder needs Chrome or Edge).';
      }
    }

    if (refreshBtn) {
      refreshBtn.disabled = !state.canWrite;
      refreshBtn.title = state.canWrite
        ? 'Rescan the connected folder for new or changed workbooks.'
        : 'Refresh only works after Choose folder in Chrome or Edge.';
    }

    if (window.PwaWorkflowPanel) {
      PwaWorkflowPanel.updateDataSourceUi();
    }
  }

  function renderProjectFileList() {
    var tbody = document.getElementById('pwa-folder-files');
    var scrollEl = document.getElementById('pwa-folder-table-scroll');
    if (!tbody || !window.PwaProjectFolder) {
      return;
    }

    updateFolderStatusPanel();

    var state = PwaProjectFolder.getState();

    if (!state.files.length) {
      tbody.innerHTML =
        '<tr><td colspan="3" class="pwa-folder__empty">' +
          (state.hasFolder
            ? 'No Excel workbooks (.xlsx) in this folder.'
            : 'Connect a folder above to list wire workbooks here.') +
        '</td></tr>';
      updateFolderListSummary({ total: 0 });
      return;
    }

    var list = getFolderFilesToRender(state);
    updateFolderListSummary(list);

    if (!list.visible.length) {
      tbody.innerHTML =
        '<tr><td colspan="3" class="pwa-folder__empty">No workbooks match your filter.</td></tr>';
      return;
    }

    var html = '';
    list.visible.forEach(function (fileEntry) {
      var activeClass = fileEntry.name === state.activeFileName ? ' pwa-folder__row--active' : '';
      var wireLabel = resolveWireLabel(fileEntry, state);
      html +=
        '<tr class="pwa-folder__row' + activeClass + '">' +
          '<td class="pwa-folder__wire">' + escapeHtml(wireLabel) + '</td>' +
          '<td class="pwa-folder__name">' + escapeHtml(fileEntry.name) + '</td>' +
          '<td class="pwa-folder__actions">' +
            '<button type="button" class="btn pwa-folder__load" data-filename="' +
              escapeHtml(fileEntry.name) + '">Load</button>' +
          '</td>' +
        '</tr>';
    });
    tbody.innerHTML = html;

    if (scrollEl && list.query) {
      scrollEl.scrollTop = 0;
    }
  }

  async function loadWireFromFolder(filename) {
    if (!window.PwaProjectFolder || !filename) {
      return;
    }

    var state = PwaProjectFolder.getState();
    var entry = null;
    state.files.forEach(function (fileEntry) {
      if (fileEntry.name === filename) {
        entry = fileEntry;
      }
    });
    if (!entry) {
      setExportStatus('File not found in the project folder.', 'error');
      return;
    }

    try {
      var file = await PwaProjectFolder.getFile(entry);
      importWorkbookFromFile(file);
      PwaProjectFolder.setActiveFile(filename);
      renderProjectFileList();
    } catch (err) {
      setExportStatus(err && err.message ? err.message : 'Could not load workbook.', 'error');
    }
  }

  function focusFolderFilterIfLarge(fileCount) {
    var filterInput = document.getElementById('pwa-folder-filter');
    if (fileCount > FOLDER_LIST_LARGE_THRESHOLD && filterInput) {
      filterInput.focus();
    }
  }

  async function connectProjectFolder() {
    if (!window.PwaProjectFolder) {
      setExportStatus('Project folder support is unavailable.', 'error');
      return;
    }

    try {
      var result = await PwaProjectFolder.chooseFolder();
      if (!result) {
        setExportStatus(
          'Choose folder is not supported in this browser. Use Load folder on the right instead.',
          'error'
        );
        return;
      }
      renderProjectFileList();
      setExportStatus(
        'Connected to “' + result.name + '” (' + result.files.length + ' workbook' +
          (result.files.length === 1 ? '' : 's') + ').',
        'ok'
      );
      focusFolderFilterIfLarge(result.files.length);
    } catch (err) {
      if (err && err.name === 'AbortError') {
        return;
      }
      setExportStatus(err && err.message ? err.message : 'Could not open folder.', 'error');
    }
  }

  async function refreshProjectFolder() {
    if (!window.PwaProjectFolder) {
      return;
    }

    try {
      var result = await PwaProjectFolder.refreshFolder();
      renderProjectFileList();
      if (result.files.length) {
        setExportStatus('Refreshed folder listing (' + result.files.length + ' workbooks).', 'ok');
      }
    } catch (err) {
      setExportStatus(err && err.message ? err.message : 'Could not refresh folder.', 'error');
    }
  }

  function initProjectFolder() {
    var chooseBtn = document.getElementById('pwa-folder-choose');
    var refreshBtn = document.getElementById('pwa-folder-refresh');
    var fallbackInput = document.getElementById('pwa-folder-fallback');
    var filterInput = document.getElementById('pwa-folder-filter');
    var filterClearBtn = document.getElementById('pwa-folder-filter-clear');
    var fileListBody = document.getElementById('pwa-folder-files');

    updateFolderBrowserHints();
    renderProjectFileList();

    if (fileListBody && !fileListBody.dataset.loadBound) {
      fileListBody.dataset.loadBound = '1';
      fileListBody.addEventListener('click', function (event) {
        var btn = event.target.closest('.pwa-folder__load');
        if (btn) {
          loadWireFromFolder(btn.getAttribute('data-filename'));
        }
      });
    }

    if (filterInput) {
      filterInput.addEventListener('input', function () {
        if (folderFilterTimer) {
          clearTimeout(folderFilterTimer);
        }
        folderFilterTimer = setTimeout(function () {
          renderProjectFileList();
        }, 150);
      });
    }

    if (filterClearBtn && filterInput) {
      filterClearBtn.addEventListener('click', function () {
        filterInput.value = '';
        renderProjectFileList();
        filterInput.focus();
      });
    }

    if (chooseBtn) {
      chooseBtn.addEventListener('click', function () {
        connectProjectFolder();
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', function () {
        refreshProjectFolder();
      });
    }

    if (fallbackInput) {
      fallbackInput.addEventListener('change', function () {
        if (!window.PwaProjectFolder || !fallbackInput.files || !fallbackInput.files.length) {
          return;
        }
        var result = PwaProjectFolder.loadFallbackFiles(fallbackInput.files);
        renderProjectFileList();
        setExportStatus(
          'Loaded folder “' + result.name + '” (' + result.files.length + ' workbook' +
            (result.files.length === 1 ? '' : 's') + ', read-only).',
          'ok'
        );
        focusFolderFilterIfLarge(result.files.length);
        fallbackInput.value = '';
      });
    }

    var wireNumberEl = document.getElementById('pwa-wire-number');
    var projectNumberEl = document.getElementById('pwa-project-number');
    var projectNameEl = document.getElementById('pwa-project-name');
    if (wireNumberEl) {
      wireNumberEl.addEventListener('input', renderProjectFileList);
    }
    if (projectNumberEl) {
      projectNumberEl.addEventListener('input', renderProjectFileList);
    }
    if (projectNameEl) {
      projectNameEl.addEventListener('input', renderProjectFileList);
    }
  }

  function buildProjectReportTitle(snapshot, fallbackName) {
    var parts = [];
    if (snapshot && snapshot.projectNumber) {
      parts.push('Project ' + snapshot.projectNumber);
    }
    if (snapshot && snapshot.projectName) {
      parts.push(snapshot.projectName);
    } else if (fallbackName) {
      parts.push(fallbackName);
    }
    return parts.length ? parts.join(' — ') : 'Power wire analysis project';
  }

  function importWorkbookFromFile(file) {
    if (!window.PwaWorkbook) {
      setExportStatus('Workbook import is unavailable.', 'error');
      return;
    }

    var form = document.getElementById('pwa-params-form');
    if (!form || !file) return;

    PwaWorkbook.importWorkbook(file).then(function (result) {
      applyParameterSnapshot(form, result.parameters);
      if (window.PwaWorkbook && PwaWorkbook.parseExportFilenameMetadata && file.name) {
        applyFilenameMetadataToFields(PwaWorkbook.parseExportFilenameMetadata(file.name));
      }
      renderProjectFileList();
      setExportStatus('Imported project settings from Excel.', 'ok');
    }).catch(function (err) {
      var message = err && err.message ? err.message : 'Import failed.';
      if (message === 'Failed to fetch') {
        message = 'Could not read the Excel file. If it is stored in OneDrive, copy it to a local folder and try again.';
      }
      setExportStatus(message, 'error');
    });
  }

  function copyTableToClipboard(useFormulas) {
    var settings = getSelectedExportSettings();
    var form = document.getElementById('pwa-params-form');

    function setStatus(message, kind) {
      setExportStatus(message, kind);
    }

    if (!settings.awgLabels.length) {
      setStatus('Select at least one AWG column to copy.', 'error');
      return;
    }
    if (!lastGridColumns.length) {
      setStatus('Grid is not ready yet. Try again in a moment.', 'error');
      return;
    }

    var exportOptions = {
      useFormulas: useFormulas,
      params: form ? readParams(form) : null
    };
    var rows = buildExportRows(settings, lastGridColumns, exportOptions);
    rows.forEach(function (row) {
      if (row.divider) {
        row.colspan = rows[0] && rows[0].cells ? rows[0].cells.length : 1;
      }
    });

    var plainText = buildExportPlainText(rows);

    function onSuccess(message) {
      setStatus(message, 'ok');
    }

    function onFailure() {
      setStatus('Copy failed. Select the grid manually or try another browser.', 'error');
    }

    if (useFormulas) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(plainText).then(function () {
          onSuccess('Copied with formulas — paste into Excel with Ctrl+V.');
        }).catch(onFailure);
        return;
      }
      onFailure();
      return;
    }

    var tableHtml = buildExportHtml(rows);
    var wordHtml = buildWordClipboardHtml(tableHtml);

    if (navigator.clipboard && window.ClipboardItem) {
      navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([wordHtml], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' })
        })
      ]).then(function () {
        onSuccess('Copied — paste into Word or Excel with Ctrl+V.');
      }).catch(function () {
        copyHtmlFallback(tableHtml, plainText).then(function () {
          onSuccess('Copied — paste into Word or Excel with Ctrl+V.');
        }).catch(onFailure);
      });
      return;
    }

    copyHtmlFallback(tableHtml, plainText).then(function () {
      onSuccess('Copied — paste into Word or Excel with Ctrl+V.');
    }).catch(onFailure);
  }

  function initExportControls() {
    var exportGridBtn = document.getElementById('pwa-export-excel-grid');
    var exportReportBtn = document.getElementById('pwa-export-excel-report');
    var exportWordBtn = document.getElementById('pwa-export-word-report');
    var exportWordProjectBtn = document.getElementById('pwa-export-word-project');
    var importInput = document.getElementById('pwa-import-workbook');
    var copyTableBtn = document.getElementById('pwa-copy-table');
    var copyFormulasBtn = document.getElementById('pwa-copy-table-formulas');

    if (exportGridBtn) {
      exportGridBtn.addEventListener('click', function () {
        exportWorkbookToExcel(false);
      });
    }

    if (exportReportBtn) {
      exportReportBtn.addEventListener('click', function () {
        exportWorkbookToExcel(true);
      });
    }

    if (exportWordBtn) {
      exportWordBtn.addEventListener('click', function () {
        exportWordReport();
      });
    }

    if (exportWordProjectBtn) {
      exportWordProjectBtn.addEventListener('click', function () {
        exportProjectWordReport();
      });
    }

    if (importInput) {
      importInput.addEventListener('change', function () {
        var file = importInput.files && importInput.files[0];
        if (file) {
          importWorkbookFromFile(file);
        }
        importInput.value = '';
      });
    }

    if (copyTableBtn) {
      copyTableBtn.addEventListener('click', function () {
        copyTableToClipboard(false);
      });
    }

    if (copyFormulasBtn) {
      copyFormulasBtn.addEventListener('click', function () {
        copyTableToClipboard(true);
      });
    }
  }

  function renderGrid(params) {
    var columns = WIRES.map(function (wire) {
      return computeColumn(params, wire);
    });
    lastGridColumns = columns;
    var visibleColumns = getVisibleGridColumns(columns);

    var emptyEl = document.getElementById('pwa-grid-empty');
    var scrollEl = document.getElementById('pwa-grid-scroll');
    var hasVisible = visibleColumns.length > 0;
    if (emptyEl) emptyEl.hidden = hasVisible;
    if (scrollEl) scrollEl.hidden = !hasVisible;

    var frozenHead = document.querySelector('#pwa-grid-frozen thead');
    var frozenBody = document.querySelector('#pwa-grid-frozen tbody');
    var dataHead = document.querySelector('#pwa-grid-data thead');
    var dataBody = document.querySelector('#pwa-grid-data tbody');
    var unitsHead = document.querySelector('#pwa-grid-units thead');
    var unitsBody = document.querySelector('#pwa-grid-units tbody');
    if (!frozenHead || !frozenBody || !dataHead || !dataBody || !unitsHead || !unitsBody) return;

    if (!hasVisible) {
      frozenHead.innerHTML = '';
      frozenBody.innerHTML = '';
      dataHead.innerHTML = '';
      dataBody.innerHTML = '';
      unitsHead.innerHTML = '';
      unitsBody.innerHTML = '';
      updateInstallationWarnings(params, []);
      clearInstallationAssessmentPanel();
      updateAwgColumnSummary();
      return;
    }

    frozenHead.innerHTML =
      '<tr class="pwa-grid__head">' +
        '<th class="pwa-grid__label-b">Cable size (AWG)</th>' +
        '<th class="pwa-grid__label-c">AWG</th>' +
      '</tr>';

    var dataHeadHtml = '<tr class="pwa-grid__head">';
    visibleColumns.forEach(function (col) {
      dataHeadHtml += '<th class="pwa-grid__awg">' + col.awg + '</th>';
    });
    dataHeadHtml += '</tr>';
    dataHead.innerHTML = dataHeadHtml;

    unitsHead.innerHTML =
      '<tr class="pwa-grid__head">' +
        '<th class="pwa-grid__unit"></th>' +
      '</tr>';

    var frozenHtml = '';
    var dataHtml = '';
    var unitsHtml = '';
    var vdropDividerShown = false;
    GRID_ROWS.forEach(function (row, idx) {
      if (row.key === 'awg') return;
      if (!shouldShowInstallAssessmentRow(row.key, params)) {
        return;
      }

      if (row.section === 'vdrop' && !vdropDividerShown) {
        vdropDividerShown = true;
        frozenHtml +=
          '<tr class="pwa-grid__row pwa-grid__row--divider" aria-hidden="true">' +
            '<th colspan="2"></th>' +
          '</tr>';
        dataHtml +=
          '<tr class="pwa-grid__row pwa-grid__row--divider" aria-hidden="true">' +
            '<td colspan="' + visibleColumns.length + '"></td>' +
          '</tr>';
        unitsHtml +=
          '<tr class="pwa-grid__row pwa-grid__row--divider" aria-hidden="true">' +
            '<td></td>' +
          '</tr>';
      }

      var excelRow = idx + 7;
      var rowClass = 'pwa-grid__row';
      if (row.fmt === 'blank') rowClass += ' pwa-grid__row--blank';
      if (row.section === 'vdrop') rowClass += ' pwa-grid__row--vdrop';

      var rowLabelB = row.key === 't2Factor'
        ? t2FactorRowLabel(params.t2Standard)
        : row.labelB;
      var rowTooltip = GRID_ROW_TOOLTIPS[row.key] || '';

      frozenHtml +=
        '<tr class="' + rowClass + '" data-row="' + excelRow + '">' +
          '<th class="pwa-grid__label-b" scope="row"' +
            (rowTooltip ? ' title="' + escapeHtml(rowTooltip) + '"' : '') + '>' +
            rowLabelB +
          '</th>' +
          '<td class="pwa-grid__label-c">' + row.labelC + '</td>' +
        '</tr>';

      dataHtml += '<tr class="' + rowClass + '" data-row="' + excelRow + '">';
      visibleColumns.forEach(function (col) {
        var val = col[row.key];
        var cellClass = 'pwa-grid__val';
        if (typeof val === 'number' && isFinite(val)) {
          if (row.key === 'Vdrop') {
            cellClass += val <= params.allowableDrop
              ? ' pwa-grid__val--pass'
              : ' pwa-grid__val--fail';
          } else if (row.key === 'T2') {
            var t2Status = t2StatusKey(val, getT2TempLimit(params));
            if (t2Status) {
              cellClass += ' pwa-grid__val--' + t2Status;
            }
          }
        }
        dataHtml += '<td class="' + cellClass + '">' + formatCell(row, val) + '</td>';
      });
      dataHtml += '</tr>';

      unitsHtml +=
        '<tr class="' + rowClass + '" data-row="' + excelRow + '">' +
          '<td class="pwa-grid__unit">' + row.unit + '</td>' +
        '</tr>';
    });

    frozenBody.innerHTML = frozenHtml;
    dataBody.innerHTML = dataHtml;
    unitsBody.innerHTML = unitsHtml;
    syncGridRowHeights();
    updateInstallationWarnings(params, visibleColumns);
    updateInstallationAssessmentPanel(params, visibleColumns);
    updateAwgColumnSummary();
  }

  function syncGridRowHeights() {
    var frozenHeadRow = document.querySelector('#pwa-grid-frozen thead tr');
    var dataHeadRow = document.querySelector('#pwa-grid-data thead tr');
    var unitsHeadRow = document.querySelector('#pwa-grid-units thead tr');
    var frozenRows = document.querySelectorAll('#pwa-grid-frozen tbody tr');
    var dataRows = document.querySelectorAll('#pwa-grid-data tbody tr');
    var unitsRows = document.querySelectorAll('#pwa-grid-units tbody tr');

    function matchRows(rows) {
      var present = rows.filter(function (row) { return row; });
      if (!present.length) return;
      present.forEach(function (row) {
        row.style.height = '';
      });
      var height = Math.max.apply(
        null,
        present.map(function (row) { return row.offsetHeight; })
      );
      present.forEach(function (row) {
        row.style.height = height + 'px';
      });
    }

    matchRows([frozenHeadRow, dataHeadRow, unitsHeadRow]);
    for (var i = 0; i < frozenRows.length; i += 1) {
      matchRows([frozenRows[i], dataRows[i], unitsRows[i]]);
    }
  }

  function updateInstallationWarnings(params, columns) {
    var panel = document.getElementById('pwa-install-temp-warnings');
    if (!panel) {
      return;
    }

    var limit = getT2TempLimit(params);
    var failAwgs = [];
    var cautionAwgs = [];
    columns.forEach(function (col) {
      if (typeof col.T2 !== 'number' || !isFinite(col.T2)) {
        return;
      }
      if (col.T2 > limit) {
        failAwgs.push(col.awg);
      } else if (col.T2 > 0.8 * limit) {
        cautionAwgs.push(col.awg);
      }
    });

    var failTitle = params.applyInstallationTempLimit
      ? 'Installation Temperature FAIL'
      : 'Cable Rating Temperature FAIL';
    var cautionTitle = params.applyInstallationTempLimit
      ? 'Installation Temperature CAUTION'
      : 'Cable Rating Temperature CAUTION';
    var failMessage = params.applyInstallationTempLimit
      ? 'Conductor temperature exceeds installation temperature limit. ' +
        'Cable insulation may remain within rating, however aircraft installation temperature ' +
        'requirements are exceeded.'
      : 'Conductor temperature exceeds cable rating T<sub>R</sub>.';
    var cautionMessage = params.applyInstallationTempLimit
      ? 'Conductor temperature exceeds 80% of installation limit. Consider increasing conductor size.'
      : 'Conductor temperature exceeds 80% of cable rating T<sub>R</sub>. Consider increasing conductor size.';

    var html = '';
    if (failAwgs.length) {
      html +=
        '<p class="pwa-install-warn pwa-install-warn--fail">' +
        '<strong>' + failTitle + ':</strong> ' + failMessage +
        (failAwgs.length ? ' AWG: ' + failAwgs.join(', ') + '.' : '') +
        '</p>';
    }
    if (cautionAwgs.length) {
      html +=
        '<p class="pwa-install-warn pwa-install-warn--caution">' +
        '<strong>' + cautionTitle + ':</strong> ' + cautionMessage +
        (cautionAwgs.length ? ' AWG: ' + cautionAwgs.join(', ') + '.' : '') +
        '</p>';
    }

    panel.innerHTML = html;
    panel.hidden = !html;
  }

  function updateInstallationAssessmentUI(params) {
    var enabled = params.applyInstallationTempLimit;
    var fieldsEl = document.getElementById('pwa-install-assessment-fields');
    var disabledNoteEl = document.getElementById('pwa-install-disabled-note');
    var basisEl = document.getElementById('pwa-temp-basis');
    var gridBasisEl = document.getElementById('pwa-grid-temp-basis');
    var basisText = 'Temperature basis: ' + temperatureBasisLabel(params);

    if (fieldsEl) {
      fieldsEl.classList.toggle('pwa-install-assessment-fields--disabled', !enabled);
      fieldsEl.setAttribute('aria-hidden', enabled ? 'false' : 'true');
    }
    if (disabledNoteEl) {
      disabledNoteEl.hidden = enabled;
    }
    if (basisEl) {
      basisEl.innerHTML = 'Temperature basis: <strong>' + temperatureBasisLabel(params) + '</strong>';
    }
    if (gridBasisEl) {
      gridBasisEl.textContent = basisText;
    }
  }

  function updateDerived(params) {
    var ftEl = document.getElementById('pwa-wire-length-ft');
    var mEl = document.getElementById('pwa-wire-length-m');
    var altEl = document.getElementById('pwa-altitude-factor');
    var bundleEl = document.getElementById('pwa-bundle-factor');
    var t2NoteEl = document.getElementById('pwa-t2-standard-note');
    var trEl = document.getElementById('pwa-tr-display');
    var tsafeEl = document.getElementById('pwa-tsafe-display');
    if (ftEl) ftEl.textContent = num(params.wireLengthFt, 2);
    if (mEl) mEl.textContent = num(params.wireLengthM, 3);
    if (altEl) altEl.textContent = num(params.altitudeDerating, 4);
    if (bundleEl) bundleEl.textContent = num(params.bundleDerating, 4);
    if (trEl) trEl.textContent = num(params.conductorTempRating, 0);
    if (tsafeEl) tsafeEl.textContent = num(params.tSafe, 0);
    if (t2NoteEl) {
      t2NoteEl.innerHTML = 'T<sub>2</sub> = ' + t2StandardNote(params.t2Standard);
    }
    updateInstallationAssessmentUI(params);
  }

  function recalc() {
    var form = document.getElementById('pwa-params-form');
    if (!form) return;
    var params = readParams(form);
    updateDerived(params);
    renderGrid(params);
    if (window.PwaAdvancedThermalUI && PwaAdvancedThermalUI.isEnabled()) {
      PwaAdvancedThermalUI.syncHotSurfaceDefault(params);
      PwaAdvancedThermalUI.updateAfterRecalc(
        params,
        lastGridColumns,
        getVisibleGridColumns(lastGridColumns)
      );
    }
    if (window.PwaTransientThermalUI && PwaTransientThermalUI.isEnabled()) {
      PwaTransientThermalUI.updateAfterRecalc(
        params,
        lastGridColumns,
        getVisibleGridColumns(lastGridColumns)
      );
    }
    if (window.PwaAdvancedTcVoltageDrop && typeof PwaAdvancedTcVoltageDrop.updateAfterRecalc === 'function') {
      PwaAdvancedTcVoltageDrop.updateAfterRecalc();
    }
  }

  function updateGridTitle() {
    var el = document.getElementById('pwa-grid-title');
    if (!el) return;
    el.textContent = WIRE_TYPE_LABEL
      ? WIRE_TYPE_LABEL + ' — wire analysis grid'
      : 'Wire analysis grid';
  }

  function init() {
    var form = document.getElementById('pwa-params-form');
    if (!form) return;

    initWireTypeControls(form);
    initAwgColumnPicker();
    initAwgColumnControls();
    updateGridTitle();
    initExportControls();
    initProjectFolder();
    if (window.PwaWorkflowPanel) {
      PwaWorkflowPanel.updateBrowserCompatStatus();
      PwaWorkflowPanel.updateDataSourceUi();
    }
    initAllowableDropControls(form);
    initGeneratorLineVoltageControls(form);
    initConductorTempRatingControls(form);
    initInstallationGuidanceControls(form);
    initAltitudeSelect(form);

    if (window.PwaAdvancedThermalUI) {
      PwaAdvancedThermalUI.init();
    }

    if (window.PwaTransientThermalUI) {
      PwaTransientThermalUI.init();
    }

    if (window.PwaAdvancedTcVoltageDrop) {
      PwaAdvancedTcVoltageDrop.init();
    }

    var unitEl = form.elements.wireLengthUnit;
    var lengthEl = form.elements.wireLength;
    var lastUnit = unitEl ? unitEl.value : 'in';

    if (unitEl && lengthEl) {
      unitEl.addEventListener('change', function () {
        var val = parseFloat(lengthEl.value, 10);
        var newUnit = unitEl.value;
        if (isFinite(val) && lastUnit !== newUnit) {
          var inches = lengthToInches(val, lastUnit);
          lengthEl.value = formatLengthForUnit(inchesToLength(inches, newUnit), newUnit);
        }
        lastUnit = newUnit;
      });
    }

    form.addEventListener('input', recalc);
    form.addEventListener('change', recalc);
    window.addEventListener('resize', syncGridRowHeights);

    var guideEl = document.getElementById('pwa-how-to');
    if (guideEl) {
      function typesetGuide() {
        if (!guideEl.open || !window.MathJax || !MathJax.Hub) return;
        MathJax.Hub.Queue(['Typeset', MathJax.Hub, guideEl]);
      }
      guideEl.addEventListener('toggle', typesetGuide);
      if (window.MathJax && MathJax.Hub) {
        MathJax.Hub.Register.StartupHook('End', typesetGuide);
      }
    }

    recalc();
  }

  window.PWA_GLOBAL_DISCLAIMER = PWA_GLOBAL_DISCLAIMER;
  window.PwaGridCalculator = {
    buildEngineeringAssessment: buildInstallationAssessment,
    GLOBAL_DISCLAIMER: PWA_GLOBAL_DISCLAIMER,
    GUIDANCE_PRESET_DISCLAIMER: GUIDANCE_PRESET_DISCLAIMER,
    triggerRecalc: recalc,
    applyWireType: applyWireType,
    applyExternalWireType: applyExternalWireType,
    removeExternalWireOptions: removeExternalWireOptions,
    setExportStatus: setExportStatus,
    renderProjectFileList: renderProjectFileList,
    getSelectedAwgLabels: getSelectedAwgLabels,
    getAdvancedTcVoltageDropColumn: getAdvancedTcVoltageDropColumn,
    getConfidenceSnapshot: function () {
      var form = document.getElementById('pwa-params-form');
      if (!form) {
        return null;
      }
      var params = readParams(form);
      var visibleColumns = getVisibleGridColumns(lastGridColumns);
      var assessment = buildInstallationAssessment(params, visibleColumns);
      var worstColumn = null;
      var i;
      if (assessment && visibleColumns.length) {
        for (i = 0; i < visibleColumns.length; i += 1) {
          if (visibleColumns[i].awg === assessment.worstAwg) {
            worstColumn = visibleColumns[i];
            break;
          }
        }
      }
      var wireTypeLabel = '';
      if (form.elements.wireType) {
        var wireOpt = form.elements.wireType.options[form.elements.wireType.selectedIndex];
        wireTypeLabel = wireOpt ? wireOpt.text : form.elements.wireType.value;
      }
      return {
        params: params,
        assessment: assessment,
        worstColumn: worstColumn,
        wireTypeLabel: wireTypeLabel
      };
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
