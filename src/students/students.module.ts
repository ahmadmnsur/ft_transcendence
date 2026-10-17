import { Module } from '@nestjs/common';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

// §3.4's `students` module: `Student` profile fields, `StudentSkill`, the
// Learning Goal. CoreModule is global, so the Prisma client and the Unit of
// Work inject without an import.
@Module({
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
