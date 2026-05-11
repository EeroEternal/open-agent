import { IsString, IsOptional } from 'class-validator';

export class CreateSecretDto {
  @IsString()
  name: string;

  @IsString()
  provider: string; // e.g., 'openai', 'anthropic', 'github', 'custom'

  @IsString()
  value: string; // plaintext value (will be encrypted)
}
