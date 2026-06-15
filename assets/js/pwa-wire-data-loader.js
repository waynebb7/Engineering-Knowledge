(function (global) {
  'use strict';

  var DATA_SOURCE_INTERNAL = 'internal';
  var DATA_SOURCE_EXTERNAL = 'external';

  var state = {
    dataSource: DATA_SOURCE_INTERNAL,
    externalWireType: null,
    externalFileName: '',
    externalFileLastModified: null,
    validationStatus: 'not_loaded',
    validationErrors: [],
    validationWarnings: [],
    validatedAt: null,
    loadedRevision: ''
  };

  function formatTimestamp(date) {
    if (!date) {
      return '—';
    }
    try {
      return new Date(date).toLocaleString();
    } catch (e) {
      return String(date);
    }
  }

  function getDataSource() {
    return state.dataSource;
  }

  function isExternalMode() {
    return state.dataSource === DATA_SOURCE_EXTERNAL;
  }

  function isExternalActive() {
    return isExternalMode() && state.validationStatus === 'valid' && !!state.externalWireType;
  }

  function getActiveWireTypeId(formWireTypeId) {
    if (isExternalActive()) {
      return state.externalWireType.id;
    }
    return formWireTypeId;
  }

  function getWireType(wireTypeId) {
    if (isExternalActive()) {
      return state.externalWireType;
    }
    if (global.PwaWireCatalog) {
      return PwaWireCatalog.getWireType(wireTypeId);
    }
    return null;
  }

  function getWireRows(wireTypeId) {
    var wireType = getWireType(wireTypeId);
    if (!wireType) {
      return [];
    }
    if (global.PwaWireCatalog && typeof PwaWireCatalog.buildWireRowsFromType === 'function') {
      return PwaWireCatalog.buildWireRowsFromType(wireType);
    }
    if (global.PwaWireCatalog) {
      return PwaWireCatalog.getWireRows(wireType.id);
    }
    return [];
  }

  function setDataSource(mode) {
    if (mode !== DATA_SOURCE_INTERNAL && mode !== DATA_SOURCE_EXTERNAL) {
      return;
    }
    state.dataSource = mode;
    if (mode === DATA_SOURCE_INTERNAL) {
      clearExternalData(false);
    }
    dispatchChange();
  }

  function clearExternalData(dispatch) {
    state.externalWireType = null;
    state.externalFileName = '';
    state.externalFileLastModified = null;
    state.validationStatus = 'not_loaded';
    state.validationErrors = [];
    state.validationWarnings = [];
    state.validatedAt = null;
    state.loadedRevision = '';
    if (dispatch !== false) {
      dispatchChange();
    }
  }

  function applyValidationResult(result, fileMeta) {
    fileMeta = fileMeta || {};
    state.validationErrors = result.errors ? result.errors.slice() : [];
    state.validationWarnings = result.warnings ? result.warnings.slice() : [];
    state.validatedAt = new Date().toISOString();

    if (result.valid && result.wireType) {
      state.externalWireType = result.wireType;
      state.validationStatus = 'valid';
      state.loadedRevision = String(
        (result.metadata && result.metadata.revision) || ''
      ).trim();
      state.externalFileName = fileMeta.name || '';
      state.externalFileLastModified = fileMeta.lastModified || null;
    } else {
      state.externalWireType = null;
      state.validationStatus = 'invalid';
      state.loadedRevision = '';
    }
    dispatchChange();
    return result;
  }

  async function loadExternalWireSpec(file, options) {
    if (!file) {
      throw new Error('No wire specification file selected.');
    }
    if (!global.PwaWireDataValidator) {
      throw new Error('Wire data validator is unavailable.');
    }

    var result = await PwaWireDataValidator.validateWireSpecFile(file, options || {});
    applyValidationResult(result, {
      name: file.name,
      lastModified: file.lastModified
    });
    return result;
  }

  function getAuditInfo() {
    var folderState = global.PwaProjectFolder ? PwaProjectFolder.getState() : {};
    return {
      dataSourceMode: state.dataSource,
      dataSourceLabel: state.dataSource === DATA_SOURCE_EXTERNAL
        ? 'External controlled spreadsheet'
        : 'Internal built-in specifications',
      wireSpreadsheetFileName: state.externalFileName || '—',
      wireSpecificationRevision: state.loadedRevision || '—',
      wireSpecificationName: state.externalWireType
        ? state.externalWireType.label
        : (state.dataSource === DATA_SOURCE_INTERNAL ? 'Built-in catalog' : '—'),
      wireTypeId: state.externalWireType
        ? state.externalWireType.id
        : 'internal',
      dataValidationStatus: state.validationStatus,
      validationErrors: state.validationErrors.slice(),
      validationWarnings: state.validationWarnings.slice(),
      validatedAt: state.validatedAt,
      calculationTimestamp: new Date().toISOString(),
      browserFolderApiSupported: typeof global.showDirectoryPicker === 'function',
      projectFolderStatus: folderState.hasFolder
        ? (folderState.canWrite ? 'Connected (read/write)' : 'Connected (read-only snapshot)')
        : 'Not connected',
      projectFolderLabel: folderState.folderLabel || '—',
      internalExternalDeclaration: isExternalActive()
        ? 'Calculations use validated external controlled wire spreadsheet data.'
        : 'Calculations use internal built-in wire specification data.'
    };
  }

  var listeners = [];

  function onChange(fn) {
    if (typeof fn === 'function') {
      listeners.push(fn);
    }
  }

  function dispatchChange() {
    var info = getAuditInfo();
    listeners.forEach(function (fn) {
      try {
        fn(info);
      } catch (e) {
        /* ignore listener errors */
      }
    });
  }

  function getState() {
    return {
      dataSource: state.dataSource,
      externalWireType: state.externalWireType,
      externalFileName: state.externalFileName,
      externalFileLastModified: state.externalFileLastModified,
      validationStatus: state.validationStatus,
      validationErrors: state.validationErrors.slice(),
      validationWarnings: state.validationWarnings.slice(),
      validatedAt: state.validatedAt,
      loadedRevision: state.loadedRevision
    };
  }

  global.PwaWireDataLoader = {
    DATA_SOURCE_INTERNAL: DATA_SOURCE_INTERNAL,
    DATA_SOURCE_EXTERNAL: DATA_SOURCE_EXTERNAL,
    getDataSource: getDataSource,
    isExternalMode: isExternalMode,
    isExternalActive: isExternalActive,
    getActiveWireTypeId: getActiveWireTypeId,
    getWireType: getWireType,
    getWireRows: getWireRows,
    setDataSource: setDataSource,
    clearExternalData: clearExternalData,
    loadExternalWireSpec: loadExternalWireSpec,
    applyValidationResult: applyValidationResult,
    getAuditInfo: getAuditInfo,
    getState: getState,
    onChange: onChange,
    formatTimestamp: formatTimestamp
  };
})(typeof window !== 'undefined' ? window : this);
