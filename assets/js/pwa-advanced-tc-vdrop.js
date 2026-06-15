/**
 * Advanced Tc Voltage-Drop Option — supplementary comparison using heat-balance Tc.
 * Does not modify existing T₂-based voltage-drop calculations or pass/fail logic.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'powerWireAdvancedTcVoltageDrop_v1';
  var COPPER_REF = 254.5;
  var COPPER_COEF = 234.5;

  var DISCLAIMER =
    'Supplementary engineering comparison only. The existing T₂-based voltage-drop result in the analysis grid is unchanged and remains the baseline method.';

  var prefs = { enabled: false, basis: 't2', includeReport: true };
  var lastResult = null;
  var bound = false;

  function $(id) {
    return document.getElementById(id);
  }

  function num(value, digits) {
    var n = Number(value);
    if (!isFinite(n)) {
      return '—';
    }
    return n.toFixed(digits == null ? 2 : digits);
  }

  function loadPrefs() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        prefs.enabled = !!parsed.enabled;
        prefs.basis = parsed.basis === 'advanced' ? 'advanced' : 't2';
        if (typeof parsed.includeReport === 'boolean') {
          prefs.includeReport = parsed.includeReport;
        }
      }
    } catch (e) {
      /* ignore */
    }
  }

  function savePrefs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        enabled: isFeatureEnabled(),
        basis: getSelectedBasis(),
        includeReport: isIncludeInReport()
      }));
    } catch (e) {
      /* ignore */
    }
  }

  function isFeatureEnabled() {
    var el = $('pwa-adv-tc-vdrop-enable');
    return !!(el && el.checked);
  }

  function isAdvancedThermalEnabled() {
    var el = $('pwa-advanced-thermal-enable');
    return !!(el && el.checked);
  }

  function isIncludeInReport() {
    var el = $('pwa-adv-tc-vdrop-include-report');
    return !el || el.checked;
  }

  function getSelectedBasis() {
    var adv = $('pwa-adv-tc-vdrop-basis-advanced');
    return adv && adv.checked ? 'advanced' : 't2';
  }

  function readMaterial() {
    var matEl = $('pwa-at-material');
    return matEl ? String(matEl.value || 'copper').toLowerCase() : 'copper';
  }

  function calculateResistanceAtTemperature(r20PerFt, tempC, material) {
    if (!isFinite(r20PerFt) || !isFinite(tempC)) {
      return null;
    }
    if (material === 'aluminium' || material === 'aluminum') {
      var alpha = global.PwaAdvancedThermal && PwaAdvancedThermal.MATERIAL_ALPHA
        ? PwaAdvancedThermal.MATERIAL_ALPHA.aluminium
        : 0.00403;
      return r20PerFt * (1 + alpha * (tempC - 20));
    }
    return r20PerFt * (COPPER_COEF + tempC) / COPPER_REF;
  }

  function calculateVoltageDropAtTemperature(currentA, r20PerFt, wireLenFt, tempC, material) {
    if (!isFinite(currentA) || !isFinite(r20PerFt) || !isFinite(wireLenFt) || !isFinite(tempC)) {
      return null;
    }
    var rCorrected = calculateResistanceAtTemperature(r20PerFt, tempC, material);
    if (rCorrected == null) {
      return null;
    }
    return currentA * rCorrected * wireLenFt;
  }

  function getAdvancedTcVoltageDropInputs() {
    if (!global.PwaGridCalculator || typeof PwaGridCalculator.getConfidenceSnapshot !== 'function') {
      return null;
    }
    var snapshot = PwaGridCalculator.getConfidenceSnapshot();
    if (!snapshot || !snapshot.params) {
      return null;
    }

    var col = typeof PwaGridCalculator.getAdvancedTcVoltageDropColumn === 'function'
      ? PwaGridCalculator.getAdvancedTcVoltageDropColumn()
      : snapshot.worstColumn;
    if (!col) {
      return null;
    }

    var params = snapshot.params;
    var adv = global.PwaAdvancedThermalUI && PwaAdvancedThermalUI.getExportData
      ? PwaAdvancedThermalUI.getExportData()
      : null;

    return {
      currentA: params.circuitCurrent,
      systemVoltage: params.generatorLineVoltage,
      allowableDropV: params.allowableDrop,
      wireLenFt: params.wireLengthFt,
      r20PerFt: col.R1000 / 1000,
      t2C: col.T2,
      vdropT2V: col.Vdrop,
      tcAdvancedC: adv ? adv.tcAdvanced : null,
      awg: col.awg,
      material: readMaterial(),
      advancedThermalEnabled: isAdvancedThermalEnabled()
    };
  }

  function getExistingT2Status(vdropV, allowableV) {
    if (!isFinite(allowableV) || allowableV <= 0) {
      return 'Limit not defined';
    }
    if (!isFinite(vdropV)) {
      return 'Unavailable';
    }
    if (vdropV <= allowableV) {
      return 'PASS';
    }
    return 'FAIL';
  }

  function getAdvancedTcVoltageDropStatus(vdropPercent, allowablePercent) {
    if (!isFinite(allowablePercent) || allowablePercent <= 0) {
      return 'Limit not defined';
    }
    if (!isFinite(vdropPercent)) {
      return 'Unavailable';
    }
    if (vdropPercent <= allowablePercent) {
      return 'PASS';
    }
    if (vdropPercent <= allowablePercent + 0.5) {
      return 'WARNING';
    }
    return 'FAIL';
  }

  function statusChangeLabel(existingStatus, supplementaryStatus) {
    if (existingStatus === supplementaryStatus) {
      return 'Unchanged';
    }
    if (existingStatus === 'Limit not defined' || supplementaryStatus === 'Limit not defined') {
      return 'N/A';
    }
    return existingStatus + ' → ' + supplementaryStatus;
  }

  function getAdvancedTcVoltageDropInterpretation(result) {
    if (!result || !result.calculated) {
      return [];
    }

    var lines = [];
    var absPctDiff = Math.abs(result.differencePercentPoints);

    if (absPctDiff < 0.1) {
      lines.push('Advanced Tc has negligible effect on voltage-drop assessment.');
    } else if (absPctDiff <= 0.5) {
      lines.push('Advanced Tc has a small but measurable effect on voltage-drop assessment.');
    } else {
      lines.push('Advanced Tc materially affects voltage-drop assessment and should be reviewed.');
    }

    if (isFinite(result.tcAdvancedC) && isFinite(result.t2C)) {
      if (result.tcAdvancedC < result.t2C) {
        lines.push(
          'Advanced heat-balance model predicts a lower conductor temperature than the existing T₂ estimate, reducing corrected resistance and voltage drop.'
        );
      } else if (result.tcAdvancedC > result.t2C) {
        lines.push(
          'Advanced heat-balance model predicts a higher conductor temperature than the existing T₂ estimate, increasing corrected resistance and voltage drop.'
        );
      }
    }

    return lines;
  }

  function calculateAdvancedTcVoltageDrop() {
    var inputs = getAdvancedTcVoltageDropInputs();
    if (!inputs) {
      return { calculated: false, reason: 'Calculator inputs unavailable.' };
    }
    if (!inputs.advancedThermalEnabled) {
      return { calculated: false, reason: 'Advanced Heat-Balance Model is not enabled.' };
    }
    if (!isFinite(inputs.tcAdvancedC)) {
      return { calculated: false, reason: 'Advanced heat-balance conductor temperature (Tc) is not available.' };
    }
    if (!isFinite(inputs.currentA) || inputs.currentA <= 0) {
      return { calculated: false, reason: 'Circuit current is unavailable.' };
    }
    if (!isFinite(inputs.r20PerFt) || inputs.r20PerFt <= 0) {
      return { calculated: false, reason: 'Conductor resistance at 20 °C is unavailable.' };
    }
    if (!isFinite(inputs.wireLenFt) || inputs.wireLenFt <= 0) {
      return { calculated: false, reason: 'Wire run length is unavailable.' };
    }
    if (!isFinite(inputs.vdropT2V)) {
      return { calculated: false, reason: 'Existing T₂-based voltage drop is unavailable.' };
    }

    var rT2 = calculateResistanceAtTemperature(inputs.r20PerFt, inputs.t2C, inputs.material);
    var rAdv = calculateResistanceAtTemperature(inputs.r20PerFt, inputs.tcAdvancedC, inputs.material);
    var vdropAdvV = calculateVoltageDropAtTemperature(
      inputs.currentA,
      inputs.r20PerFt,
      inputs.wireLenFt,
      inputs.tcAdvancedC,
      inputs.material
    );

    if (rT2 == null || rAdv == null || vdropAdvV == null) {
      return { calculated: false, reason: 'Could not calculate temperature-corrected resistance or voltage drop.' };
    }

    var systemV = inputs.systemVoltage;
    var vdropT2Pct = systemV > 0 ? (inputs.vdropT2V / systemV) * 100 : null;
    var vdropAdvPct = systemV > 0 ? (vdropAdvV / systemV) * 100 : null;
    var allowablePct = systemV > 0 && isFinite(inputs.allowableDropV)
      ? (inputs.allowableDropV / systemV) * 100
      : null;

    var diffV = vdropAdvV - inputs.vdropT2V;
    var diffPctPoints = vdropT2Pct != null && vdropAdvPct != null ? vdropAdvPct - vdropT2Pct : null;
    var relativeDiffPct = vdropT2Pct > 0 && diffPctPoints != null
      ? (diffPctPoints / vdropT2Pct) * 100
      : null;

    var existingStatus = getExistingT2Status(inputs.vdropT2V, inputs.allowableDropV);
    var supplementaryStatus = getAdvancedTcVoltageDropStatus(vdropAdvPct, allowablePct);

    return {
      calculated: true,
      enabled: true,
      basis: getSelectedBasis(),
      awg: inputs.awg,
      material: inputs.material,
      currentA: inputs.currentA,
      systemVoltage: systemV,
      allowableDropV: inputs.allowableDropV,
      allowableDropPercent: allowablePct,
      wireLenFt: inputs.wireLenFt,
      r20PerFt: inputs.r20PerFt,
      t2C: inputs.t2C,
      tcAdvancedC: inputs.tcAdvancedC,
      vdropT2V: inputs.vdropT2V,
      vdropT2Percent: vdropT2Pct,
      vdropAdvancedTcV: vdropAdvV,
      vdropAdvancedTcPercent: vdropAdvPct,
      differenceV: diffV,
      differencePercentPoints: diffPctPoints,
      relativeDifferencePercent: relativeDiffPct,
      resistanceT2Ohms: rT2 * inputs.wireLenFt,
      resistanceAdvancedTcOhms: rAdv * inputs.wireLenFt,
      resistanceT2PerFt: rT2,
      resistanceAdvancedTcPerFt: rAdv,
      existingStatus: existingStatus,
      supplementaryStatus: supplementaryStatus,
      statusChange: statusChangeLabel(existingStatus, supplementaryStatus),
      temperatureBasisUsed: getSelectedBasis() === 'advanced'
        ? 'Advanced Heat-Balance Tc (supplementary assessment basis selected)'
        : 'Existing T₂ estimate (supplementary assessment basis selected)',
      interpretation: [],
      assumptions: buildAssumptions(inputs, rT2, rAdv),
      disclaimer: DISCLAIMER
    };
  }

  function buildAssumptions(inputs, rT2, rAdv) {
    var materialLabel = inputs.material === 'aluminium' || inputs.material === 'aluminum'
      ? 'Aluminium (α = 0.00403 / °C)'
      : 'Copper (ARP4404C §9.3.4.2: R(T) = R₂₀ × (234.5 + T) / 254.5)';

    return [
      { parameter: 'T₂ source', value: 'Existing calculator (AWG ' + inputs.awg + ')', source: 'Analysis grid', comment: 'Baseline method — unchanged' },
      { parameter: 'Tc Advanced source', value: isFinite(inputs.tcAdvancedC) ? num(inputs.tcAdvancedC, 2) + ' °C' : '—', source: 'Advanced Heat-Balance Model', comment: 'Supplementary temperature basis' },
      { parameter: 'Resistance at 20 °C', value: num(inputs.r20PerFt, 6) + ' Ω/ft', source: 'Wire catalog / grid', comment: 'Same R₂₀ as existing calculator' },
      { parameter: 'Resistance at T₂', value: num(rT2, 6) + ' Ω/ft', source: materialLabel, comment: 'Existing temperature correction' },
      { parameter: 'Resistance at Advanced Tc', value: num(rAdv, 6) + ' Ω/ft', source: materialLabel, comment: 'Same correction basis, Advanced Tc substituted' },
      { parameter: 'Voltage-drop formula', value: 'V = I × R(T) × L', source: 'Same as existing calculator', comment: 'Supplementary comparison only' },
      { parameter: 'Status', value: 'Supplementary only', source: 'Feature design', comment: 'Does not alter main grid pass/fail' }
    ];
  }

  function setStatusClass(el, status) {
    if (!el) {
      return;
    }
    el.classList.remove('pwa-adv-tc-vdrop__status--pass', 'pwa-adv-tc-vdrop__status--warn', 'pwa-adv-tc-vdrop__status--fail');
    if (status === 'PASS') {
      el.classList.add('pwa-adv-tc-vdrop__status--pass');
    } else if (status === 'WARNING') {
      el.classList.add('pwa-adv-tc-vdrop__status--warn');
    } else if (status === 'FAIL') {
      el.classList.add('pwa-adv-tc-vdrop__status--fail');
    }
  }

  function renderAdvancedTcVoltageDropResults(result) {
    var panel = $('pwa-adv-tc-vdrop-results');
    if (!panel) {
      return;
    }

    if (!isFeatureEnabled() || !result || !result.calculated) {
      panel.hidden = true;
      return;
    }

    result.interpretation = getAdvancedTcVoltageDropInterpretation(result);
    panel.hidden = false;

    var map = {
      'pwa-adv-tc-vdrop-res-t2-v': num(result.vdropT2V, 3) + ' V',
      'pwa-adv-tc-vdrop-res-t2-pct': result.vdropT2Percent != null ? num(result.vdropT2Percent, 3) + ' %' : '—',
      'pwa-adv-tc-vdrop-res-adv-v': num(result.vdropAdvancedTcV, 3) + ' V',
      'pwa-adv-tc-vdrop-res-adv-pct': result.vdropAdvancedTcPercent != null ? num(result.vdropAdvancedTcPercent, 3) + ' %' : '—',
      'pwa-adv-tc-vdrop-res-diff-v': num(result.differenceV, 3) + ' V',
      'pwa-adv-tc-vdrop-res-diff-pct': result.differencePercentPoints != null ? num(result.differencePercentPoints, 3) + ' % pts' : '—',
      'pwa-adv-tc-vdrop-res-rel-pct': result.relativeDifferencePercent != null ? num(result.relativeDifferencePercent, 2) + ' %' : '—',
      'pwa-adv-tc-vdrop-res-r-t2': num(result.resistanceT2Ohms, 6) + ' Ω',
      'pwa-adv-tc-vdrop-res-r-adv': num(result.resistanceAdvancedTcOhms, 6) + ' Ω',
      'pwa-adv-tc-vdrop-res-basis': result.temperatureBasisUsed,
      'pwa-adv-tc-vdrop-res-awg': 'AWG ' + result.awg
    };

    Object.keys(map).forEach(function (id) {
      var el = $(id);
      if (el) {
        el.textContent = map[id];
      }
    });

    var awgNote = document.querySelector('.pwa-adv-tc-vdrop__awg-note');
    if (awgNote && global.PwaGridCalculator && typeof PwaGridCalculator.getSelectedAwgLabels === 'function') {
      var selected = PwaGridCalculator.getSelectedAwgLabels();
      if (selected.length === 1) {
        awgNote.innerHTML = 'AWG column: <span id="pwa-adv-tc-vdrop-res-awg">AWG ' + result.awg + '</span>';
      } else if (selected.length > 1) {
        awgNote.innerHTML =
          'Worst-case AWG column (among ' + selected.length + ' selected): ' +
          '<span id="pwa-adv-tc-vdrop-res-awg">AWG ' + result.awg + '</span>';
      } else {
        awgNote.innerHTML =
          'Worst-case AWG column: <span id="pwa-adv-tc-vdrop-res-awg">AWG ' + result.awg + '</span>';
      }
    }

    var supStatusEl = $('pwa-adv-tc-vdrop-res-sup-status');
    if (supStatusEl) {
      supStatusEl.textContent = result.supplementaryStatus;
      setStatusClass(supStatusEl, result.supplementaryStatus);
    }

    var interpEl = $('pwa-adv-tc-vdrop-interpretation');
    if (interpEl) {
      interpEl.innerHTML = result.interpretation.map(function (line) {
        return '<p>' + line + '</p>';
      }).join('');
    }
  }

  function renderAdvancedTcVoltageDropComparison(result) {
    var tbody = $('pwa-adv-tc-vdrop-compare-body');
    if (!tbody) {
      return;
    }

    if (!result || !result.calculated) {
      tbody.innerHTML = '';
      return;
    }

    function row(label, t2Val, advVal, diffVal) {
      return '<tr><td>' + label + '</td><td class="pwa-adv-tc-vdrop__num">' + t2Val +
        '</td><td class="pwa-adv-tc-vdrop__num">' + advVal +
        '</td><td class="pwa-adv-tc-vdrop__num">' + diffVal + '</td></tr>';
    }

    var dt = isFinite(result.tcAdvancedC) && isFinite(result.t2C)
      ? num(result.tcAdvancedC - result.t2C, 2) + ' °C'
      : '—';

    tbody.innerHTML =
      row('Conductor temperature', num(result.t2C, 2) + ' °C', num(result.tcAdvancedC, 2) + ' °C', dt) +
      row(
        'Corrected resistance',
        num(result.resistanceT2Ohms, 6) + ' Ω',
        num(result.resistanceAdvancedTcOhms, 6) + ' Ω',
        num(result.resistanceAdvancedTcOhms - result.resistanceT2Ohms, 6) + ' Ω'
      ) +
      row(
        'Voltage drop',
        num(result.vdropT2V, 3) + ' V',
        num(result.vdropAdvancedTcV, 3) + ' V',
        num(result.differenceV, 3) + ' V'
      ) +
      row(
        'Voltage drop %',
        result.vdropT2Percent != null ? num(result.vdropT2Percent, 3) + ' %' : '—',
        result.vdropAdvancedTcPercent != null ? num(result.vdropAdvancedTcPercent, 3) + ' %' : '—',
        result.differencePercentPoints != null ? num(result.differencePercentPoints, 3) + ' % pts' : '—'
      ) +
      row(
        'Status',
        result.existingStatus,
        result.supplementaryStatus,
        result.statusChange
      );
  }

  function renderAssumptionsTable(result) {
    var tbody = $('pwa-adv-tc-vdrop-assumptions-body');
    if (!tbody) {
      return;
    }
    if (!result || !result.assumptions) {
      tbody.innerHTML = '';
      return;
    }
    tbody.innerHTML = result.assumptions.map(function (row) {
      return '<tr><td>' + row.parameter + '</td><td>' + row.value +
        '</td><td>' + row.source + '</td><td>' + row.comment + '</td></tr>';
    }).join('');
  }

  function renderDependencyState(result) {
    var warn = $('pwa-adv-tc-vdrop-dep-warn');
    var enableBtn = $('pwa-adv-tc-vdrop-enable-advanced');
    var content = $('pwa-adv-tc-vdrop-content');
    var calcWarn = $('pwa-adv-tc-vdrop-calc-warn');

    if (!isFeatureEnabled()) {
      if (warn) {
        warn.hidden = true;
      }
      if (calcWarn) {
        calcWarn.hidden = true;
      }
      if (content) {
        content.hidden = true;
      }
      return;
    }

    if (content) {
      content.hidden = false;
    }

    var advDisabled = !isAdvancedThermalEnabled();
    if (warn) {
      warn.hidden = !advDisabled;
    }
    if (enableBtn) {
      enableBtn.hidden = !advDisabled;
    }

    if (calcWarn) {
      if (advDisabled) {
        calcWarn.hidden = false;
        calcWarn.textContent = 'Advanced Tc voltage-drop comparison requires the Advanced Heat-Balance Model to be enabled.';
      } else if (result && !result.calculated && result.reason) {
        calcWarn.hidden = false;
        calcWarn.textContent = result.reason;
      } else {
        calcWarn.hidden = true;
      }
    }
  }

  function updateAdvancedTcVoltageDrop() {
    if (!isFeatureEnabled()) {
      lastResult = null;
      renderDependencyState(null);
      renderAdvancedTcVoltageDropResults(null);
      renderAdvancedTcVoltageDropComparison(null);
      renderAssumptionsTable(null);
      return;
    }

    lastResult = calculateAdvancedTcVoltageDrop();
    renderDependencyState(lastResult);
    renderAdvancedTcVoltageDropResults(lastResult);
    renderAdvancedTcVoltageDropComparison(lastResult);
    renderAssumptionsTable(lastResult);
  }

  function setPanelVisible(visible) {
    var panel = $('pwa-adv-tc-vdrop-panel');
    if (panel) {
      panel.hidden = !visible;
    }
  }

  function applyPrefsToUI() {
    var enableEl = $('pwa-adv-tc-vdrop-enable');
    if (enableEl) {
      enableEl.checked = prefs.enabled;
    }
    var basisT2 = $('pwa-adv-tc-vdrop-basis-t2');
    var basisAdv = $('pwa-adv-tc-vdrop-basis-advanced');
    if (prefs.basis === 'advanced' && basisAdv) {
      basisAdv.checked = true;
    } else if (basisT2) {
      basisT2.checked = true;
    }
    var reportEl = $('pwa-adv-tc-vdrop-include-report');
    if (reportEl) {
      reportEl.checked = prefs.includeReport;
    }
    setPanelVisible(prefs.enabled);
  }

  function bindEvents() {
    if (bound) {
      return;
    }
    bound = true;

    var enableEl = $('pwa-adv-tc-vdrop-enable');
    if (enableEl) {
      enableEl.addEventListener('change', function () {
        setPanelVisible(enableEl.checked);
        savePrefs();
        updateAdvancedTcVoltageDrop();
      });
    }

    var panel = $('pwa-adv-tc-vdrop-panel');
    if (panel) {
      panel.addEventListener('change', function () {
        savePrefs();
        updateAdvancedTcVoltageDrop();
      });
    }

    var enableAdvBtn = $('pwa-adv-tc-vdrop-enable-advanced');
    if (enableAdvBtn) {
      enableAdvBtn.addEventListener('click', function () {
        var advEl = $('pwa-advanced-thermal-enable');
        if (!advEl) {
          return;
        }
        advEl.checked = true;
        advEl.dispatchEvent(new Event('change', { bubbles: true }));
        if (global.PwaGridCalculator && typeof PwaGridCalculator.triggerRecalc === 'function') {
          PwaGridCalculator.triggerRecalc();
        }
      });
    }

    var form = document.getElementById('pwa-params-form');
    if (form) {
      form.addEventListener('input', function () {
        if (isFeatureEnabled()) {
          updateAdvancedTcVoltageDrop();
        }
      });
      form.addEventListener('change', function () {
        if (isFeatureEnabled()) {
          updateAdvancedTcVoltageDrop();
        }
      });
    }

    var advEnable = $('pwa-advanced-thermal-enable');
    if (advEnable) {
      advEnable.addEventListener('change', function () {
        if (isFeatureEnabled()) {
          updateAdvancedTcVoltageDrop();
        }
      });
    }

    var advBody = $('pwa-advanced-thermal-body');
    if (advBody) {
      advBody.addEventListener('change', function () {
        if (isFeatureEnabled()) {
          updateAdvancedTcVoltageDrop();
        }
      });
      advBody.addEventListener('input', function () {
        if (isFeatureEnabled()) {
          updateAdvancedTcVoltageDrop();
        }
      });
    }
  }

  function initAdvancedTcVoltageDropOption() {
    loadPrefs();
    applyPrefsToUI();
    bindEvents();
    updateAdvancedTcVoltageDrop();
  }

  function updateAfterRecalc() {
    if (isFeatureEnabled()) {
      updateAdvancedTcVoltageDrop();
    }
  }

  function extendSnapshot(snapshot) {
    if (!snapshot) {
      return snapshot;
    }
    snapshot.advancedTcVoltageDropEnabled = isFeatureEnabled() ? 'yes' : 'no';
    snapshot.advancedTcVoltageDropBasis = getSelectedBasis();
    return snapshot;
  }

  function getExportData() {
    if (!isFeatureEnabled() || !isIncludeInReport() || !lastResult || !lastResult.calculated) {
      return null;
    }
    return lastResult;
  }

  function getCalculatedValues() {
    if (!lastResult || !lastResult.calculated) {
      return {
        advancedTcVdropV: null,
        advancedTcVdropPercent: null
      };
    }
    return {
      advancedTcVdropV: lastResult.vdropAdvancedTcV,
      advancedTcVdropPercent: lastResult.vdropAdvancedTcPercent
    };
  }

  function buildAdvancedTcVoltageDropReportSection() {
    var data = getExportData();
    if (!data) {
      return null;
    }
    return data;
  }

  global.PwaAdvancedTcVoltageDrop = {
    init: initAdvancedTcVoltageDropOption,
    initAdvancedTcVoltageDropOption: initAdvancedTcVoltageDropOption,
    updateAfterRecalc: updateAfterRecalc,
    getAdvancedTcVoltageDropInputs: getAdvancedTcVoltageDropInputs,
    calculateResistanceAtTemperature: calculateResistanceAtTemperature,
    calculateVoltageDropAtTemperature: calculateVoltageDropAtTemperature,
    calculateAdvancedTcVoltageDrop: calculateAdvancedTcVoltageDrop,
    renderAdvancedTcVoltageDropResults: renderAdvancedTcVoltageDropResults,
    renderAdvancedTcVoltageDropComparison: renderAdvancedTcVoltageDropComparison,
    getAdvancedTcVoltageDropStatus: getAdvancedTcVoltageDropStatus,
    getAdvancedTcVoltageDropInterpretation: getAdvancedTcVoltageDropInterpretation,
    buildAdvancedTcVoltageDropReportSection: buildAdvancedTcVoltageDropReportSection,
    getExportData: getExportData,
    getCalculatedValues: getCalculatedValues,
    extendSnapshot: extendSnapshot,
    isEnabled: isFeatureEnabled,
    isIncludeInReport: isIncludeInReport,
    DISCLAIMER: DISCLAIMER
  };
})(window);
