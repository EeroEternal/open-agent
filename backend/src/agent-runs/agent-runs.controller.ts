import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request, Query } from '@nestjs/common';
import { AgentRunsService } from './agent-runs.service';
import { CreateAgentRunDto } from './dto/create-agent-run.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/agent-runs')
@UseGuards(JwtAuthGuard)
export class AgentRunsController {
  constructor(private readonly runsService: AgentRunsService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateAgentRunDto) {
    return this.runsService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Request() req) {
    return this.runsService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.runsService.findOne(id, req.user.id);
  }

  @Get(':id/logs')
  getLogs(@Param('id') id: string, @Request() req, @Query('after') after?: string) {
    const afterSeq = after ? BigInt(after) : undefined;
    return this.runsService.getLogs(id, req.user.id, afterSeq);
  }

  @Get(':id/events')
  getEvents(@Param('id') id: string, @Request() req) {
    return this.runsService.getEvents(id, req.user.id);
  }

  @Get(':id/metrics')
  getMetrics(@Param('id') id: string, @Request() req) {
    return this.runsService.getMetrics(id, req.user.id);
  }

  @Put(':id/stop')
  stop(@Param('id') id: string, @Request() req) {
    return this.runsService.stop(id, req.user.id);
  }

  @Put(':id/restart')
  restart(@Param('id') id: string, @Request() req) {
    return this.runsService.restart(id, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.runsService.remove(id, req.user.id);
  }
}
