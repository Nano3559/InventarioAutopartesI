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
import { ReportesModule } from './reportes/reportes.module';
import { AttendanceModule } from './attendance/attendance.module';
import { FaceModule } from './face/face.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbHost = config.get<string>('DB_HOST', 'localhost');
        // Un PostgreSQL local rechaza el handshake TLS, pero Supabase lo exige.
        // Por defecto se usa SSL salvo que el host sea local; DB_SSL fuerza el valor.
        const dbSsl =
          config.get<string>('DB_SSL') ??
          (!/^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)$/.test(
            dbHost,
          )).toString();

        return {
          type: 'postgres',
          host: dbHost,
          port: parseInt(config.get<string>('DB_PORT', '5432'), 10),
          username: config.get<string>('DB_USER', 'postgres'),
          password: config.get<string>('DB_PASSWORD', 'postgres'),
          database: config.get<string>('DB_NAME', 'postgres'),
          ssl: dbSsl === 'true' ? { rejectUnauthorized: false } : false,
          autoLoadEntities: true,
          // Activar synchronize solo en desarrollo. En producción usar DB_SYNC=false
          // y aplicar migraciones de forma controlada.
          synchronize: config.get('DB_SYNC', 'true') === 'true',
        };
      },
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
    ReportesModule,
    AttendanceModule,
    FaceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
