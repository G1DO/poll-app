import { Injectable, NotFoundException } from '@nestjs/common';
import { MetricsService } from '../metrics/metrics.service';

export interface Poll {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, number>;
}

@Injectable()
export class PollsService {
  private polls = new Map<string, Poll>();

  constructor(private readonly metricsService: MetricsService) {
    this.create('Tabs or Spaces?', ['Tabs', 'Spaces']);
  }

  findAll(): Poll[] {
    return Array.from(this.polls.values());
  }

  findOne(id: string): Poll {
    const poll = this.polls.get(id);
    if (!poll) {
      throw new NotFoundException(`Poll ${id} not found`);
    }
    return poll;
  }

  create(question: string, options: string[]): Poll {
    const id = Math.random().toString(36).substring(2, 9);
    const votes: Record<string, number> = {};
    for (const option of options) {
      votes[option] = 0;
    }
    const poll: Poll = { id, question, options, votes };
    this.polls.set(id, poll);
    return poll;
  }

  vote(id: string, option: string): Poll {
    const poll = this.findOne(id);
    if (!(option in poll.votes)) {
      throw new NotFoundException(`Option "${option}" not found in poll`);
    }
    poll.votes[option]++;
    this.metricsService.recordVote(id, option);
    return poll;
  }
}