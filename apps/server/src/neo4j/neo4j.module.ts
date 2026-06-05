import { Module } from '@nestjs/common';
import { Neo4jService } from './neo4j.service';
import { TimeTreeService } from './time-tree.service';

@Module({
  providers: [Neo4jService, TimeTreeService],
  exports: [Neo4jService, TimeTreeService],
})
export class Neo4jModule {}
