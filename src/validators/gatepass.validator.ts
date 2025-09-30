import { z } from 'zod';

export const scanQRSchema = z.object({
  qrData: z.string(),
  entryType: z.enum(['inward', 'outward']),
  location: z.string().optional(),
  notes: z.string().optional(),
});
