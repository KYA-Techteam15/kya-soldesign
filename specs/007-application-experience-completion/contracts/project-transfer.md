# Contract — Project transfer

## Export

`ProjectTransferService.export(projectId)` MUST:

1. fetch the canonical project from `ProjectSessionPort`;
2. reject a missing or invalid project;
3. serialize `ProjectTransferEnvelopeV1` deterministically;
4. use a filename safe on Windows, macOS and Linux;
5. delegate delivery to `FileTransferPort`;
6. return success only after the platform accepts the delivery.

Suggested filename:

`KYA-SolDesign_<project-number-or-name>_<YYYY-MM-DD>.ksd.json`

## Import

`ProjectTransferService.inspectImport(file)` MUST parse without mutating storage.
It returns one of:

- `valid-new`;
- `valid-conflict` with conflict metadata;
- `invalid` with stable error codes.

`commitImport` requires the inspected result and an explicit decision. A stale
inspection cannot be committed if the local project revision changed.

## Conflict decisions

- `replace`: preserve incoming project ID and replace after confirmation.
- `copy`: regenerate ID, `createdAt`, `updatedAt` and a distinct name.
- `cancel`: perform no write.

If incoming and existing canonical payloads are identical, the UI MAY recommend
cancel but still requires an explicit choice.

## Duplication

Duplication uses the same `copy` transformation as import conflict handling. It
MUST NOT copy UI navigation state or persistence errors.

## Platform port

```ts
interface FileTransferPort {
  readonly capabilities: {
    readonly persistentDirectory: boolean;
    readonly multipleImport: boolean;
  };
  pickTextFile(request: TextFilePickRequest): Promise<PickedTextFile | null>;
  saveTextFile(request: TextFileSaveRequest): Promise<FileSaveResult>;
}
```

The browser adapter uses standard file selection/download. A desktop adapter may
use an authorized directory handle. Paths never enter project documents.

## Error codes

- `PROJECT_EXPORT_NOT_FOUND`
- `PROJECT_EXPORT_INVALID`
- `PROJECT_EXPORT_CANCELLED`
- `PROJECT_IMPORT_UNSUPPORTED_VERSION`
- `PROJECT_IMPORT_INVALID_JSON`
- `PROJECT_IMPORT_INVALID_PROJECT`
- `PROJECT_IMPORT_STALE_INSPECTION`
- `PROJECT_IMPORT_PERSISTENCE_FAILED`

Messages are translated at the UI boundary.
