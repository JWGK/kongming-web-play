// Shared decoder for the existing native UTF-16 LZ77 save format.
const MAX_CODE_UNITS = 2_000_000;
const MAX_ACCOUNTED_BYTES = 33_554_432;
const WINDOW = 32768;
const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function meter() { return {accountedBytes:0, comparisons:0, insertions:0, tokens:0}; }
function charge(m,n) { if (!Number.isSafeInteger(n) || n < 0 || m.accountedBytes + n > MAX_ACCOUNTED_BYTES) throw new RangeError('Codec work allocation limit'); m.accountedBytes += n; }
function from64(s, m) {
  if(typeof s!=='string'||s.length%4!==0)throw new TypeError('Invalid base64 length');
  const pad=s.endsWith('==')?2:s.endsWith('=')?1:0, used=s.length/4*3-pad;
  charge(m,used); const out=new Uint8Array(used); let at=0;
  for(let i=0;i<s.length;i+=4){
    const a=BASE64.indexOf(s[i]), b=BASE64.indexOf(s[i+1]);
    const end=i+4===s.length, c=s[i+2]==='='?-1:BASE64.indexOf(s[i+2]), d=s[i+3]==='='?-1:BASE64.indexOf(s[i+3]);
    if(a<0||b<0||(!end&&(c<0||d<0))||(c<0&&(s[i+2]!=='='||!end||d>=0||s[i+3]!=='='||(b&15)))||(d<0&&(s[i+3]!=='='||!end||(c>=0&&(c&3)))))throw new TypeError('Noncanonical base64');
    out[at++]=(a<<2)|(b>>>4); if(c>=0)out[at++]=((b&15)<<4)|(c>>>2); if(d>=0)out[at++]=((c&3)<<6)|d;
  }
  if(at!==used)throw new TypeError('Invalid base64 size'); return out;
}
export function decompressRecordText(wire) {
  if(typeof wire!=='string'||wire.length>1_200_100)throw new TypeError('Invalid compressed wire size');
  const m=meter(); charge(m,6*wire.length); // Input, extracted data, conservative canonical-text reserve.
  // Recognize the fixed scalar-only canonical grammar before allocating any
  // decoded state. Never JSON.parse untrusted structures or traverse objects.
  const prefix='{"kind":"kongming-utf16-lz77","version":1,"codeUnits":';
  const separator=',"data":"';
  if(!wire.startsWith(prefix)||!wire.endsWith('"}'))throw new TypeError('Invalid canonical envelope');
  const end=wire.indexOf(separator,prefix.length);
  if(end<prefix.length+1||end>prefix.length+7)throw new TypeError('Invalid code-unit length');
  let n=0;for(let i=prefix.length;i<end;i++){const c=wire.charCodeAt(i)-48;if(c<0||c>9)throw new TypeError('Invalid code-unit length');n=n*10+c;}
  if(n>MAX_CODE_UNITS||(end-prefix.length>1&&wire[prefix.length]==='0'))throw new TypeError('Invalid code-unit length');
  const dataLength=wire.length-2-end-separator.length;
  if(dataLength<0||dataLength>Math.ceil(Math.floor(n*.45)/3)*4)throw new RangeError('Encoded ratio exceeds limit');
  const bytes=from64(wire.slice(end+separator.length,-2),m);
  if(bytes.length>Math.floor(n*.45))throw new RangeError('Encoded ratio exceeds limit');
  charge(m,2*n);const out=new Uint16Array(n);let at=0,p=0;
  while(p<bytes.length){const token=bytes[p++];m.tokens++;
    if(token<128){const count=token+1;if(p+2*count>bytes.length||at+count>n)throw new RangeError('Literal bounds');for(let j=0;j<count;j++){out[at++]=bytes[p]|(bytes[p+1]<<8);p+=2;}}
    else{const count=(token&127)+3;if(p+2>bytes.length)throw new RangeError('Truncated match');const distance=1+bytes[p]+256*bytes[p+1];p+=2;if(distance>WINDOW||distance>at||at+count>n)throw new RangeError('Match bounds');for(let j=0;j<count;j++){out[at]=out[at-distance];at++;}}
  }
  if(at!==n)throw new RangeError('Decoded length mismatch');
  charge(m,4*n); // UTF-16 string chunks plus joined return value.
  const chunks=[];for(let j=0;j<n;j+=8192)chunks.push(String.fromCharCode(...out.subarray(j,Math.min(n,j+8192))));
  return {text:chunks.join(''),metrics:{...m,inputWireCodeUnits:wire.length,outputCodeUnits:n,binaryBytes:bytes.length}};
}

// CRC-32 of both bytes of every UTF-16 code unit, in little-endian order.
const crcTable = Uint32Array.from({length: 256}, (_, byte) => {
  let value = byte;
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  return value;
});
export function recordTextChecksum(text) {
  let crc = 0xffffffff;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    crc = (crc >>> 8) ^ crcTable[(crc ^ code) & 255];
    crc = (crc >>> 8) ^ crcTable[(crc ^ (code >>> 8)) & 255];
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
}
