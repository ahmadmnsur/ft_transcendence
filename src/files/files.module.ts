import { Module } from '@nestjs/common';
import { FileBuckets, PRODUCTION_BUCKETS } from './buckets';
import { FileCleanup } from './cleanup';
import { FileWriter } from './file-writer';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  controllers: [FilesController],
  providers: [FilesService, FileCleanup, FileWriter, { provide: FileBuckets, useValue: PRODUCTION_BUCKETS }],
  exports: [FileBuckets, FileCleanup, FileWriter],
})
export class FilesModule {}
