import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuth } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';
import type {
  WalletProvider,
  CreatePassResult,
  UpdatePassResult,
} from './wallet-provider.interface';
import { Membership, Program, Company, User } from '@prisma/client';

type FullMembership = Membership & {
  program: Program;
  company: Company;
  user: User;
};

/**
 * Google Wallet Loyalty Provider
 * ------------------------------
 * Implements the WalletProvider interface for Google Wallet.
 *
 * Requires:
 * - GOOGLE_WALLET_ISSUER_ID
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL
 * - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (PEM, newlines as \n)
 * - Optional: GOOGLE_WALLET_CLASS_SUFFIX (defaults to "loyalty")
 *
 * Flow:
 * 1. Ensure LoyaltyClass exists (or create once per program)
 * 2. Create / update LoyaltyObject for the membership
 * 3. Sign a JWT that the client uses as "Save to Google Wallet" link
 *
 * Docs: https://developers.google.com/wallet/retail/loyalty-cards
 */
@Injectable()
export class GoogleWalletProvider implements WalletProvider {
  readonly providerName = 'GOOGLE' as const;
  private readonly logger = new Logger(GoogleWalletProvider.name);
  private readonly issuerId: string;
  private readonly serviceAccountEmail: string;
  private readonly privateKey: string;
  private readonly classSuffix: string;
  private auth: GoogleAuth | null = null;

  constructor(private readonly config: ConfigService) {
    this.issuerId = this.config.getOrThrow<string>('GOOGLE_WALLET_ISSUER_ID');
    this.serviceAccountEmail = this.config.getOrThrow<string>(
      'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    );
    // Private key often comes with escaped newlines
    this.privateKey = this.config
      .getOrThrow<string>('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')
      .replace(/\\n/g, '\n');
    this.classSuffix =
      this.config.get<string>('GOOGLE_WALLET_CLASS_SUFFIX') || 'loyalty';
  }

  private getAuthClient(): GoogleAuth {
    if (!this.auth) {
      this.auth = new GoogleAuth({
        credentials: {
          client_email: this.serviceAccountEmail,
          private_key: this.privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
      });
    }
    return this.auth;
  }

  private getClassId(program: Program): string {
    // Unique per program so each company/program can have its own design
    return `${this.issuerId}.${program.companyId}_${program.id}_${this.classSuffix}`;
  }

  private getObjectId(membership: Membership): string {
    // walletId is already unique and never reused
    return `${this.issuerId}.${membership.walletId}`;
  }

  /**
   * Build the LoyaltyClass payload (design driven by Company + Program branding)
   */
  private buildClassPayload(membership: FullMembership) {
    const { program, company } = membership;
    const classId = this.getClassId(program);

    const hexToRgb = (hex?: string | null) => {
      if (!hex) return { red: 0.29, green: 0.05, blue: 0.48 }; // BigDwich purple default
      const h = hex.replace('#', '');
      return {
        red: parseInt(h.substring(0, 2), 16) / 255,
        green: parseInt(h.substring(2, 4), 16) / 255,
        blue: parseInt(h.substring(4, 6), 16) / 255,
      };
    };

    const primary = hexToRgb(program.primaryColor || company.primaryColor);
    const logo =
      program.logoUrl ||
      company.logoUrl ||
      'https://via.placeholder.com/200x200.png?text=Logo';

    return {
      id: classId,
      issuerName: company.name,
      reviewStatus: 'UNDER_REVIEW', // change to APPROVED after Google review in prod
      programName: program.name,
      programLogo: {
        sourceUri: { uri: logo },
        contentDescription: { defaultValue: { language: 'fr', value: company.name } },
      },
      hexBackgroundColor: program.primaryColor || company.primaryColor || '#4B0E7A',
      // Optional hero image
      ...(program.heroImageUrl || company.heroImageUrl
        ? {
            heroImage: {
              sourceUri: {
                uri: program.heroImageUrl || company.heroImageUrl,
              },
            },
          }
        : {}),
      // Text modules can be used for program description
      textModulesData: [
        {
          header: 'Programme',
          body: program.description || `Fidélité ${company.name}`,
          id: 'program_info',
        },
      ],
    };
  }

  /**
   * Build the LoyaltyObject payload (per user membership)
   */
  private buildObjectPayload(membership: FullMembership) {
    const { program, company, user } = membership;
    const objectId = this.getObjectId(membership);
    const classId = this.getClassId(program);

    const isStamps = program.type === 'STAMPS';
    const settings = (program.settings as any) || {};

    // Loyalty points or stamp count
    const balanceLabel = isStamps ? 'Tampons' : 'Points';
    const balanceValue = String(membership.balance);

    return {
      id: objectId,
      classId,
      state: 'ACTIVE',
      accountId: membership.walletId,
      accountName: user.name || user.email,
      loyaltyPoints: {
        label: balanceLabel,
        balance: {
          string: balanceValue,
        },
      },
      // Optional barcode / QR for in-store scanning
      barcode: {
        type: 'QR_CODE',
        value: membership.walletId,
        alternateText: membership.walletId,
      },
      // Text modules for extra info
      textModulesData: [
        {
          header: 'Membre depuis',
          body: new Date(membership.joinedAt).toLocaleDateString('fr-FR'),
          id: 'joined',
        },
      ],
      // Link back to the app / website if available
      ...(company.website
        ? {
            linksModuleData: {
              uris: [
                {
                  uri: company.website,
                  description: company.name,
                  id: 'website',
                },
              ],
            },
          }
        : {}),
    };
  }

  /**
   * Create or update the LoyaltyClass (idempotent)
   */
  private async ensureClass(membership: FullMembership): Promise<void> {
    const auth = this.getAuthClient();
    const client = await auth.getClient();
    const classId = this.getClassId(membership.program);
    const url = `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${classId}`;

    try {
      // Try GET first
      await client.request({ url, method: 'GET' });
      this.logger.debug(`LoyaltyClass already exists: ${classId}`);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        // Create
        const payload = this.buildClassPayload(membership);
        await client.request({
          url: 'https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass',
          method: 'POST',
          data: payload,
        });
        this.logger.log(`Created LoyaltyClass: ${classId}`);
      } else {
        throw err;
      }
    }
  }

  /**
   * Create the LoyaltyObject
   */
  private async createObject(membership: FullMembership): Promise<string> {
    const auth = this.getAuthClient();
    const client = await auth.getClient();
    const payload = this.buildObjectPayload(membership);

    await client.request({
      url: 'https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject',
      method: 'POST',
      data: payload,
    });

    this.logger.log(`Created LoyaltyObject: ${payload.id}`);
    return payload.id;
  }

  /**
   * Update existing LoyaltyObject (balance change)
   */
  private async patchObject(membership: FullMembership): Promise<void> {
    const auth = this.getAuthClient();
    const client = await auth.getClient();
    const objectId = this.getObjectId(membership);
    const payload = this.buildObjectPayload(membership);

    await client.request({
      url: `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${objectId}`,
      method: 'PATCH',
      data: payload,
    });

    this.logger.log(`Updated LoyaltyObject: ${objectId}`);
  }

  /**
   * Generate the signed JWT "Save to Google Wallet" link
   * https://developers.google.com/wallet/generic/web#jwt
   */
  private generateSaveUrl(membership: FullMembership): string {
    const classId = this.getClassId(membership.program);
    const objectId = this.getObjectId(membership);

    const claims = {
      iss: this.serviceAccountEmail,
      aud: 'google',
      typ: 'savetowallet',
      iat: Math.floor(Date.now() / 1000),
      payload: {
        loyaltyClasses: [{ id: classId }],
        loyaltyObjects: [{ id: objectId }],
      },
      origins: [], // optional: restrict origins
    };

    const token = jwt.sign(claims, this.privateKey, {
      algorithm: 'RS256',
    });

    return `https://pay.google.com/gp/v/save/${token}`;
  }

  // ─────────────────────────────────────────────
  // Public interface implementation
  // ─────────────────────────────────────────────

  async createPass(membership: FullMembership): Promise<CreatePassResult> {
    await this.ensureClass(membership);
    const externalId = await this.createObject(membership);
    const saveUrl = this.generateSaveUrl(membership);

    return { saveUrl, externalId };
  }

  async updatePass(membership: FullMembership): Promise<UpdatePassResult> {
    await this.patchObject(membership);
    return {
      success: true,
      externalId: this.getObjectId(membership),
    };
  }

  async revokePass(membership: Membership): Promise<void> {
    const auth = this.getAuthClient();
    const client = await auth.getClient();
    const objectId = this.getObjectId(membership);

    await client.request({
      url: `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${objectId}`,
      method: 'PATCH',
      data: { state: 'INACTIVE' },
    });

    this.logger.log(`Revoked LoyaltyObject: ${objectId}`);
  }
}
