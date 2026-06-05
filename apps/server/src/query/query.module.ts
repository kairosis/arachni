import { Module } from '@nestjs/common';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { QueryController } from './query.controller';
import { QueryService } from './query.service';

@Module({
  imports: [Neo4jModule],
  controllers: [QueryController],
  providers: [QueryService],
})
export class QueryModule {}
