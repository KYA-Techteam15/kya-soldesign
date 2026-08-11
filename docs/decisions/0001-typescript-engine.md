# ADR-0001: Pure TypeScript calculation engine

**Status**: accepted  
**Date**: 2026-08-11

## Decision

Implement all production calculations in a pure TypeScript package. Host long-running calculations in a Web Worker when necessary. Keep the public engine contract independent of the host.

## Consequences

- UI and engine share versioned types without a Python sidecar.
- Browser, desktop, and test environments execute the same logic.
- Scientific models unavailable in the TypeScript ecosystem require explicit implementation and stronger validation.
- Rust/WASM remains a profiling-driven escape hatch, not an initial dependency.

