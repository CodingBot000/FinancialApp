import { Module } from '@nestjs/common';

import { AuthModule } from '../../core/auth/auth.module.js';
import { DatabaseModule } from '../../core/database/database.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { TradingController } from './api/trading.controller.js';
import { MARKET_PRICE_PORT } from './application/ports/market-price.port.js';
import { TRADING_REPOSITORY } from './application/ports/trading-repository.port.js';
import { TradingService } from './application/trading.service.js';
import { SimulatorMarketPriceAdapter } from './infrastructure/http/simulator-market-price.adapter.js';
import { DrizzleTradingRepository } from './infrastructure/persistence/drizzle-trading.repository.js';

@Module({
  controllers: [TradingController],
  imports: [AuthModule, DatabaseModule, IdentityModule],
  providers: [
    TradingService,
    { provide: MARKET_PRICE_PORT, useClass: SimulatorMarketPriceAdapter },
    { provide: TRADING_REPOSITORY, useClass: DrizzleTradingRepository },
  ],
})
export class TradingModule {}
