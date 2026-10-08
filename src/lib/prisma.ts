import { PrismaClient } from '@prisma/client';
import dns from 'node:dns';

// Ensure IPv4 first resolution for reliable cloud database connectivity on Linux
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

