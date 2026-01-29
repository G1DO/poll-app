import { Injectable } from '@nestjs/common';
import { Registry, collectDefaultMetrics, Counter, Histogram } from 'prom-client';

@Injectable()
export class MetricsService {
  readonly register: Registry;
  readonly votesCounter: Counter;
  readonly httpRequestsCounter: Counter;
  readonly httpRequestDuration: Histogram;

  constructor() {
    this.register = new Registry();
    collectDefaultMetrics({ register: this.register });

    this.votesCounter = new Counter({
      name: 'poll_votes_total',
      help: 'Total votes cast',
      labelNames: ['poll_id', 'option'],
      registers: [this.register],
    });

    this.httpRequestsCounter = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [this.register],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path'],
      registers: [this.register],
    });
  }

  recordVote(pollId: string, option: string) {
    this.votesCounter.inc({ poll_id: pollId, option });
  }

  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  getContentType(): string {
    return this.register.contentType;
  }
}