import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseEnvelope<T> {
  data: T;
  message: { code: string; text: string };
  pagination?: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
}

/**
 * JSON cannot represent BigInt (Prisma returns BigInt for bigint columns such as
 * StoredFile ids and Profile.photoFileId), so Express throws "Do not know how to
 * serialize a BigInt". Convert every BigInt to a decimal string before sending.
 * Only plain objects and arrays are walked; Dates, Decimals and other class
 * instances keep their own JSON form.
 */
export function serializeBigInt<T>(value: T): T {
  if (typeof value === 'bigint') return value.toString() as unknown as T;
  if (Array.isArray(value)) return value.map((v) => serializeBigInt(v)) as unknown as T;
  if (value && typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return value;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = serializeBigInt(v);
    return out as T;
  }
  return value;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ResponseEnvelope<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseEnvelope<T>> {
    return next.handle().pipe(
      map((value) => {
        if (value && typeof value === 'object' && 'data' in value) {
          return serializeBigInt(value) as ResponseEnvelope<T>;
        }
        return {
          data: serializeBigInt(value),
          message: { code: 'OK', text: 'Success' },
        };
      }),
    );
  }
}
