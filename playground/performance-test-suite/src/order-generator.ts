/**
 * Order Generator Module
 * Generates synthetic CoW Protocol orders for performance testing
 */

import { signOrder, ANVIL_ACCOUNTS, SignedOrder, OrderParams } from './eip712-signer';

export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
}

export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell',
}

export interface TokenPair {
  sellToken: string;
  buyToken: string;
  name: string;
}

export interface OrderConfig {
  tokenPairs: TokenPair[];
  orderTypes: OrderType[];
  minAmount: string;
  maxAmount: string;
  appData?: string;
  chainId?: number;
  settlementContract?: string;
  enableSigning?: boolean;
}

export interface GeneratedOrder {
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  buyAmount: string;
  validTo: number;
  appData: string;
  feeAmount: string;
  kind: 'sell' | 'buy';
  partiallyFillable: boolean;
  sellTokenBalance: 'erc20' | 'external';
  buyTokenBalance: 'erc20' | 'internal';
  signingScheme: 'eip712' | 'ethsign' | 'eip1271' | 'presign';
  from: string;
  receiver?: string;
  signature?: string;
}

export class OrderGenerator {
  private config: OrderConfig;
  private orderCount: number = 0;

  constructor(config: OrderConfig) {
    this.config = config;
  }

  /**
   * Generate a single synthetic order
   */
  generateOrder(
    orderType?: OrderType,
    tokenPair?: TokenPair,
    owner?: string
  ): GeneratedOrder {
    // Select order parameters
    const selectedOrderType = orderType || this.randomChoice(this.config.orderTypes);
    const selectedPair = tokenPair || this.randomChoice(this.config.tokenPairs);
    const selectedOwner = owner || this.generateRandomAddress();

    // Generate amounts
    const minAmount = BigInt(this.config.minAmount);
    const maxAmount = BigInt(this.config.maxAmount);
    const sellAmount = this.randomBigInt(minAmount, maxAmount);

    // For market orders, buy amount has some slippage
    // For limit orders, buy amount is at a specific price
    let buyAmount: bigint;
    if (selectedOrderType === OrderType.MARKET) {
      const slippage = this.randomFloat(0.95, 1.05);
      const buyAmountNum = Math.floor(Number(sellAmount) * slippage);
      buyAmount = buyAmountNum > 0 ? BigInt(buyAmountNum) : BigInt(1);
    } else {
      const price = this.randomFloat(0.98, 1.02);
      const buyAmountNum = Math.floor(Number(sellAmount) * price);
      buyAmount = buyAmountNum > 0 ? BigInt(buyAmountNum) : BigInt(1);
    }

    // Calculate valid_to (5 minutes from now)
    const validTo = Math.floor(Date.now() / 1000) + 300;

    // Generate fee amount (0.1% of sell amount)
    const feeAmount = (sellAmount * BigInt(1)) / BigInt(1000);

    // Build unsigned order
    const receiver = selectedOwner; // Use owner as receiver for POC
    const unsignedOrder: GeneratedOrder = {
      sellToken: selectedPair.sellToken,
      buyToken: selectedPair.buyToken,
      sellAmount: sellAmount.toString(),
      buyAmount: buyAmount.toString(),
      validTo,
      appData: this.config.appData || '0x0000000000000000000000000000000000000000000000000000000000000000',
      feeAmount: feeAmount.toString(),
      kind: 'sell',
      partiallyFillable: false,
      sellTokenBalance: 'erc20',
      buyTokenBalance: 'erc20',
      signingScheme: 'eip712',
      from: selectedOwner,
      receiver,
    };

    this.orderCount++;

    // If signing is enabled, sign the order
    if (this.config.enableSigning) {
      return this.signOrderWithEIP712(unsignedOrder);
    }

    return unsignedOrder;
  }

  /**
   * Sign an order using EIP-712
   */
  private signOrderWithEIP712(order: GeneratedOrder): GeneratedOrder {
    const chainId = this.config.chainId || 31337;
    const settlementContract = this.config.settlementContract || '0x610178dA211FEF7D417bC0e6FeD39F05609AD788';

    // Select a random Anvil account for signing
    const privateKey = ANVIL_ACCOUNTS[this.orderCount % ANVIL_ACCOUNTS.length];

    // Prepare order params for signing
    const orderParams: OrderParams = {
      sellToken: order.sellToken,
      buyToken: order.buyToken,
      receiver: order.receiver || order.from,
      sellAmount: order.sellAmount,
      buyAmount: order.buyAmount,
      validTo: order.validTo,
      appData: order.appData,
      feeAmount: order.feeAmount,
      kind: order.kind,
      partiallyFillable: order.partiallyFillable,
      sellTokenBalance: order.sellTokenBalance,
      buyTokenBalance: order.buyTokenBalance,
    };

    // Sign the order
    const signedOrder = signOrder(privateKey, chainId, settlementContract, orderParams);

    // Return signed order with all fields
    return {
      ...order,
      from: signedOrder.from,
      signature: signedOrder.signature,
      signingScheme: signedOrder.signingScheme as any,
    };
  }

  /**
   * Generate a batch of orders
   */
  generateBatch(count: number): GeneratedOrder[] {
    const orders: GeneratedOrder[] = [];
    for (let i = 0; i < count; i++) {
      orders.push(this.generateOrder());
    }
    return orders;
  }

  /**
   * Get generator statistics
   */
  getStats() {
    return {
      totalOrdersGenerated: this.orderCount,
      availablePairs: this.config.tokenPairs.length,
    };
  }

  // Utility methods
  private randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private randomBigInt(min: bigint, max: bigint): bigint {
    const range = max - min;
    const randomValue = BigInt(Math.floor(Math.random() * Number(range)));
    return min + randomValue;
  }

  private randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private generateRandomAddress(): string {
    const hex = '0123456789abcdef';
    let address = '0x';
    for (let i = 0; i < 40; i++) {
      address += hex[Math.floor(Math.random() * hex.length)];
    }
    return address;
  }
}
