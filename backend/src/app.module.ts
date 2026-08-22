import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { LocationsModule } from './locations/locations.module';
import { SalesModule } from './sales/sales.module';
import { MovimientosModule } from './movimientos/movimientos.module';
import { SolicitudesModule } from './solicitudes/solicitudes.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { CostosModule } from './costos/costos.module';
import { DevolucionesModule } from './devoluciones/devoluciones.module';
import { PreciosModule } from './precios/precios.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: parseInt(config.get('DB_PORT', '5432'), 10),
        username: config.get('DB_USER', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: config.get('DB_NAME', 'inventario'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    AuthModule,
    UsersModule,
    ProductsModule,
    LocationsModule,
    SalesModule,
    MovimientosModule,
    SolicitudesModule,
    ProveedoresModule,
    CostosModule,
    DevolucionesModule,
    PreciosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
