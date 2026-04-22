// src/types/pedal.ts

export interface PedalData {
  brand: string;
  name: string;
  width: number;
  height: number;
  image: string;
  pricePHP: number;
  isRealPrice?: boolean;
}

export interface ActivePedal extends PedalData {
  instanceId: string;
  x: number;
  y: number;
  rotation: number;
}

export type BoardData = PedalData;