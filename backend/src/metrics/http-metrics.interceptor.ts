import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const path = req.route?.path || req.path;
    const end = this.metricsService.httpRequestDuration.startTimer({ method, path });

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        const status = String(res.statusCode);
        this.metricsService.httpRequestsCounter.inc({ method, path, status });
        end();
      }),
    );
  }
}