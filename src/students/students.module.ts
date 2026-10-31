import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { AvatarsService } from './avatars.service';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [FilesModule],
  controllers: [StudentsController],
  providers: [StudentsService, AvatarsService],
})
export class StudentsModule {}
