import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  findBySlug(slug: string) {
    return this.prisma.company.findFirst({
      where: { slug, isActive: true },
    });
  }

  findById(id: string) {
    return this.prisma.company.findUnique({ where: { id } });
  }
}
