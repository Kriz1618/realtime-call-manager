import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import type { CallDto, ListCallsResponse } from '@rcm/contracts';
import { ListCalls } from '../application/list-calls';
import { SetCallSpamStatus } from '../application/set-call-spam-status';
import { toCallDto } from './call.mapper';
import { ListCallsQueryDto } from './dto/list-calls-query.dto';
import { SetSpamDto } from './dto/set-spam.dto';

@Controller('calls')
export class CallsController {
  constructor(
    private readonly listCalls: ListCalls,
    private readonly setCallSpamStatus: SetCallSpamStatus,
  ) {}

  @Get()
  async list(@Query() query: ListCallsQueryDto): Promise<ListCallsResponse> {
    const result = await this.listCalls.execute({
      ...query,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
    return { ...result, items: result.items.map(toCallDto) };
  }

  @Patch(':id/spam')
  async setSpam(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SetSpamDto,
  ): Promise<CallDto> {
    return toCallDto(await this.setCallSpamStatus.execute(id, body.isSpam));
  }
}
