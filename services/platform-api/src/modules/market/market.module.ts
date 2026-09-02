import { Module } from '@nestjs/common';

import { AuthModule } from '../../core/auth/auth.module.js';
import { DatabaseModule } from '../../core/database/database.module.js';
import { MarketController } from './api/market.controller.js';
import { MARKET_DATA_PROVIDER } from './application/ports/market-data-provider.port.js';
import { MARKET_REPOSITORY } from './application/ports/market-repository.port.js';
import { MarketService } from './application/market.service.js';
import { KisMarketDataAdapter } from './infrastructure/http/kis-market-data.adapter.js';
import { LocalMarketDataAdapter } from './infrastructure/http/local-market-data.adapter.js';
import { DrizzleMarketRepository } from './infrastructure/persistence/drizzle-market.repository.js';

@Module({
  controllers: [MarketController],
  imports: [AuthModule, DatabaseModule],
  providers: [
    MarketService,
    {
      provide: MARKET_DATA_PROVIDER,
      useFactory: () =>
        process.env.MARKET_DATA_PROVIDER?.toUpperCase() === 'KIS'
          ? new KisMarketDataAdapter()
          : new LocalMarketDataAdapter(),
    },
    { provide: MARKET_REPOSITORY, useClass: DrizzleMarketRepository },
  ],
})
export class MarketModule {}
