(function (global) {
  'use strict';

  var lastWireSpecFile = null;

  function $(id) {
    return document.getElementById(id);
  }

  function setText(id, text) {
    var el = $(id);
    if (el) {
      el.textContent = text;
    }
  }

  function setHtml(id, html) {
    var el = $(id);
    if (el) {
      el.innerHTML = html;
    }
  }

  function toggleHidden(el, hidden) {
    if (!el) {
      return;
    }
    if (hidden) {
      el.setAttribute('hidden', '');
    } else {
      el.removeAttribute('hidden');
    }
  }

  function statusClass(status) {
    if (status === 'valid') {
      return 'pwa-workflow__status--ok';
    }
    if (status === 'invalid') {
      return 'pwa-workflow__status--error';
    }
    if (status === 'warning') {
      return 'pwa-workflow__status--warn';
    }
    return '';
  }

  function updateBrowserCompatStatus() {
    var supported = global.PwaProjectFolder && PwaProjectFolder.supportsFolderPicker();
    setText('pwa-browser-compat-status', supported
      ? 'File System Access API: supported (folder read/write where permitted).'
      : 'File System Access API: not supported — use manual spreadsheet upload and download exports.');
    var folderSectionNote = $('pwa-folder-api-note');
    if (folderSectionNote) {
      folderSectionNote.textContent = supported
        ? 'Folder access uses the browser File System Access API. Permission is requested each session; handles are not permanently stored on disk.'
        : 'Folder access is not supported by this browser. Use manual spreadsheet upload and manual report download.';
    }
    var chooseBtn = $('pwa-folder-choose');
    if (chooseBtn) {
      chooseBtn.disabled = !supported;
    }
  }

  function updateDataSourceUi(audit) {
    audit = audit || (global.PwaWireDataLoader ? PwaWireDataLoader.getAuditInfo() : {});
    var external = audit.dataSourceMode === PwaWireDataLoader.DATA_SOURCE_EXTERNAL;
    var externalSection = $('pwa-workflow-external-wire');
    var internalNote = $('pwa-workflow-internal-note');
    var banner = $('pwa-data-source-banner');

    toggleHidden(externalSection, !external);
    toggleHidden(internalNote, external);

    if (banner) {
      banner.className = 'pwa-data-source-banner ' +
        (external && audit.dataValidationStatus === 'valid'
          ? 'pwa-data-source-banner--external'
          : 'pwa-data-source-banner--internal');
      banner.textContent = audit.internalExternalDeclaration;
    }

    setText('pwa-wire-data-type', audit.wireSpecificationName || '—');
    setText('pwa-wire-data-filename', audit.wireSpreadsheetFileName || '—');
    setText('pwa-wire-data-version', audit.wireSpecificationRevision || '—');
    setText('pwa-wire-data-modified', audit.wireSpreadsheetFileName !== '—' && global.PwaWireDataLoader
      ? PwaWireDataLoader.formatTimestamp(
        global.PwaWireDataLoader.getState().externalFileLastModified
      )
      : '—');

    var validationEl = $('pwa-wire-data-validation');
    if (validationEl) {
      validationEl.textContent = audit.dataValidationStatus === 'valid'
        ? (audit.validationWarnings && audit.validationWarnings.length
          ? 'Validated — external data active (see warnings)'
          : 'Validated — external data active')
        : audit.dataValidationStatus === 'invalid'
          ? 'Invalid — using internal data'
          : external
            ? 'Not loaded — select and validate a spreadsheet'
            : 'Internal built-in data (no external file)';
      validationEl.className = 'pwa-workflow__status ' + statusClass(
        audit.dataValidationStatus === 'valid' ? 'valid'
          : audit.dataValidationStatus === 'invalid' ? 'invalid' : 'warning'
      );
    }

    var errorsEl = $('pwa-wire-data-errors');
    if (errorsEl) {
      if (audit.validationErrors && audit.validationErrors.length) {
        errorsEl.innerHTML = '<ul>' + audit.validationErrors.map(function (msg) {
          return '<li>' + escapeHtml(msg) + '</li>';
        }).join('') + '</ul>';
        errorsEl.hidden = false;
      } else {
        errorsEl.innerHTML = '';
        errorsEl.hidden = true;
      }
    }

    var warningsEl = $('pwa-wire-data-warnings');
    if (warningsEl) {
      if (audit.validationWarnings && audit.validationWarnings.length) {
        warningsEl.innerHTML = '<ul>' + audit.validationWarnings.map(function (msg) {
          return '<li>' + escapeHtml(msg) + '</li>';
        }).join('') + '</ul>';
        warningsEl.hidden = false;
      } else {
        warningsEl.innerHTML = '';
        warningsEl.hidden = true;
      }
    }

    setText('pwa-folder-access-status', audit.projectFolderStatus || '—');

    var form = document.getElementById('pwa-params-form');
    var wireSelect = form && form.elements.wireType;
    if (wireSelect && global.PwaWireDataLoader && PwaWireDataLoader.isExternalActive()) {
      wireSelect.disabled = true;
      wireSelect.title = 'Wire type is controlled by the validated external spreadsheet.';
    } else if (wireSelect) {
      wireSelect.disabled = false;
      wireSelect.title = '';
    }
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setExportStatus(message, kind) {
    if (global.PwaGridCalculator && typeof PwaGridCalculator.setExportStatus === 'function') {
      PwaGridCalculator.setExportStatus(message, kind);
      return;
    }
    var el = $('pwa-export-status');
    if (el) {
      el.textContent = message;
      el.className = 'pwa-export__status' + (kind ? ' pwa-export__status--' + kind : '');
    }
  }

  function applyExternalWireToCalculator(result) {
    if (!result.valid || !result.wireType) {
      return false;
    }
    var form = document.getElementById('pwa-params-form');
    if (!form || !global.PwaGridCalculator) {
      return false;
    }
    if (typeof PwaGridCalculator.applyExternalWireType === 'function') {
      PwaGridCalculator.applyExternalWireType(result.wireType);
    }
    return true;
  }

  function revertToInternalWire() {
    if (!global.PwaWireDataLoader) {
      return;
    }
    PwaWireDataLoader.setDataSource(PwaWireDataLoader.DATA_SOURCE_INTERNAL);
    if (global.PwaGridCalculator && typeof PwaGridCalculator.removeExternalWireOptions === 'function') {
      PwaGridCalculator.removeExternalWireOptions();
    }
    var form = document.getElementById('pwa-params-form');
    if (form && global.PwaGridCalculator && typeof PwaGridCalculator.applyWireType === 'function') {
      PwaGridCalculator.applyWireType(form.elements.wireType.value);
    }
  }

  async function handleWireSpecFile(file, reload) {
    if (!file) {
      setExportStatus('No wire specification spreadsheet selected.', 'error');
      return;
    }
    if (!global.PwaWireDataLoader || !global.PwaWireDataValidator) {
      setExportStatus('Wire data modules are unavailable.', 'error');
      return;
    }

    PwaWireDataLoader.setDataSource(PwaWireDataLoader.DATA_SOURCE_EXTERNAL);
    setExportStatus(reload ? 'Reloading wire specification…' : 'Validating wire specification…', '');

    try {
      var result = await PwaWireDataLoader.loadExternalWireSpec(file, {});
      if (result.valid) {
        applyExternalWireToCalculator(result);
        setExportStatus(
          'External wire data validated and active: ' + result.wireType.label +
          ' (revision ' + (result.metadata.revision || '—') + ').',
          'ok'
        );
      } else {
        revertToInternalWire();
        setExportStatus(
          'Wire specification rejected. Calculations reverted to internal data. ' +
          (result.errors[0] || ''),
          'error'
        );
      }
      updateDataSourceUi();
    } catch (err) {
      revertToInternalWire();
      setExportStatus(err && err.message ? err.message : 'Could not load wire specification.', 'error');
      updateDataSourceUi();
    }
  }

  function initDataSourceControls() {
    var internalRadio = $('pwa-data-source-internal');
    var externalRadio = $('pwa-data-source-external');
    if (!internalRadio || !externalRadio || !global.PwaWireDataLoader) {
      return;
    }

    internalRadio.addEventListener('change', function () {
      if (internalRadio.checked) {
        PwaWireDataLoader.setDataSource(PwaWireDataLoader.DATA_SOURCE_INTERNAL);
        revertToInternalWire();
        updateDataSourceUi();
        setExportStatus('Using internal built-in wire specifications.', 'ok');
      }
    });

    externalRadio.addEventListener('change', function () {
      if (externalRadio.checked) {
        PwaWireDataLoader.setDataSource(PwaWireDataLoader.DATA_SOURCE_EXTERNAL);
        updateDataSourceUi();
        if (!PwaWireDataLoader.isExternalActive()) {
          setExportStatus(
            'External mode selected. Load and validate a controlled wire specification spreadsheet.',
            'warning'
          );
        }
      }
    });
  }

  function initWireSpecControls() {
    var fileInput = $('pwa-wire-spec-file');
    var loadBtn = $('pwa-wire-spec-load');
    var reloadBtn = $('pwa-wire-spec-reload');
    var validateBtn = $('pwa-wire-spec-validate');

    if (loadBtn && fileInput) {
      loadBtn.addEventListener('click', function () {
        fileInput.click();
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', function () {
        var file = fileInput.files && fileInput.files[0];
        if (!file) {
          return;
        }
        lastWireSpecFile = file;
        handleWireSpecFile(file, false);
        fileInput.value = '';
      });
    }

    if (reloadBtn) {
      reloadBtn.addEventListener('click', function () {
        if (!lastWireSpecFile) {
          setExportStatus('No spreadsheet loaded yet. Use Load Wire Specification Spreadsheet first.', 'error');
          return;
        }
        handleWireSpecFile(lastWireSpecFile, true);
      });
    }

    if (validateBtn) {
      validateBtn.addEventListener('click', function () {
        if (!lastWireSpecFile) {
          setExportStatus('Select a spreadsheet before validating.', 'error');
          return;
        }
        handleWireSpecFile(lastWireSpecFile, true);
      });
    }
  }

  function initFolderExtras() {
    var clearBtn = $('pwa-folder-clear');
    if (clearBtn && global.PwaProjectFolder) {
      clearBtn.addEventListener('click', function () {
        PwaProjectFolder.clearFolder();
        if (global.PwaGridCalculator && typeof PwaGridCalculator.renderProjectFileList === 'function') {
          PwaGridCalculator.renderProjectFileList();
        }
        updateDataSourceUi();
        setExportStatus('Project folder cleared.', 'ok');
      });
    }
  }

  function init() {
    if (!global.PwaWireDataLoader) {
      return;
    }

    initDataSourceControls();
    initWireSpecControls();
    initFolderExtras();
    updateBrowserCompatStatus();
    updateDataSourceUi();

    PwaWireDataLoader.onChange(updateDataSourceUi);
  }

  global.PwaWorkflowPanel = {
    init: init,
    updateDataSourceUi: updateDataSourceUi,
    updateBrowserCompatStatus: updateBrowserCompatStatus
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : this);
