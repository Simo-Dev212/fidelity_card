import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LoyaltyService } from './loyalty.service';

@ApiTags('loyalty')
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}
}
