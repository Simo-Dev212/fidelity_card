/**
 * WalletProvider Abstraction
 * ==========================
 * Critical architecture piece for multi-provider support.
 *
 * Phase 1: GoogleWalletProvider implements this interface.
 * Phase 2 (later): AppleWalletProvider implements the exact same interface.
 *
 * Controllers / services only depend on WalletProvider (injected via token).
 * Adding Apple later = implement the interface + register the provider.
 * No changes needed in MembershipService, JoinService, WebhookService, etc.
 */

import { Membership } from '@prisma/client';

export interface CreatePassResult {
  /** The "Save to Google Wallet" / Apple Wallet URL or JWT link the user opens */
  saveUrl: string;
  /** Provider-specific external identifier (Google LoyaltyObject id, Apple serialNumber, ...) */
  externalId: string;
}

export interface UpdatePassResult {
  success: boolean;
  externalId: string;
}

/**
 * Common interface every wallet provider must implement.
 *
 * The Membership object already contains:
 * - walletId (unique serial)
 * - balance / stamps
 * - program (type, settings, branding)
 * - company (logo, colors, name)
 * - user (name, email)
 *
 * Providers are responsible for mapping that into the native pass format
 * and calling the respective API (Google Wallet API / Apple Wallet / PassKit).
 */
export interface WalletProvider {
  /**
   * Create a new loyalty pass for the membership and return the save URL.
   * Called once after successful signup / join.
   */
  createPass(membership: Membership & {
    program: any;
    company: any;
    user: any;
  }): Promise<CreatePassResult>;

  /**
   * Push an update to an existing pass (balance change, status, design…).
   * Called automatically after every LoyaltyHistory event that changes balance.
   */
  updatePass(membership: Membership & {
    program: any;
    company: any;
    user: any;
  }): Promise<UpdatePassResult>;

  /**
   * Optional: revoke / invalidate the pass (e.g. membership suspended).
   */
  revokePass?(membership: Membership): Promise<void>;
  /**
   * Always generate a FRESH "Save to Wallet" URL/JWT.
   * Do not return a previously stored saveUrl — JWTs should be regenerated on each request.
   */
  getSaveUrl(membership: Membership & {
    program: any;
    company: any;
    user: any;
  }): string;
  /**
   * Provider name for logging / WalletPass.provider enum.
   */
  readonly providerName: 'GOOGLE' | 'APPLE';
}

/**
 * Injection token used throughout the app.
 * In WalletModule we bind GoogleWalletProvider to this token.
 * Later we can make it dynamic (per company preference) or multi-provider.
 */
export const WALLET_PROVIDER = Symbol('WALLET_PROVIDER');
