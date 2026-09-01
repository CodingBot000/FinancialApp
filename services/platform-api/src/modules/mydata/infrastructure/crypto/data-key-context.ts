import type { DataKeyContext } from '../../application/ports/data-key-provider.port.js';

export function customerIdentifierContext(ownerId: string): DataKeyContext {
  return {
    application: 'financial-app',
    schema: 'finapp_mydata',
    table: 'finapp_institution_connection',
    column: 'external_customer_id_ciphertext',
    scopeType: 'USER',
    scopeId: ownerId,
  };
}

export function serializeDataKeyContext(context: DataKeyContext): Buffer {
  return Buffer.from(
    [
      context.application,
      context.schema,
      context.table,
      context.column,
      context.scopeType,
      context.scopeId,
    ].join('|'),
    'utf8',
  );
}
