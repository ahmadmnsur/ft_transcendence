import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { AvatarsService } from './avatars.service';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

// §3.4's `students` module: `Student` profile fields, `StudentSkill`, the
// Learning Goal, and `Avatar`. CoreModule is global, so the Prisma client and
// the Unit of Work inject without an import; FilesModule gives the buckets.
@Module({
  imports: [FilesModule],
  controllers: [StudentsController],
  providers: [StudentsService, AvatarsService],
})
export class StudentsModule {}
