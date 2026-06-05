import { Body, Controller, Post } from '@nestjs/common';
import { QueryService } from './query.service';
import {
  CypherQueryRequest,
  CypherQueryResponse,
  EventsQueryRequest,
  EventsQueryResponse,
} from './query.dto';

@Controller()
export class QueryController {
  constructor(private readonly query: QueryService) {}

  @Post('events')
  queryEvents(@Body() body: EventsQueryRequest): Promise<EventsQueryResponse> {
    return this.query.queryEvents(body);
  }

  @Post('query')
  runQuery(@Body() body: CypherQueryRequest): Promise<CypherQueryResponse> {
    return this.query.runQuery(body);
  }
}
