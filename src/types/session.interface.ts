// src/types/session.interface.ts
import { SERVICES } from '@prisma/client';

export interface SessionData {
  currentOrder?: {
    items: {
      service: SERVICES;
      count?: number;
      area?: number;
    }[];
    currentService?: SERVICES;
    currentValue?: number;
  };
}
