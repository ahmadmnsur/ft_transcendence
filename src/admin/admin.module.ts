import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

// §3.4's `admin` module: the Users table, role changes and the sanctions
// (§6.12, §12.7). CoreModule is global, so the Unit of Work and the realtime
// port inject without an import; FilesModule gives the avatar edits and
// Removal FileWriter, the owner's file order.
@Module({
  imports: [FilesModule],
  controllers: [AdminUsersController],
  providers: [AdminUsersService],
})
export class AdminModule {}
