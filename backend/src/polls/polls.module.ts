import { Module } from '@nestjs/common';
import { PollsController } from './polls.controller';
import { PollsService } from './polls.service';

@Module({
  imports: [],
  controllers: [PollsController],
  providers: [PollsService],
})
export class PollsModule {}
