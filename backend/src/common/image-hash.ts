import sharp from 'sharp';

export async function computeHash(buffer: Buffer): Promise<string> {
  const { data } = await sharp(buffer)
    .resize(8, 8, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = data as Buffer;
  const mean = pixels.reduce((a, b) => a + b, 0) / pixels.length;
  let hash = 0n;
  for (let i = 0; i < pixels.length; i++) {
    if (pixels[i] >= mean) hash |= 1n << BigInt(i);
  }
  return hash.toString(16).padStart(16, '0');
}

export function hammingDistance(a: string, b: string): number {
  const x = BigInt('0x' + a);
  const y = BigInt('0x' + b);
  let d = 0;
  let diff = x ^ y;
  while (diff > 0n) {
    d++;
    diff &= diff - 1n;
  }
  return d;
}

export async function generatePlaceholderImage(seed: number): Promise<Buffer> {
  const size = 64;
  const px = Buffer.alloc(size * size * 3);
  const r = (seed * 37) % 255;
  const g = (seed * 71) % 255;
  const b = (seed * 113) % 255;
  for (let i = 0; i < size * size; i++) {
    const x = i % size;
    const y = Math.floor(i / size);
    const t = (x + y + seed) % 3;
    const v = 40 + ((x * y + seed * 17) % 160);
    px[i * 3] = t === 0 ? v : (r + v) % 255;
    px[i * 3 + 1] = t === 1 ? v : (g + v) % 255;
    px[i * 3 + 2] = t === 2 ? v : (b + v) % 255;
  }
  return sharp(px, { raw: { width: size, height: size, channels: 3 } })
    .png()
    .toBuffer();
}
