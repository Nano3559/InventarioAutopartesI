import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Location } from '../entities/location.entity';

@Injectable()
export class LocationsService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async findAll() {
    const repo = this.dataSource.getRepository(Location);
    return repo.find({ order: { numero: 'ASC' } });
  }

  async findOne(id: number) {
    const repo = this.dataSource.getRepository(Location);
    return repo.findOne({ where: { id } });
  }
}
