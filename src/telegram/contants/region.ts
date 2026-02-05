// src/telegram/constants/regions.ts
export const REGIONS = {
  TOSHKENT_SHAHAR: 'Toshkent shahar',
  TOSHKENT_VILOYAT: 'Toshkent viloyati',
  ANDIJON: 'Andijon',
  BUXORO: 'Buxoro',
  FARGONA: "Farg'ona",
  JIZZAX: 'Jizzax',
  XORAZM: 'Xorazm',
  NAMANGAN: 'Namangan',
  NAVOIY: 'Navoiy',
  QASHQADARYO: 'Qashqadaryo',
  SAMARQAND: 'Samarqand',
  SIRDARYO: 'Sirdaryo',
  SURXONDARYO: 'Surxondaryo',
  QORAQALPOGISTON: "Qoraqalpog'iston Respublikasi",
} as const;

export type Region = keyof typeof REGIONS;
