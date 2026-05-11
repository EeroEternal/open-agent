import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
const Cryptr = require('cryptr');

@Injectable()
export class SecretsService {
  private cryptr: any;

  constructor(private prisma: PrismaService) {
    const secret = process.env.ENCRYPTION_SECRET || 'default-32-char-secret-change!';
    this.cryptr = new Cryptr(secret);
  }

  async create(userId: string, dto: { name: string; provider: string; value: string }) {
    const encryptedValue = this.cryptr.encrypt(dto.value);
    const lastFour = dto.value.slice(-4).padStart(dto.value.length, '*');

    const secret = await this.prisma.userSecret.create({
      data: {
        userId,
        name: dto.name,
        provider: dto.provider,
        encryptedValue,
        lastFour,
      },
    });

    return {
      id: secret.id,
      name: secret.name,
      provider: secret.provider,
      lastFour: secret.lastFour,
      createdAt: secret.createdAt,
    };
  }

  async findAll(userId: string) {
    const secrets = await this.prisma.userSecret.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return secrets.map((s) => ({
      id: s.id,
      name: s.name,
      provider: s.provider,
      lastFour: s.lastFour,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      lastUsedAt: s.lastUsedAt,
    }));
  }

  async findOne(id: string, userId: string) {
    const secret = await this.prisma.userSecret.findFirst({
      where: { id, userId },
    });

    if (!secret) {
      throw new NotFoundException(`Secret ${id} not found`);
    }

    return {
      id: secret.id,
      name: secret.name,
      provider: secret.provider,
      lastFour: secret.lastFour,
      createdAt: secret.createdAt,
      updatedAt: secret.updatedAt,
      lastUsedAt: secret.lastUsedAt,
    };
  }

  async decrypt(id: string, userId: string): Promise<string> {
    const secret = await this.prisma.userSecret.findFirst({
      where: { id, userId },
    });

    if (!secret) {
      throw new NotFoundException(`Secret ${id} not found`);
    }

    await this.prisma.userSecret.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });

    return this.cryptr.decrypt(secret.encryptedValue);
  }

  async remove(id: string, userId: string) {
    const secret = await this.prisma.userSecret.findFirst({
      where: { id, userId },
    });

    if (!secret) {
      throw new NotFoundException(`Secret ${id} not found`);
    }

    await this.prisma.userSecret.delete({
      where: { id },
    });

    return { success: true };
  }

  async getDecryptedValue(id: string): Promise<string> {
    const secret = await this.prisma.userSecret.findUnique({
      where: { id },
    });

    if (!secret) {
      throw new NotFoundException(`Secret ${id} not found`);
    }

    return this.cryptr.decrypt(secret.encryptedValue);
  }
}
