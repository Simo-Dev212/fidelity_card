import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, RequireRoles } from '../auth/guards/roles.guard';
import { IsString, IsOptional } from 'class-validator';

class CreateCompanyDto {
  @IsString() name: string;
  @IsString() slug: string;
  @IsOptional() @IsString() primaryColor?: string;
  @IsOptional() @IsString() secondaryColor?: string;
  @IsOptional() @IsString() accentColor?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() supportEmail?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() heroImageUrl?: string;
}

@ApiTags('companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all companies (admin)' })
  findAll() {
    return this.companiesService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create company (admin)' })
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles('ADMIN', 'STAFF')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Company stats (admin/staff)' })
  stats(@Param('id') id: string) {
    return this.companiesService.getStats(id);
  }

  @Get(':id/memberships')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles('ADMIN', 'STAFF')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Company memberships (admin/staff)' })
  memberships(@Param('id') id: string) {
    return this.companiesService.getMemberships(id);
  }

  @Get(':id/history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles('ADMIN', 'STAFF')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Company loyalty history (admin/staff)' })
  history(@Param('id') id: string) {
    return this.companiesService.getHistory(id);
  }

  @Get(':id/staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Company staff assignments (admin)' })
  staff(@Param('id') id: string) {
    return this.companiesService.getStaff(id);
  }

  @Post(':id/update')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update company branding (admin)' })
  update(@Param('id') id: string, @Body() dto: Record<string, any>) {
    return this.companiesService.update(id, dto);
  }

  /** Resolve by id (cuid) or slug — used by admin detail + public join previews */
  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Find company by id or slug' })
  async findOne(@Param('idOrSlug') idOrSlug: string) {
    const byId = await this.companiesService.findById(idOrSlug);
    if (byId) return byId;
    const bySlug = await this.companiesService.findBySlug(idOrSlug);
    if (bySlug) return bySlug;
    throw new NotFoundException('Company not found');
  }
}
