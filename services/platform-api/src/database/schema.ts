import { pgSchema } from 'drizzle-orm/pg-core';

export const finappMetaSchema = pgSchema('finapp_meta');
export const finappIdentitySchema = pgSchema('finapp_identity');
export const finappMyDataSchema = pgSchema('finapp_mydata');
export const finappWealthSchema = pgSchema('finapp_wealth');
export const finappSimulationSchema = pgSchema('finapp_simulation');
export const finappTradingSchema = pgSchema('finapp_trading');
export const finappAuditSchema = pgSchema('finapp_audit');
export const finappCryptoSchema = pgSchema('finapp_crypto');
