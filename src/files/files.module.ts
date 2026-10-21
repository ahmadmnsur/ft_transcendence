import { Module } from '@nestjs/common';
import { FileBuckets, PRODUCTION_BUCKETS } from './buckets';
import { FileCleanup } from './cleanup';
import { FileWriter } from './file-writer';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

// §3.4's `files` module: byte validation (validate.ts), file serving, the
// save and delete order both kinds share (file-writer.ts), the buckets and
// the cleanup (§9.8). CoreModule is global, so the Storage client injects
// without an import. The schedule that runs the cleanup is AppModule's alone
// (cleanup-schedule.ts).
@Module({
  controllers: [FilesController],
  providers: [FilesService, FileCleanup, FileWriter, { provide: FileBuckets, useValue: PRODUCTION_BUCKETS }],
  exports: [FileBuckets, FileCleanup, FileWriter],
})
export class FilesModule {}
