# Legacy migration register

The former Python application is evidence of product intent, not a normative calculation source.

## Known behaviors that must not be ported

- `new_optimization_service.py` forcibly replaces calculated degradation with zero.
- The former coverage variants scale PV/storage quantities while retaining copied financial and reliability indicators.
- Cable sizing paths contain placeholder current-density and correction-factor behavior.
- Financial parameters and currency services exist in duplicated forms.
- TMY, load, and wizard state have competing sources of truth.
- Grid-tied and PV-diesel state models are incomplete stubs.
- Existing equipment data contains significant missing or non-discriminating fields, including absent battery cycle life and limited inverter parallel/overload data.

## Migration classification

Every migrated artifact must be classified as one of:

- `adopt`: validated behavior or data with adequate provenance;
- `transform`: useful source requiring a documented schema conversion;
- `compare-only`: legacy output used only to measure intentional differences;
- `reject`: placeholder, duplicate, unused, or scientifically unsupported behavior.

The migration tool must emit counts, rejected records, warnings, source hashes, and a normalized output manifest. It must never invent values for missing technical fields.

