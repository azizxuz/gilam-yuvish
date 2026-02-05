import { Injectable } from '@nestjs/common';
import { retry } from 'rxjs';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async createUser(data: {
    userId: string;
    userName?: any;
    fullName?: string;
  }) {
    const oldUser = await this.prisma.users.findFirst({
      where: { userId: data.userId },
    });
    if (oldUser) {
      return;
    }
    await this.prisma.users.create({ data: data });
    return;
  }
}
