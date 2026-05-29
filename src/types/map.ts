export type BBox = [number, number, number, number];

export interface ViewState {
  center: [number, number];
  zoom: number;
  bearing?: number;
  pitch?: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}
