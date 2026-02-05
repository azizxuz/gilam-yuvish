import { SERVICES } from '@prisma/client';

export const SERVICE_META = {
  [SERVICES.GILAM]: {
    type: 'count' as const,
    title: '🧼 Gilam',
    description: 'Gilamingiz nechta?',
    photo: 'https://t.me/c/3748521582/3', // yoki file_id
  },
  [SERVICES.ODEYAL]: {
    type: 'count' as const,
    title: "🛏 O'deyal",
    description: "O'deyalingiz nechta?",
    photo: 'https://t.me/c/3748521582/10',
  },
  [SERVICES.PARDA]: {
    type: 'count' as const,
    title: '🪟 Parda',
    description: 'Pardangiz nechta?',
    photo: 'https://t.me/c/3748521582/4',
  },
  [SERVICES.KORPACHA]: {
    type: 'count' as const,
    title: "🛋 Ko'rpacha",
    description: "Ko'rpachangiz nechta?",
    photo: 'https://t.me/c/3748521582/7',
  },
  [SERVICES.FASAD]: {
    type: 'area' as const,
    title: '🏠 Fasad',
    description: 'Fasad maydoni necha kv.m?',
    photo: 'https://t.me/c/3748521582/11',
  },
  [SERVICES.BRUSCHATKA]: {
    type: 'area' as const,
    title: '🧱 Bruschatka',
    description: 'Bruschatka maydoni necha kv.m?',
    photo: 'https://t.me/c/3748521582/9',
  },
  [SERVICES.BASSEYN]: {
    type: 'area' as const,
    title: '🏊 Basseyn',
    description: 'Basseyn maydoni necha kv.m?',
    photo: 'https://t.me/c/3748521582/6',
  },
  [SERVICES.MEBEL]: {
    type: 'chairs' as const,
    title: '🪑 Mebel',
    description: 'Nechta mebel tozalamoqchisiz?',
    photo: 'https://t.me/c/3748521582/8',
  },
};
