const fs = require("fs");
const path = require("path");

const CONTAINERS = new Set(["moov", "trak", "edts", "mdia", "minf", "stbl", "udta", "meta"]);

function parseBoxes(buf, start, end) {
  const boxes = [];
  let off = start;
  while (off + 8 <= end) {
    let size = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    let header = 8;
    if (size === 1) {
      size = Number(buf.readBigUInt64BE(off + 8));
      header = 16;
    } else if (size === 0) {
      size = end - off;
    }
    if (size < header || off + size > end) break;
    boxes.push({ type, start: off, size, header });
    off += size;
  }
  return boxes;
}

function patchChunkOffsets(moov, delta) {
  const walk = (start, end) => {
    let off = start;
    while (off + 8 <= end) {
      let size = moov.readUInt32BE(off);
      const type = moov.toString("ascii", off + 4, off + 8);
      let header = 8;
      if (size === 1) {
        size = Number(moov.readBigUInt64BE(off + 8));
        header = 16;
      } else if (size === 0) {
        size = end - off;
      }
      const dataStart = off + header;
      if (type === "stco") {
        const count = moov.readUInt32BE(dataStart + 4);
        let p = dataStart + 8;
        for (let i = 0; i < count; i++) {
          moov.writeUInt32BE(moov.readUInt32BE(p) + delta, p);
          p += 4;
        }
      } else if (type === "co64") {
        const count = moov.readUInt32BE(dataStart + 4);
        const bigDelta = BigInt(delta);
        let p = dataStart + 8;
        for (let i = 0; i < count; i++) {
          moov.writeBigUInt64BE(moov.readBigUInt64BE(p) + bigDelta, p);
          p += 8;
        }
      } else if (CONTAINERS.has(type)) {
        walk(dataStart, off + size);
      }
      off += size;
    }
  };
  walk(8, moov.length);
}

function faststart(inputPath, outputPath) {
  const buf = fs.readFileSync(inputPath);
  const boxes = parseBoxes(buf, 0, buf.length);
  const moov = boxes.find((b) => b.type === "moov");
  const mdat = boxes.find((b) => b.type === "mdat");
  if (!moov || !mdat) throw new Error("moov or mdat missing");
  if (moov.start < mdat.start) {
    fs.copyFileSync(inputPath, outputPath);
    return { alreadyFastStart: true, moovOffset: moov.start };
  }

  const moovBuf = Buffer.from(buf.subarray(moov.start, moov.start + moov.size));
  patchChunkOffsets(moovBuf, moov.size);

  const parts = [];
  for (const box of boxes) {
    if (box.type === "moov") continue;
    if (box.type === "mdat") parts.push(moovBuf);
    parts.push(buf.subarray(box.start, box.start + box.size));
  }

  fs.writeFileSync(outputPath, Buffer.concat(parts));
  const out = fs.readFileSync(outputPath);
  const outBoxes = parseBoxes(out, 0, out.length);
  return {
    alreadyFastStart: false,
    inputSize: buf.length,
    outputSize: out.length,
    boxes: outBoxes.map((b) => ({ type: b.type, start: b.start, size: b.size })),
    moovOffset: outBoxes.find((b) => b.type === "moov")?.start ?? -1,
    mdatOffset: outBoxes.find((b) => b.type === "mdat")?.start ?? -1,
  };
}

const input = path.resolve("public/html/assets/blueprint-starter/empathy.mp4");
const output = path.resolve("public/html/assets/blueprint-starter/empathy-fast.mp4");
const result = faststart(input, output);
console.log(JSON.stringify(result, null, 2));
