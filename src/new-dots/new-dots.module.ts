import { Module } from '@nestjs/common';
import { NewDotsController } from './new-dots.controller';
import { NewDotsService } from './new-dots.service';

@Module({ controllers: [NewDotsController], providers: [NewDotsService] })
export class NewDotsModule {}
