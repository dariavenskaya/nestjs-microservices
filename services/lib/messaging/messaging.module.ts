import { Module, Global } from "@nestjs/common";
import { MessagingService } from "./messaging.service.ts";

@Global()
@Module({
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
