import { Global, Module } from "@nestjs/common";
import { MongoService } from "./mongo.service.ts";

@Global()
@Module({
  providers: [MongoService],
  exports: [MongoService],
})
export class MongoModule {}
