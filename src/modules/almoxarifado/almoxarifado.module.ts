import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AlmoxarifadoMaterialController } from './almoxarifado-material.controller';
import { AlmoxarifadoMaterialService } from './almoxarifado-material.service';
import { AlmoxarifadoEmprestimoController } from './almoxarifado-emprestimo.controller';
import { AlmoxarifadoEmprestimoService } from './almoxarifado-emprestimo.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    AlmoxarifadoMaterialController,
    AlmoxarifadoEmprestimoController,
  ],
  providers: [AlmoxarifadoMaterialService, AlmoxarifadoEmprestimoService],
})
export class AlmoxarifadoModule {}
