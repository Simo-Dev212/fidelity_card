import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipsService } from '../memberships/memberships.service';

@Injectable()
export class JoinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membershipsService: MembershipsService,
  ) {}

  /**
   * Resolve company + program from public slugs (NFC link)
   */
  async resolveProgram(companySlug: string, programSlug: string) {
    const company = await this.prisma.company.findFirst({
      where: { slug: companySlug, isActive: true },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const program = await this.prisma.program.findFirst({
      where: {
        companyId: company.id,
        slug: programSlug,
        isActive: true,
      },
    });
    if (!program) {
      throw new NotFoundException('Program not found');
    }

    return { company, program };
  }

  /**
   * After authentication, create membership + Google Wallet pass
   */
  async completeJoin(params: {
    userId: string;
    companySlug: string;
    programSlug: string;
    metadata?: Record<string, any>;
  }) {
    const { company, program } = await this.resolveProgram(
      params.companySlug,
      params.programSlug,
    );

    return this.membershipsService.joinProgram({
      userId: params.userId,
      programId: program.id,
      companyId: company.id,
      metadata: params.metadata,
    });
  }
}
