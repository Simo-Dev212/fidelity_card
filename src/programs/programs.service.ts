import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProgramsService {
  constructor(private readonly prisma: PrismaService) {}

  findByCompanyAndSlug(companyId: string, slug: string) {
    return this.prisma.program.findFirst({
      where: { companyId, slug, isActive: true },
    });
  }

  findById(id: string) {
    return this.prisma.program.findUnique({ where: { id } });
  }
}
