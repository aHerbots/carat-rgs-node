import {
  dinero,
  add,
  subtract,
  multiply,
  toUnits,
  toSnapshot,
  greaterThan,
  greaterThanOrEqual,
  lessThan,
  lessThanOrEqual,
  equal,
  type Dinero,
} from 'dinero.js';
import { EUR } from '@dinero.js/currencies';

/**
 * Money utility class to handle integer-based currency operations.
 * Wraps dinero.js for robust monetary math.
 */
export class Money {
  private readonly d: Dinero<number>;

  private constructor(d: Dinero<number>) {
    this.d = d;
  }

  /**
   * Create a Money instance from minor units (e.g., cents).
   */
  static fromMinor(amount: number): Money {
    return new Money(dinero({ amount: Math.floor(amount), currency: EUR }));
  }

  /**
   * Create a Money instance from major units (e.g., euros).
   */
  static fromMajor(amount: number): Money {
    // EUR has 2 decimal places (exponent 2)
    return new Money(dinero({ amount: Math.floor(amount * 100), currency: EUR }));
  }

  add(other: Money): Money {
    return new Money(add(this.d, other.d));
  }

  subtract(other: Money): Money {
    return new Money(subtract(this.d, other.d));
  }

  multiply(factor: number): Money {
    return new Money(multiply(this.d, factor));
  }

  divide(divisor: number): Money {
    // Dinero v2 alpha doesn't have a direct 'divide' export.
    // Usually you multiply by the reciprocal or use allocate for even distribution.
    // For simple scaling, we'll multiply by (1 / divisor).
    return new Money(multiply(this.d, 1 / divisor));
  }

  greaterThan(other: Money): boolean {
    return greaterThan(this.d, other.d);
  }

  greaterThanOrEqual(other: Money): boolean {
    return greaterThanOrEqual(this.d, other.d);
  }

  lessThan(other: Money): boolean {
    return lessThan(this.d, other.d);
  }

  lessThanOrEqual(other: Money): boolean {
    return lessThanOrEqual(this.d, other.d);
  }

  equal(other: Money): boolean {
    return equal(this.d, other.d);
  }

  /**
   * Returns the amount in minor units (e.g., cents).
   */
  toMinor(): number {
    return toSnapshot(this.d).amount;
  }

  /**
   * Returns the amount in major units (e.g., euros).
   */
  toMajor(): number {
    const units = toUnits(this.d);
    // for EUR, units[0] is euros, units[1] is cents
    return (units[0] as number) + (units[1] as number) / 100;
  }

  toString(): string {
    return `${this.toMajor().toFixed(2)} EUR`;
  }
}
