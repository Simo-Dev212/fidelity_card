import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { v4 as uuidv4 } from 'uuid';
import {
  MembershipStatus,
  ProgramType,
  LoyaltyEventType,
} from '@prisma/client';

@Injectable()
export class MembershipsService {
  private readonly logger = new Logger(MembershipsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  /**
   * Core join logic:
   * - Generate unique never-reused walletId / serialNumber
   * - Create Membership
   * - Record JOIN history
   * - Create Google Wallet pass
   * - Return saveUrl
   */
  async joinProgram(params: {
    userId: string;
    programId: string;
    companyId: string;
    metadata?: Record<string, any>;
  }) {
    const { userId, programId, companyId, metadata = {} } = params;

    // Ensure program belongs to company and is active
    const program = await this.prisma.program.findFirst({
      where: { id: programId, companyId, isActive: true },
      include: { company: true },
    });
    if (!program) {
      throw new NotFoundException('Program not found or inactive');
    }

    // Already member?
    const existing = await this.prisma.membership.findUnique({
      where: { userId_programId: { userId, programId } },
      include: { walletPass: true },
    });
    if (existing) {
      // Re-create pass if missing
      const result = await this.walletService.createPassForMembership(existing.id);
      return {
        membership: existing,
        saveUrl: result.saveUrl,
        alreadyMember: true,
      };
    }

    // Generate unique walletId (UUID without dashes + short prefix for readability)
    const walletId = `LW-${uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase()}`;

    const membership = await this.prisma.membership.create({
      data: {
        walletId,
        userId,
        programId,
        companyId,
        balance: 0,
        status: MembershipStatus.ACTIVE,
        metadata,
      },
      include: {
        program: true,
        company: true,
        user: true,
      },
    });

    // Audit trail
    await this.loyaltyService.recordEvent({
      membershipId: membership.id,
      companyId,
      type: LoyaltyEventType.JOIN,
      amount: 0,
      previousBalance: 0,
      newBalance: 0,
      reason: 'User joined the program via NFC / join link',
      actorType: 'user',
      actorId: userId,
    });

    // Create Google Wallet pass
    const { saveUrl } = await this.walletService.createPassForMembership(
      membership.id,
    );

    this.logger.log(
      `New membership ${membership.id} (walletId=${walletId}) → saveUrl generated`,
    );

    return {
      membership,
      saveUrl,
      alreadyMember: false,
    };
  }

  async findByWalletId(walletId: string) {
    return this.prisma.membership.findUnique({
      where: { walletId },
      include: {
        program: true,
        company: true,
        user: true,
        walletPass: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.membership.findUnique({
      where: { id },
      include: {
        program: true,
        company: true,
        user: true,
        walletPass: true,
      },
    });
  }
}
