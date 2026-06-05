/**
 * PodcastIndex auth helper for server-side/proxy use only.
 * Do not import this into browser-facing source files with real credentials.
 */
export function buildPodcastIndexAuthorization(apiKey: string, apiSecret: string, unixTime: string): string {
  return sha1(apiKey + apiSecret + unixTime)
}

function sha1(str: string): string {
  function rotateLeft(n: number, s: number): number {
    return (n << s) | (n >>> (32 - s))
  }

  function toHexStr(n: number): string {
    let s = ''
    for (let i = 7; i >= 0; i--) {
      s += ((n >>> (i * 4)) & 0x0f).toString(16)
    }
    return s
  }

  const msg = Array.from(new TextEncoder().encode(str))
  const ml = msg.length
  msg.push(0x80)
  while (msg.length % 64 !== 56) msg.push(0)

  const bitLength = ml * 8
  const high = Math.floor(bitLength / 0x100000000)
  const low = bitLength >>> 0
  for (let i = 0; i < 4; i++) msg.push((high >>> (24 - i * 8)) & 0xff)
  for (let i = 0; i < 4; i++) msg.push((low >>> (24 - i * 8)) & 0xff)

  const w = new Array<number>(80)
  let a = 0x67452301
  let b = 0xefcdab89
  let c = 0x98badcfe
  let d = 0x10325476
  let e = 0xc3d2e1f0

  for (let i = 0; i < msg.length; i += 64) {
    for (let j = 0; j < 16; j++) {
      w[j] = (msg[i + j * 4]! << 24) | (msg[i + j * 4 + 1]! << 16) | (msg[i + j * 4 + 2]! << 8) | msg[i + j * 4 + 3]!
    }
    for (let j = 16; j < 80; j++) {
      w[j] = rotateLeft(w[j - 3]! ^ w[j - 8]! ^ w[j - 14]! ^ w[j - 16]!, 1)
    }

    const aa = a
    const bb = b
    const cc = c
    const dd = d
    const ee = e

    for (let j = 0; j < 80; j++) {
      let f: number
      let k: number
      if (j < 20) {
        f = (b & c) | (~b & d)
        k = 0x5a827999
      } else if (j < 40) {
        f = b ^ c ^ d
        k = 0x6ed9eba1
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d)
        k = 0x8f1bbcdc
      } else {
        f = b ^ c ^ d
        k = 0xca62c1d6
      }
      const temp = (rotateLeft(a, 5) + f + e + k + w[j]!) | 0
      e = d
      d = c
      c = rotateLeft(b, 30)
      b = a
      a = temp
    }

    a = (a + aa) | 0
    b = (b + bb) | 0
    c = (c + cc) | 0
    d = (d + dd) | 0
    e = (e + ee) | 0
  }

  return toHexStr(a) + toHexStr(b) + toHexStr(c) + toHexStr(d) + toHexStr(e)
}
