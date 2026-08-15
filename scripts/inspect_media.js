const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');
const { decompress } = require('fzstd');

async function inspectMedia() {
  const data = fs.readFileSync(path.join(__dirname, '..', 'collection-20260811212525.colpkg'));
  const zip = await JSZip.loadAsync(data);
  const rawMedia = await zip.file('media').async('nodebuffer');
  
  console.log('rawMedia header:', rawMedia.slice(0, 30));
  
  let decompressed = rawMedia;
  if (rawMedia[0] === 0x28 && rawMedia[1] === 0xb5 && rawMedia[2] === 0x2f && rawMedia[3] === 0xfd) {
    decompressed = Buffer.from(decompress(rawMedia));
    console.log('Decompressed media header:', decompressed.slice(0, 100));
    console.log('Decompressed media string sample:\n', decompressed.slice(0, 300).toString('utf8'));
  } else {
    console.log('Raw media string sample:\n', rawMedia.slice(0, 300).toString('utf8'));
  }
}

inspectMedia().catch(console.error);
