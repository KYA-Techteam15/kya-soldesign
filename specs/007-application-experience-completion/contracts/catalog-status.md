# Contract — Catalog status and filtering

## Status authority

`CatalogProvider` is the sole UI authority for catalog loading, data and summary.
Home and Catalog consume the same discriminated status. A route MUST NOT compute
or cache a competing summary.

## Metadata

The ready state exposes:

- accepted counts by canonical equipment kind;
- quarantined counts by kind;
- warning count;
- locality and weather source counts;
- optional catalog version;
- optional generation date;
- source label.

Unknown metadata remains null and is displayed as unknown. Application version
MUST NOT substitute for catalog version.

## Filter descriptors

| Tab | Primary quantity | Categorical filters | Voltage |
|---|---|---|---|
| Modules | nominal power, Wc | manufacturer, technology | Vmp, V |
| Batteries | nominal capacity, Ah | manufacturer, technology | nominal voltage, V |
| Inverters | nominal AC power, W | manufacturer, inverter type | nominal DC voltage, V |

No regulation filter exists until the canonical inverter schema contains an
approved regulation property.

## Dependency behavior

For each selectable filter, options are computed by applying query and all other
active filters except the filter itself. Numeric bounds apply to their canonical
quantity. Null categorical values map to one translated sentinel; null numeric
values fail an active numeric bound.

## Pagination behavior

- Default page size remains 60 unless a separate UX decision changes it.
- Query, tab or filter changes reset to page 1.
- Result count always refers to the full filtered set.
- Current page clamps to the last valid page after data changes.
- No valid result is hidden without pagination controls and total count.

## Provenance behavior

Each row provides an accessible disclosure or details region containing at least
the source identifier already present in canonical provenance. `title` MAY remain
as an enhancement but MUST NOT be the only access path.
