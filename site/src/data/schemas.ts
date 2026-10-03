// JSON output contracts, generated from the application's own Zod schemas.
import { z } from 'zod';
import { EventSchema, ExportOperationSchema, RecordedDecisionSchema } from '../../../src/domain.ts';

export const outputs = {
  decision: {
    command: 'boardroom decision --json',
    schema: z.toJSONSchema(RecordedDecisionSchema),
  },
  history: {
    command: 'boardroom history --json',
    schema: z.toJSONSchema(z.object({ events: z.array(EventSchema), operations: z.array(ExportOperationSchema) })),
  },
};
