import { IsString, IsOptional, IsArray, IsInt, IsBoolean } from 'class-validator';

export class CreateAgentTemplateDto {
  @IsString()
  slug: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  image: string;

  @IsString()
  defaultCommand: string;

  @IsOptional()
  @IsArray()
  defaultArgs?: string[];

  @IsOptional()
  @IsString()
  workingDir?: string;

  @IsOptional()
  @IsArray()
  requiredSecrets?: string[];

  @IsOptional()
  cpuLimit?: number;

  @IsOptional()
  @IsInt()
  memoryLimit?: number;

  @IsOptional()
  @IsInt()
  diskSize?: number;

  @IsOptional()
  @IsArray()
  exposedPorts?: number[];

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
