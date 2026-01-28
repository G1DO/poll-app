import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { PollsService } from './polls.service';

@Controller('api/polls')
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @Get()
  findAll() {
    return this.pollsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pollsService.findOne(id);
  }

  @Post()
  create(@Body() body: { question: string; options: string[] }) {
    return this.pollsService.create(body.question, body.options);
  }

  @Post(':id/vote')
  vote(@Param('id') id: string, @Body() body: { option: string }) {
    return this.pollsService.vote(id, body.option);
  }
}
