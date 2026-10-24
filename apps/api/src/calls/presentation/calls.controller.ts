import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Sse,
} from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import type { CallDto, ListCallsResponse } from '@rcm/contracts';
import { endWith, ignoreElements, interval, map, merge, Observable, startWith, takeUntil } from 'rxjs';
import { CALL_EVENT_STREAM } from '../application/call-event-stream';
import type { CallEventStream } from '../application/call-event-stream';
import { ListCalls } from '../application/list-calls';
import { SetCallSpamStatus } from '../application/set-call-spam-status';
import { toCallDto } from '../call.mapper';
import { ListCallsQueryDto } from './dto/list-calls-query.dto';
import { SetSpamDto } from './dto/set-spam.dto';

const HEARTBEAT_MS = 25_000;

@Controller('calls')
export class CallsController {
  constructor(
    private readonly listCalls: ListCalls,
    private readonly setCallSpamStatus: SetCallSpamStatus,
    @Inject(CALL_EVENT_STREAM) private readonly eventStream: CallEventStream,
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

  @Sse('stream')
  stream(): Observable<MessageEvent> {
    const events$ = this.eventStream.events();
    // Ends the heartbeat when the source completes (shutdown), so connections can close.
    const closed$ = events$.pipe(ignoreElements(), endWith(true));

    return merge(
      events$.pipe(map((event): MessageEvent => ({ type: event.type, data: event.data }))),
      // Keeps idle connections alive through proxies; named events never reach onmessage.
      interval(HEARTBEAT_MS).pipe(
        map((): MessageEvent => ({ type: 'heartbeat', data: 'ping' })),
        takeUntil(closed$),
      ),
    ).pipe(startWith({ type: 'connected', data: 'ok' } as MessageEvent));
  }

  @Patch(':id/spam')
  async setSpam(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SetSpamDto,
  ): Promise<CallDto> {
    return toCallDto(await this.setCallSpamStatus.execute(id, body.isSpam));
  }
}
