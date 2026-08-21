import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PKPass } from 'passkit-generator';
import * as fs from 'fs';
import * as path from 'path';
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

@Injectable()
export class AppleWalletProvider implements WalletProvider {
  readonly providerName = 'APPLE' as const;
  private readonly logger = new Logger(AppleWalletProvider.name);
  private readonly passTypeIdentifier: string;
  private readonly teamIdentifier: string;
  private readonly modelDir: string;
  /** Public so WalletController can report status */
  certificates: {
    signerCert: string;
    signerKey: string;
    wwdr: string;
    signerKeyPassphrase?: string;
  } | null = null;

  constructor(private readonly config: ConfigService) {
    this.passTypeIdentifier =
      this.config.get<string>('APPLE_PASS_TYPE_IDENTIFIER') ||
      'pass.com.bigdwich.loyalty';
    this.teamIdentifier =
      this.config.get<string>('APPLE_TEAM_IDENTIFIER') || 'BIGDWH01';
    this.modelDir = path.join(
      fs.realpathSync(process.cwd()),
      '.apple-pass-model.pass',
    );
    this.loadCertificates();
    this.ensureModel();
  }

  private tryReadFile(p?: string): string | undefined {
    if (!p) return undefined;
    try {
      return fs.readFileSync(p, 'utf-8');
    } catch {
      return undefined;
    }
  }

  private loadCertificates() {
    const signerCert =
      this.config.get<string>('APPLE_SIGNER_CERT_PEM') ||
      this.tryReadFile(this.config.get<string>('APPLE_SIGNER_CERT_PATH'));
    const signerKey =
      this.config.get<string>('APPLE_SIGNER_KEY_PEM') ||
      this.tryReadFile(this.config.get<string>('APPLE_SIGNER_KEY_PATH'));
    const wwdr =
      this.config.get<string>('APPLE_WWDR_CERT_PEM') ||
      this.tryReadFile(this.config.get<string>('APPLE_WWDR_CERT_PATH'));
    const passphrase = this.config.get<string>('APPLE_SIGNER_KEY_PASSPHRASE');

    if (signerCert && signerKey && wwdr) {
      this.certificates = {
        signerCert,
        signerKey,
        wwdr,
        signerKeyPassphrase: passphrase,
      };
      this.logger.log('Apple Wallet certificates loaded — real device install OK');
    } else {
      this.logger.warn(
        'Apple Wallet certs missing — .pkpass will NOT install on real iPhones. ' +
          'Set APPLE_SIGNER_CERT_PEM / APPLE_SIGNER_KEY_PEM / APPLE_WWDR_CERT_PEM. ' +
          'Clients can still use the on-screen QR for staff scan.',
      );
    }
  }

  private ensureModel() {
    if (!fs.existsSync(this.modelDir)) {
      fs.mkdirSync(this.modelDir, { recursive: true });
    }
    const basePass = {
      formatVersion: 1,
      passTypeIdentifier: this.passTypeIdentifier,
      teamIdentifier: this.teamIdentifier,
      organizationName: 'BigDwich',
      description: 'Carte Fidélité',
      serialNumber: 'PLACEHOLDER',
      backgroundColor: 'rgb(75,14,122)',
      foregroundColor: 'rgb(255,255,255)',
      labelColor: 'rgb(0,212,200)',
      logoText: 'BigDwich',
      storeCard: {
        primaryFields: [] as unknown[],
        secondaryFields: [] as unknown[],
        auxiliaryFields: [] as unknown[],
        backFields: [] as unknown[],
      },
    };
    fs.writeFileSync(
      path.join(this.modelDir, 'pass.json'),
      JSON.stringify(basePass),
    );
  }

  private isValidImageUrl(url?: string | null): boolean {
    if (!url || !url.startsWith('https://')) return false;
    if (url.includes('placeholder.com') || url.includes('via.placeholder'))
      return false;
    if (url.includes('imgur.com/a/')) return false;
    return true;
  }

  private hexToRgb(hex: string): string {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.slice(0, 2), 16) || 0;
    const g = parseInt(clean.slice(2, 4), 16) || 0;
    const b = parseInt(clean.slice(4, 6), 16) || 0;
    return `rgb(${r},${g},${b})`;
  }

  private buildFields(membership: FullMembership) {
    const { program, company, user } = membership;
    const settings = (program.settings as Record<string, unknown>) || {};
    const isStamps = program.type === 'STAMPS';
    const stampsRequired =
      typeof settings.stampsRequired === 'number' ? settings.stampsRequired : 5;
    const safeBalance = Number.isFinite(Number(membership.balance))
      ? Number(membership.balance)
      : 0;
    const balanceValue = isStamps
      ? `${safeBalance}/${stampsRequired}`
      : String(Math.max(0, Math.floor(safeBalance)));
    const balanceLabel = isStamps ? 'Tampons' : 'Points';
    const rewardBody =
      typeof settings.rewardDescription === 'string'
        ? settings.rewardDescription
        : isStamps
          ? `${stampsRequired} tampons = récompense`
          : 'Échange tes points contre des récompenses';
    const joinedDate = new Date(membership.joinedAt).toLocaleDateString('fr-FR');
    return {
      primaryFields: [
        { key: 'balance', label: balanceLabel, value: balanceValue },
      ],
      secondaryFields: [
        { key: 'walletId', label: 'ID', value: membership.walletId },
      ],
      auxiliaryFields: [
        {
          key: 'member',
          label: 'Membre',
          value: user.name || user.email || '—',
        },
        { key: 'joined', label: 'Depuis', value: joinedDate },
      ],
      backFields: [
        {
          key: 'program',
          label: 'Programme',
          value: program.description || program.name,
        },
        { key: 'reward', label: 'Récompense', value: rewardBody },
        ...(company.website
          ? [{ key: 'website', label: 'Site', value: company.website }]
          : []),
      ],
    };
  }

  async buildPass(membership: FullMembership): Promise<PKPass> {
    if (!this.certificates) {
      throw new Error(
        'Apple Developer certificates not configured. Cannot sign .pkpass for real iPhone install.',
      );
    }

    const { program, company } = membership;
    const bg = this.hexToRgb(
      program.primaryColor || company.primaryColor || '#4B0E7A',
    );
    const label = this.hexToRgb(
      program.secondaryColor || company.secondaryColor || '#00D4C8',
    );

    const pass = await PKPass.from({
      model: this.modelDir,
      certificates: this.certificates as any,
    });

    pass.props.passTypeIdentifier = this.passTypeIdentifier;
    pass.props.teamIdentifier = this.teamIdentifier;
    pass.props.organizationName = company.name;
    pass.props.description = `Carte Fidélité ${company.name}`;
    pass.props.serialNumber = membership.walletId;
    pass.props.backgroundColor = bg;
    pass.props.foregroundColor = 'rgb(255,255,255)';
    pass.props.labelColor = label;
    pass.props.logoText = company.name;

    const fields = this.buildFields(membership);
    pass.primaryFields.push(...fields.primaryFields);
    pass.secondaryFields.push(...fields.secondaryFields);
    pass.auxiliaryFields.push(...fields.auxiliaryFields);
    pass.backFields.push(...fields.backFields);

    pass.setBarcodes({
      message: `loyalty:${membership.walletId}`,
      format: 'PKBarcodeFormatQR',
      altText: membership.walletId,
    });

    const logoUrl = program.logoUrl || company.logoUrl;
    if (this.isValidImageUrl(logoUrl)) {
      try {
        const res = await fetch(logoUrl as string);
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          pass.addBuffer('logo.png', buf);
          pass.addBuffer('icon.png', buf);
        }
      } catch (err: any) {
        this.logger.warn(`Could not fetch logo ${logoUrl}: ${err.message}`);
      }
    }

    return pass;
  }

  async generatePkpassBuffer(membership: FullMembership): Promise<Buffer> {
    const pass = await this.buildPass(membership);
    return pass.getAsBuffer();
  }

  private downloadUrl(membershipId: string): string {
    return `/wallet/apple/${membershipId}/download`;
  }

  async createPass(membership: FullMembership): Promise<CreatePassResult> {
    return {
      saveUrl: this.downloadUrl(membership.id),
      externalId: membership.walletId,
    };
  }

  async updatePass(membership: FullMembership): Promise<UpdatePassResult> {
    this.logger.log(`Apple pass ready for re-download: ${membership.walletId}`);
    return { success: true, externalId: membership.walletId };
  }

  getSaveUrl(membership: FullMembership): string {
    return this.downloadUrl(membership.id);
  }

  async revokePass(membership: Membership): Promise<void> {
    this.logger.log(`Apple pass revocation noted for ${membership.walletId}`);
  }
}
