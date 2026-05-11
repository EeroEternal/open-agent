import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { SecretsService } from './secrets.service';
import { CreateSecretDto } from './dto/create-secret.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/secrets')
@UseGuards(JwtAuthGuard)
export class SecretsController {
  constructor(private readonly secretsService: SecretsService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateSecretDto) {
    return this.secretsService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Request() req) {
    return this.secretsService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.secretsService.findOne(id, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.secretsService.remove(id, req.user.id);
  }
}
