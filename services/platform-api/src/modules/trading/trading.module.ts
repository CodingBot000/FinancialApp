import { Module } from '@nestjs/common';

import { AuthModule } from '../../core/auth/auth.module.js';
import { DatabaseModule } from '../../core/database/database.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { TradingController } from './api/trading.controller.js';
import { ReconciliationSchedulerService } from './application/reconciliation-scheduler.service.js';
import { OutboxSchedulerService } from './application/outbox-scheduler.service.js';
import { OUTBOX_PUBLISHER } from './application/ports/outbox-publisher.port.js';
import { BROKERAGE_PORT } from './application/ports/brokerage.port.js';
import { MARKET_PRICE_PORT } from './application/ports/market-price.port.js';
import { TRADING_REPOSITORY } from './application/ports/trading-repository.port.js';
import { TradingService } from './application/trading.service.js';
import { SimulatorMarketPriceAdapter } from './infrastructure/http/simulator-market-price.adapter.js';
import { SimulatorBrokerageAdapter } from './infrastructure/http/simulator-brokerage.adapter.js';
import { DrizzleTradingRepository } from './infrastructure/persistence/drizzle-trading.repository.js';
import { LocalOutboxPublisher } from './infrastructure/persistence/local-outbox.publisher.js';

@Module({
  controllers: [TradingController],
  imports: [AuthModule, DatabaseModule, IdentityModule],
  providers: [
    TradingService,
    ReconciliationSchedulerService,
    OutboxSchedulerService,
    { provide: BROKERAGE_PORT, useClass: SimulatorBrokerageAdapter },
    { provide: MARKET_PRICE_PORT, useClass: SimulatorMarketPriceAdapter },
    { provide: TRADING_REPOSITORY, useClass: DrizzleTradingRepository },
    { provide: OUTBOX_PUBLISHER, useClass: LocalOutboxPublisher },
  ],
})
export class TradingModule {}
