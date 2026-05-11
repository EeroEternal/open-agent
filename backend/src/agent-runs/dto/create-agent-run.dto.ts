import { IsString, IsOptional, IsArray, IsNumber, IsObject } from 'class-validator';

export class CreateAgentRunDto {
  @IsString()
  agentTemplateId: string;

  @IsOptional()
  @IsString()
  command?: string;

  @IsOptional()
  @IsArray()
  args?: string[];

  @IsOptional()
  @IsString()
  workingDir?: string;

  @IsOptional()
  @IsObject()
  resourceLimits?: {
    cpu?: number;
    memory?: number;
    disk?: number;
  };

  @IsOptional()
  @IsArray()
  secretBindings?: string[];
}
