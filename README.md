# KYA SolDesign Next

Autonomous, specification-driven successor to KYA SolDesign.

The repository is intentionally self-contained. The existing Python product and the validated React design may be inspected during migration, but no production module can import or load files from them.

## Bootstrap

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm verify
pnpm dev
```

## Development model

- Product intent lives in `ROADMAP.md` and `specs/`.
- Non-negotiable engineering rules live in `.specify/memory/constitution.md`.
- Pure calculations live in `packages/engine`.
- Runtime validation and unit-safe contracts live in `packages/domain`.
- Phase completion is controlled by `pnpm verify:phase`; feature completion by `pnpm verify` and Spec Kit convergence.

No result shown by the product may originate from a UI fixture or an implicit fallback.

