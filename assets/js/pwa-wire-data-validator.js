(function (global) {
  'use strict';

  function parseNumber(value) {
    if (value == null || value === '') {
      return null;
    }
    var n = parseFloat(String(value).replace(/,/g, ''));
    return isNaN(n) ? null : n;
  }

  function normalizeAwgLabel(value) {
    var s = String(value || '').trim();
    if (/^\d+$/.test(s)) {
      return s;
    }
    if (/^0+$/.test(s)) {
      return s;
    }
    return s.replace(/^AWG[-\s]*/i, '').trim();
  }

  function normalizeHeaderKey(label) {
    return String(label || '').trim().toLowerCase()
      .replace(/[°]/g, '')
      .replace(/@/g, 'at')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }

  function mapAwgRecord(record) {
    var mapped = {};
    Object.keys(record).forEach(function (header) {
      var key = normalizeHeaderKey(header);
      mapped[key] = record[header];
    });
    return {
      awg: normalizeAwgLabel(mapped.awg || mapped.awg_size || mapped.cable_size),
      strand: mapped.strand || mapped.strand_construction || '',
      conductorNomDiaMm: parseNumber(mapped.conductor_nom_dia_mm || mapped.conductor_nominal_diameter_mm),
      ohmPerKm: parseNumber(mapped.ohm_per_km_20c || mapped.resistance_at_20_c_km),
      ohmPer1000ft: parseNumber(mapped.ohm_per_1000ft_20c || mapped.resistance_at_20_c_1000_ft),
      odMinMm: parseNumber(mapped.od_min_mm || mapped.outside_diameter_min_mm),
      odMaxMm: parseNumber(mapped.od_max_mm || mapped.outside_diameter_max_mm),
      ampRatingMax: parseNumber(mapped.amp_rating_max_a || mapped.maximum_rated_current_a),
      weightKgPerKm: parseNumber(mapped.weight_kg_per_km || mapped.weight_kg_km)
    };
  }

  function parseMetadata(rawPairs) {
    var schema = global.PwaWireDataSchema;
    if (!schema) {
      return {};
    }
    var out = {};
    Object.keys(rawPairs).forEach(function (key) {
      var norm = schema.normalizeMetadataKey(key);
      out[norm] = rawPairs[key];
    });
    return out;
  }

  function buildWireTypeFromParsed(parsed) {
    var meta = parsed.metadata;
    var id = String(meta.wire_type_id || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
    if (!id) {
      id = 'external-wire';
    }
    var defaultTr = parseNumber(meta.default_conductor_temp_rating_c);
    var awgSizes = parsed.awgRows.map(function (row) {
      var size = { awg: row.awg };
      if (row.strand) size.strand = row.strand;
      if (row.conductorNomDiaMm != null) size.conductorNomDiaMm = row.conductorNomDiaMm;
      if (row.ohmPerKm != null) size.ohmPerKm = row.ohmPerKm;
      if (row.ohmPer1000ft != null) size.ohmPer1000ft = row.ohmPer1000ft;
      if (row.odMinMm != null) size.odMinMm = row.odMinMm;
      if (row.odMaxMm != null) size.odMaxMm = row.odMaxMm;
      if (row.ampRatingMax != null) size.ampRatingMax = row.ampRatingMax;
      if (row.weightKgPerKm != null) size.weightKgPerKm = row.weightKgPerKm;
      return size;
    });

    return {
      id: id,
      label: meta.wire_spec_name || id,
      manufacturer: meta.manufacturer || '',
      brandSpec: meta.part_number_family || meta.specification_reference || '',
      construction: meta.construction || '',
      operatingTemp: meta.operating_temp_range || '',
      voltageRating: meta.voltage_rating || '',
      defaultConductorTempRating: defaultTr,
      specPage: '',
      documentFile: '',
      external: true,
      awgSizes: awgSizes,
      metadata: meta,
      supplementary: {
        resistance: parsed.resistanceData,
        temperature: parsed.temperatureData,
        derating: parsed.deratingData,
        advanced: parsed.advancedData,
        validationCases: parsed.validationCases
      }
    };
  }

  async function parseWireSpecFile(file) {
    if (!global.PwaWorkbook) {
      throw new Error('Workbook parser is unavailable.');
    }
    var schema = global.PwaWireDataSchema;
    if (!schema) {
      throw new Error('Wire data schema is unavailable.');
    }

    var entries = await PwaWorkbook.parseWorkbookEntriesFromFile(file);
    var metaPath = PwaWorkbook.findSheetPathByName(entries, schema.SHEET_NAMES.metadata);
    var awgPath = PwaWorkbook.findSheetPathByName(entries, schema.SHEET_NAMES.awgData);
    if (!metaPath) {
      throw new Error('Metadata sheet not found. Use an approved wire specification template.');
    }
    if (!awgPath) {
      throw new Error('AWG_Data sheet not found. Use an approved wire specification template.');
    }

    var metaRows = PwaWorkbook.parseSheetRowsFromEntries(entries, metaPath);
    var metaKv = PwaWorkbook.parseKeyValueSheet(metaRows);
    var metadata = parseMetadata(metaKv);

    var awgSheetRows = PwaWorkbook.parseSheetRowsFromEntries(entries, awgPath);
    var awgTable = PwaWorkbook.parseTableSheet(awgSheetRows, 1);
    var awgRows = awgTable.map(mapAwgRecord).filter(function (row) {
      return row.awg;
    });

    function readKvSheet(sheetName) {
      var path = PwaWorkbook.findSheetPathByName(entries, sheetName);
      if (!path) {
        return {};
      }
      return parseMetadata(PwaWorkbook.parseKeyValueSheet(PwaWorkbook.parseSheetRowsFromEntries(entries, path)));
    }

    return {
      metadata: metadata,
      awgRows: awgRows,
      resistanceData: readKvSheet(schema.SHEET_NAMES.resistanceData),
      temperatureData: readKvSheet(schema.SHEET_NAMES.temperatureData),
      deratingData: readKvSheet(schema.SHEET_NAMES.deratingData),
      advancedData: readKvSheet(schema.SHEET_NAMES.advancedData),
      validationCases: (function () {
        var path = PwaWorkbook.findSheetPathByName(entries, schema.SHEET_NAMES.validationCases);
        if (!path) {
          return [];
        }
        return PwaWorkbook.parseTableSheet(PwaWorkbook.parseSheetRowsFromEntries(entries, path), 1);
      })()
    };
  }

  function validateParsedWireSpec(parsed, options) {
    options = options || {};
    var schema = global.PwaWireDataSchema;
    var errors = [];
    var warnings = [];
    var meta = parsed.metadata || {};

    if (!schema) {
      errors.push('Wire data schema is unavailable.');
      return { valid: false, errors: errors, warnings: warnings };
    }

    schema.METADATA_FIELDS.forEach(function (field) {
      if (field.required && !String(meta[field.key] || '').trim()) {
        errors.push('Missing required metadata: ' + field.label + ' (' + field.key + ').');
      }
      if (field.numeric && String(meta[field.key] || '').trim()) {
        if (parseNumber(meta[field.key]) == null) {
          errors.push('Invalid numeric metadata: ' + field.label + ' (expected a number or leave blank).');
        }
      }
    });

    if (meta.data_locked && !schema.isDataLockedValue(meta.data_locked)) {
      warnings.push('DATA_LOCKED is set but not YES — treat as draft unless programme rules say otherwise.');
    } else if (!schema.isDataLockedValue(meta.data_locked)) {
      warnings.push('DATA_LOCKED is not YES. Use programme governance; spreadsheet may still drive calculations when otherwise valid.');
    }

    if (!parsed.awgRows || !parsed.awgRows.length) {
      errors.push('AWG_Data sheet contains no wire gauge rows.');
    } else {
      var awgSet = {};
      parsed.awgRows.forEach(function (row) {
        if (!row.awg) {
          errors.push('AWG_Data row missing AWG size.');
          return;
        }
        if (awgSet[row.awg]) {
          errors.push('Duplicate AWG size in AWG_Data: ' + row.awg);
        }
        awgSet[row.awg] = true;
        if (row.ohmPerKm == null && row.ohmPer1000ft == null) {
          errors.push('AWG ' + row.awg + ': resistance at 20 °C is required (Ω/km or Ω/1000 ft).');
        }
        if (row.ohmPerKm != null && row.ohmPerKm <= 0) {
          errors.push('AWG ' + row.awg + ': resistance must be positive.');
        }
        if (row.ohmPer1000ft != null && row.ohmPer1000ft <= 0) {
          errors.push('AWG ' + row.awg + ': resistance must be positive.');
        }
      });

      var missingStandard = schema.STANDARD_AWG_SIZES.filter(function (size) {
        return !awgSet[size];
      });
      if (missingStandard.length) {
        warnings.push('AWG_Data missing standard sizes: ' + missingStandard.join(', ') + '.');
      }
    }

    var defaultTr = parseNumber(meta.default_conductor_temp_rating_c);
    if (defaultTr == null || defaultTr <= 0) {
      errors.push('default_conductor_temp_rating_c must be a positive number.');
    }

    var wireType = null;
    if (!errors.length) {
      wireType = buildWireTypeFromParsed(parsed);
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      wireType: wireType,
      metadata: meta
    };
  }

  async function validateWireSpecFile(file, options) {
    var parsed = await parseWireSpecFile(file);
    var result = validateParsedWireSpec(parsed, options);
    result.parsed = parsed;
    return result;
  }

  global.PwaWireDataValidator = {
    parseWireSpecFile: parseWireSpecFile,
    validateParsedWireSpec: validateParsedWireSpec,
    validateWireSpecFile: validateWireSpecFile,
    buildWireTypeFromParsed: buildWireTypeFromParsed
  };
})(typeof window !== 'undefined' ? window : this);
