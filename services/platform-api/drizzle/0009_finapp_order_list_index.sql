DROP INDEX "finapp_trading"."finapp_idx_order_user_created";

CREATE INDEX "finapp_idx_order_user_created"
  ON "finapp_trading"."finapp_trade_order" ("user_id", "created_at" DESC, "id" DESC);
