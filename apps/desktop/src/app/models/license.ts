export type LicenseState =
  | { readonly status: 'unconfigured' }
  | { readonly status: 'checking' }
  | { readonly status: 'active'; readonly edition: string; readonly expiresAtIso: string | null }
  | { readonly status: 'expired'; readonly edition: string; readonly expiredAtIso: string }
  | { readonly status: 'inactive'; readonly reasonKey: string }
  | { readonly status: 'error'; readonly code: string; readonly retryable: boolean };
