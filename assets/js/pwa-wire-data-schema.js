(function (global) {
  'use strict';

  var SCHEMA_VERSION = '1.0.0';
  var TEMPLATE_VERSION = '1.0';

  var SHEET_NAMES = {
    readme: 'README',
    metadata: 'Metadata',
    awgData: 'AWG_Data',
    resistanceData: 'Resistance_Data',
    temperatureData: 'Temperature_Data',
    deratingData: 'Derating_Data',
    advancedData: 'Advanced_Data',
    validationCases: 'Validation_Cases',
    changeHistory: 'Change_History'
  };

  var STANDARD_AWG_SIZES = [
    '24', '22', '20', '18', '16', '14', '12', '10', '8', '6', '4', '2', '1', '0', '00', '000', '0000'
  ];

  var METADATA_FIELDS = [
    { key: 'wire_spec_name', label: 'Wire specification name', required: true },
    { key: 'wire_type_id', label: 'Wire type ID', required: true },
    { key: 'manufacturer', label: 'Manufacturer', required: true },
    { key: 'part_number_family', label: 'Part number family', required: false },
    { key: 'specification_reference', label: 'Specification reference', required: true },
    { key: 'revision', label: 'Revision', required: true },
    { key: 'issue_date', label: 'Issue date', required: false },
    { key: 'prepared_by', label: 'Prepared by', required: false },
    { key: 'checked_by', label: 'Checked by', required: false },
    { key: 'approved_by', label: 'Approved by', required: false },
    { key: 'source_document_reference', label: 'Source document reference', required: true },
    { key: 'source_document_revision', label: 'Source document revision', required: false },
    { key: 'construction', label: 'Construction description', required: false },
    { key: 'operating_temp_range', label: 'Operating temperature range', required: false },
    { key: 'voltage_rating', label: 'Voltage rating', required: false },
    { key: 'default_conductor_temp_rating_c', label: 'Cable rating temperature T_R (°C)', required: true, numeric: true },
    { key: 'conductor_material', label: 'Conductor material', required: false },
    { key: 'insulation_type', label: 'Insulation type', required: false },
    { key: 'resistance_temp_coeff_basis', label: 'Resistance temperature coefficient basis', required: false },
    { key: 'resistance_reference_temp_c', label: 'Resistance reference temperature (°C)', required: false, numeric: true },
    { key: 'frequency_applicability', label: 'Frequency applicability', required: false },
    { key: 'hz_400_applicable', label: '400 Hz applicable', required: false },
    { key: 'single_phase_applicable', label: 'Single phase applicable', required: false },
    { key: 'three_phase_applicable', label: 'Three phase applicable', required: false },
    { key: 'ambient_temp_basis_c', label: 'Ambient temperature basis (°C or note)', required: false },
    { key: 'installation_temp_basis_c', label: 'Installation temperature basis (°C or note)', required: false },
    { key: 'installation_category', label: 'Installation category', required: false },
    { key: 'data_locked', label: 'DATA_LOCKED (optional — YES when formally approved)', required: false },
    { key: 'notes', label: 'Notes', required: false }
  ];

  var AWG_DATA_COLUMNS = [
    { key: 'awg', label: 'AWG', required: true },
    { key: 'cross_section_mm2', label: 'Cross-sectional area (mm²)', required: false, numeric: true },
    { key: 'strand', label: 'Strand construction', required: false },
    { key: 'conductor_material', label: 'Conductor material', required: false },
    { key: 'conductor_nom_dia_mm', label: 'Conductor nominal diameter (mm)', required: false, numeric: true },
    { key: 'ohm_per_km_20c', label: 'Resistance @ 20 °C (Ω/km)', required: false, numeric: true },
    { key: 'ohm_per_1000ft_20c', label: 'Resistance @ 20 °C (Ω/1000 ft)', required: false, numeric: true },
    { key: 'od_min_mm', label: 'Outside diameter min (mm)', required: false, numeric: true },
    { key: 'od_max_mm', label: 'Outside diameter max (mm)', required: false, numeric: true },
    { key: 'amp_rating_max_a', label: 'Maximum rated current (A)', required: false, numeric: true },
    { key: 'weight_kg_per_km', label: 'Weight (kg/km)', required: false, numeric: true },
    { key: 'max_conductor_temp_c', label: 'Maximum conductor temperature (°C)', required: false, numeric: true },
    { key: 'insulation_type', label: 'Insulation type', required: false },
    { key: 'cable_rating_tr_c', label: 'Cable rating T_R (°C)', required: false, numeric: true },
    { key: 'environmental_notes', label: 'Environmental limitation notes', required: false }
  ];

  var RESISTANCE_DATA_FIELDS = [
    { key: 'resistance_per_metre_basis', label: 'Resistance per metre basis' },
    { key: 'resistance_per_1000ft_basis', label: 'Resistance per 1000 ft basis' },
    { key: 'temp_correction_formula', label: 'Temperature correction formula' },
    { key: 'voltage_drop_coefficient', label: 'Voltage drop coefficient' },
    { key: 'ac_correction_notes', label: 'AC correction data notes' }
  ];

  var TEMPERATURE_DATA_FIELDS = [
    { key: 'ambient_temp_basis', label: 'Ambient temperature basis' },
    { key: 'installation_temp_basis', label: 'Installation temperature basis' },
    { key: 'temp_limit_notes', label: 'Temperature limit notes' },
    { key: 'safety_margin_notes', label: 'Safety margin notes' }
  ];

  var DERATING_DATA_FIELDS = [
    { key: 'bundle_derating_reference', label: 'Bundle derating reference' },
    { key: 'altitude_derating_reference', label: 'Altitude derating reference' },
    { key: 'free_air_rating_reference', label: 'Free-air rating reference' },
    { key: 'bundle_derating_notes', label: 'Bundle derating notes' },
    { key: 'altitude_derating_notes', label: 'Altitude derating notes' }
  ];

  var ADVANCED_DATA_FIELDS = [
    { key: 'wire_ageing_factors', label: 'Wire ageing factors' },
    { key: 'derating_method_references', label: 'Derating method references' },
    { key: 'harness_grouping_assumptions', label: 'Harness grouping assumptions' },
    { key: 'installation_environment_categories', label: 'Installation environment categories' },
    { key: 'external_audit_notes', label: 'External audit notes' },
    { key: 'applicability_limitations', label: 'Applicability limitations' }
  ];

  var VALIDATION_CASE_COLUMNS = [
    'validation_case_id', 'input_description', 'input_values', 'expected_result',
    'tolerance', 'source_reference', 'validation_status'
  ];

  function metadataKeyAliases() {
    return {
      'wire specification name': 'wire_spec_name',
      'wire type id': 'wire_type_id',
      'data_locked': 'data_locked',
      'data locked': 'data_locked',
      'cable rating temperature t_r (°c)': 'default_conductor_temp_rating_c',
      'cable rating temperature tr (c)': 'default_conductor_temp_rating_c'
    };
  }

  function normalizeMetadataKey(raw) {
    var key = String(raw || '').trim().toLowerCase()
      .replace(/[°]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    var aliases = metadataKeyAliases();
    return aliases[key] || key;
  }

  function isDataLockedValue(value) {
    var v = String(value || '').trim().toUpperCase();
    return v === 'YES' || v === 'TRUE' || v === '1' || v === 'LOCKED';
  }

  global.PwaWireDataSchema = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    TEMPLATE_VERSION: TEMPLATE_VERSION,
    SHEET_NAMES: SHEET_NAMES,
    STANDARD_AWG_SIZES: STANDARD_AWG_SIZES,
    METADATA_FIELDS: METADATA_FIELDS,
    AWG_DATA_COLUMNS: AWG_DATA_COLUMNS,
    RESISTANCE_DATA_FIELDS: RESISTANCE_DATA_FIELDS,
    TEMPERATURE_DATA_FIELDS: TEMPERATURE_DATA_FIELDS,
    DERATING_DATA_FIELDS: DERATING_DATA_FIELDS,
    ADVANCED_DATA_FIELDS: ADVANCED_DATA_FIELDS,
    VALIDATION_CASE_COLUMNS: VALIDATION_CASE_COLUMNS,
    normalizeMetadataKey: normalizeMetadataKey,
    isDataLockedValue: isDataLockedValue
  };
})(typeof window !== 'undefined' ? window : this);
