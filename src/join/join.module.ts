import { Module } from '@nestjs/common';
import { JoinController } from './join.controller';
import { JoinService } from './join.service';
import { MembershipsModule } from '../memberships/memberships.module';
import { ProgramsModule } from '../programs/programs.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [MembershipsModule, ProgramsModule, AuthModule],
  controllers: [JoinController],
  providers: [JoinService],
})
export class JoinModule {}
