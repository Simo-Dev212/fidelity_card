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

  findAll() {
    return this.prisma.company.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  create(data: {
    name: string;
    slug: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    website?: string;
    supportEmail?: string;
    logoUrl?: string;
    heroImageUrl?: string;
  }) {
    return this.prisma.company.create({ data });
  }

  update(id: string, data: Record<string, any>) {
    return this.prisma.company.update({ where: { id }, data });
  }

  getStats(companyId: string) {
    return this.prisma.membership.aggregate({
      where: { companyId },
      _count: true,
      _sum: { balance: true },
    });
  }

  getMemberships(companyId: string) {
    return this.prisma.membership.findMany({
      where: { companyId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        program: { select: { id: true, name: true, slug: true, type: true } },
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  getHistory(companyId: string, limit = 50) {
    return this.prisma.loyaltyHistory.findMany({
      where: { companyId },
      include: {
        membership: {
          select: {
            id: true,
            walletId: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  getStaff(companyId: string) {
    return this.prisma.staffAssignment.findMany({
      where: { companyId },
      include: {
        user: { select: { id: true, email: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
