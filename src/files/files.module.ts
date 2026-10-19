import { Module } from '@nestjs/common';
import { FileBuckets, PRODUCTION_BUCKETS } from './buckets';
import { FileCleanup } from './cleanup';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

// §3.4's `files` module: byte validation (validate.ts), file serving, the
// buckets and the cleanup (§9.8). CoreModule is global, so the Storage
// client injects without an import. The schedule that runs the cleanup is
// AppModule's alone (cleanup-schedule.ts).
@Module({
  controllers: [FilesController],
  providers: [FilesService, FileCleanup, { provide: FileBuckets, useValue: PRODUCTION_BUCKETS }],
  exports: [FileBuckets, FileCleanup],
})
export class FilesModule {}
