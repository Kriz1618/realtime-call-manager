import { Controller, Get, Query } from '@nestjs/common';
import type { ListCallsResponse } from '@rcm/contracts';
import { ListCalls } from '../application/list-calls';
import { toCallDto } from './call.mapper';
import { ListCallsQueryDto } from './dto/list-calls-query.dto';

@Controller('calls')
export class CallsController {
  constructor(private readonly listCalls: ListCalls) {}

  @Get()
  async list(@Query() query: ListCallsQueryDto): Promise<ListCallsResponse> {
    const result = await this.listCalls.execute({
      ...query,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
    return { ...result, items: result.items.map(toCallDto) };
  }
}
