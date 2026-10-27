declare module "opentype.js" {
  interface Glyph {
    advanceWidth?: number;
    index: number;
  }
  interface Font {
    unitsPerEm: number;
    charToGlyph(ch: string): Glyph;
  }
  const opentype: { parse(buffer: ArrayBuffer): Font };
  export default opentype;
}
