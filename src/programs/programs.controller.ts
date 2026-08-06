import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProgramsService } from './programs.service';

@ApiTags('programs')
@Controller('programs')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}
}
