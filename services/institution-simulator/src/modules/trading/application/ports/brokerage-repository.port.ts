import type { ScenarioMode } from '../../../scenario/domain/scenario-mode.js';
import type {
  BrokerageOrderRequest,
  BrokerageOrderView,
} from '../../domain/brokerage-order.js';

export const BROKERAGE_REPOSITORY = Symbol('BROKERAGE_REPOSITORY');

export interface BrokerageRepository {
  find(clientOrderId: string): Promise<BrokerageOrderView | undefined>;
  submit(
    request: BrokerageOrderRequest,
    requestHash: string,
    scenarioMode: ScenarioMode,
  ): Promise<
    | {
        readonly kind: 'accepted';
        readonly created: boolean;
        readonly order: BrokerageOrderView;
      }
    | { readonly kind: 'conflict' }
    | { readonly kind: 'not_found' }
  >;
}
