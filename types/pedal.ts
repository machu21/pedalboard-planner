/** A pedal or board as it appears in the catalog. Dimensions are in inches. */
export interface PedalData {
  brand: string;
  name: string;
  width: number;
  height: number;
  image: string;
}

export type BoardData = PedalData & { custom?: boolean };

export type Rotation = 0 | 90 | 180 | 270;

export type PriceState =
  | { status: 'loading' }
  | { status: 'ready'; php: number; source: 'reverb' }
  | { status: 'unavailable' };

/** A pedal placed on the board. Position and size are in inches. */
export interface ActivePedal extends PedalData {
  instanceId: string;
  x: number;
  y: number;
  rotation: Rotation;
}
