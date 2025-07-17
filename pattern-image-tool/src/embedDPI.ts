export function embedDPI(dataURL: string, dpi: number): string {
    const base64Data = dataURL.split(',')[1];
    const binary = atob(base64Data);
    const binaryArray = Uint8Array.from(binary, c => c.charCodeAt(0));
  
    const xPixelsPerMeter = Math.round(dpi * 39.3701); // 1 inch = 0.0254m → 1m ≒ 39.3701 inch
    const pHYsChunkData = [
      ...[0x70, 0x48, 0x59, 0x73], // 'pHYs'
      ...toBytes(xPixelsPerMeter),
      ...toBytes(xPixelsPerMeter),
      0x01 // unit: meter
    ];
    const pHYsCRC = crc32(pHYsChunkData);
    const pHYsChunk = [
      0x00, 0x00, 0x00, 0x09, // chunk length
      ...pHYsChunkData,
      ...pHYsCRC
    ];
  
    // 挿入位置：PNG signature (8バイト) + IHDR (25バイト) = 33バイト
    const before = binaryArray.slice(0, 33);
    const after = binaryArray.slice(33);
    const modifiedArray = new Uint8Array([...before, ...pHYsChunk, ...after]);
  
    // base64エンコード
    return 'data:image/png;base64,' + uint8ToBase64(modifiedArray);
  }
  
  function toBytes(n: number): number[] {
    return [(n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
  }
  
  function crc32(data: number[]): number[] {
    let crc = 0xffffffff;
    for (const b of data) {
      crc ^= b;
      for (let i = 0; i < 8; i++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    crc = ~crc;
    return toBytes(crc >>> 0);
  }
  
  function uint8ToBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
    }
    return btoa(binary);
  }
  