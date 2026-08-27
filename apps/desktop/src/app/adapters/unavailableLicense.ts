import type { LicensePort } from '../contracts.js';

export const unavailableLicense: LicensePort = { readState: async () => ({ status: 'unconfigured' }) };
