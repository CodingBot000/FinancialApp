REVOKE CREATE ON SCHEMA public FROM PUBLIC;

CREATE SCHEMA finapp_meta AUTHORIZATION financial_migration;
CREATE SCHEMA finapp_identity AUTHORIZATION financial_migration;
CREATE SCHEMA finapp_mydata AUTHORIZATION financial_migration;
CREATE SCHEMA finapp_wealth AUTHORIZATION financial_migration;
CREATE SCHEMA finapp_simulation AUTHORIZATION financial_migration;
CREATE SCHEMA finapp_trading AUTHORIZATION financial_migration;
CREATE SCHEMA finapp_audit AUTHORIZATION financial_migration;
CREATE SCHEMA finapp_crypto AUTHORIZATION financial_migration;
CREATE SCHEMA finapp_simulator AUTHORIZATION financial_migration;

GRANT USAGE ON SCHEMA
  finapp_identity,
  finapp_mydata,
  finapp_wealth,
  finapp_simulation,
  finapp_trading,
  finapp_audit,
  finapp_crypto
TO financial_platform_app;

GRANT USAGE ON SCHEMA finapp_simulator TO financial_simulator_app;

ALTER DEFAULT PRIVILEGES FOR ROLE financial_migration
  IN SCHEMA finapp_identity, finapp_mydata, finapp_wealth, finapp_simulation,
  finapp_trading, finapp_audit, finapp_crypto
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO financial_platform_app;

ALTER DEFAULT PRIVILEGES FOR ROLE financial_migration
  IN SCHEMA finapp_simulator
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO financial_simulator_app;
