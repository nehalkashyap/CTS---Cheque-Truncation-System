declare module "utif" {
  interface TiffFrame {
    width: number;
    height: number;
    [key: string]: unknown;
  }

  export function decode(buffer: ArrayBuffer): TiffFrame[];
  export function decodeImage(buffer: ArrayBuffer, frame: TiffFrame): void;
  export function toRGBA8(frame: TiffFrame): Uint8Array;
}