import { Controller, Get, Param, Post, Body, UseGuards } from '@nestjs/common';
import { AgentTemplatesService } from './agent-templates.service';
import { CreateAgentTemplateDto } from './dto/create-agent-template.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/agent-templates')
export class AgentTemplatesController {
  constructor(private readonly templatesService: AgentTemplatesService) {}

  @Get()
  findAll() {
    return this.templatesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateAgentTemplateDto) {
    return this.templatesService.create(dto);
  }
}
