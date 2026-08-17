import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, RequireRoles } from '../auth/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { CompaniesService } from '../companies/companies.service';
import { LoyaltyEventType, StaffStatus, UserRole } from '@prisma/client';
import { IsString, IsOptional, IsNumber, IsIn, IsBoolean } from 'class-validator';

class AdminUpdateDto {
  @IsString() membershipId: string;
  @IsNumber() amount: number;
  @IsOptional() @IsString() reason?: string;
}

class CreateProgramDto {
  @IsString() companyId: string;
  @IsString() name: string;
  @IsString() slug: string;
  @IsIn(['POINTS', 'STAMPS']) type: 'POINTS' | 'STAMPS';
  @IsOptional() @IsString() description?: string;
  @IsOptional() settings?: Record<string, any>;
  @IsOptional() @IsString() primaryColor?: string;
  @IsOptional() @IsString() secondaryColor?: string;
}

class AssignStaffDto {
  @IsString() userId: string;
  @IsString() companyId: string;
  @IsOptional() @IsBoolean() canAdjustBalance?: boolean;
  @IsOptional() @IsBoolean() canRedeem?: boolean;
}

class UpdateStaffStatusDto {
  @IsString() assignmentId: string;
  @IsIn(['PENDING', 'ACTIVE', 'SUSPENDED']) status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
}

class UpdateUserRoleDto {
  @IsString() userId: string;
  @IsIn(['CLIENT', 'STAFF', 'ADMIN']) role: 'CLIENT' | 'STAFF' | 'ADMIN';
}

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('ADMIN')
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loyaltyService: LoyaltyService,
    private readonly companiesService: CompaniesService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Admin dashboard stats' })
  async dashboard() {
    const [companies, users, memberships, programs] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.user.count(),
      this.prisma.membership.count(),
      this.prisma.program.count(),
    ]);
    return { companies, users, memberships, programs };
  }

  @Post('loyalty/update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin override - update points/stamps' })
  async updateLoyalty(@Body() dto: AdminUpdateDto, @Req() req: any) {
    const membership = await this.loyaltyService.updateBalance({
      membershipId: dto.membershipId,
      amount: dto.amount,
      type: LoyaltyEventType.ADMIN_OVERRIDE,
      reason: dto.reason || 'Admin override',
      actorId: req.user.id,
      actorType: 'admin',
      syncWallet: true,
    });
    return { success: true, membershipId: membership.id, newBalance: membership.balance };
  }

  @Post('programs/create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create loyalty program' })
  async createProgram(@Body() dto: CreateProgramDto) {
    return this.prisma.program.create({
      data: {
        companyId: dto.companyId,
        name: dto.name,
        slug: dto.slug,
        type: dto.type,
        description: dto.description,
        settings: dto.settings || {},
        primaryColor: dto.primaryColor,
        secondaryColor: dto.secondaryColor,
      },
    });
  }

  @Post('staff/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign staff to company' })
  async assignStaff(@Body() dto: AssignStaffDto, @Req() req: any) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) return { error: 'User not found' };

    if (user.role !== 'STAFF') {
      await this.prisma.user.update({
        where: { id: dto.userId },
        data: { role: 'STAFF' as UserRole },
      });
    }

    return this.prisma.staffAssignment.upsert({
      where: { userId_companyId: { userId: dto.userId, companyId: dto.companyId } },
      create: {
        userId: dto.userId,
        companyId: dto.companyId,
        status: StaffStatus.ACTIVE,
        canAdjustBalance: dto.canAdjustBalance ?? true,
        canRedeem: dto.canRedeem ?? true,
        assignedById: req.user.id,
      },
      update: {
        status: StaffStatus.ACTIVE,
        canAdjustBalance: dto.canAdjustBalance ?? true,
        canRedeem: dto.canRedeem ?? true,
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
        company: { select: { id: true, name: true } },
      },
    });
  }

  @Post('staff/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update staff assignment status' })
  async updateStaffStatus(@Body() dto: UpdateStaffStatusDto) {
    return this.prisma.staffAssignment.update({
      where: { id: dto.assignmentId },
      data: { status: dto.status as StaffStatus },
    });
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  async users() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('users/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user role' })
  async updateRole(@Body() dto: UpdateUserRoleDto) {
    return this.prisma.user.update({
      where: { id: dto.userId },
      data: { role: dto.role as UserRole },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  @Get('companies/:id/history')
  @ApiOperation({ summary: 'Company transaction history' })
  async history(@Param('id') id: string) {
    return this.companiesService.getHistory(id);
  }
}
