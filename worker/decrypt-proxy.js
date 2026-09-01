// 黄果短剧封面解密代理 (Cloudflare Worker)
// 用法: https://<worker-name>.workers.dev/?url=<加密图片URL>
// 原理: 抓加密图 -> AES-128-CBC 解密 -> 返回明文 JPEG/PNG

const IMG_KEY = new TextEncoder().encode('f5d965df75336270')  // 16 bytes ASCII
const IMG_IV  = new TextEncoder().encode('97b60394abc2fbe1')  // 16 bytes ASCII

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const targetUrl = url.searchParams.get('url')
    if (!targetUrl) return new Response('missing url param', { status: 400 })

    try {
      const imgResp = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (!imgResp.ok) return new Response(`fetch error: ${imgResp.status}`, { status: 502 })

      const encBuf = await imgResp.arrayBuffer()
      const encBytes = new Uint8Array(encBuf)

      // 已是明文图片则直返
      const isJPEG = encBytes[0] === 0xff && encBytes[1] === 0xd8
      const isPNG  = encBytes[0] === 0x89 && encBytes[1] === 0x50 && encBytes[2] === 0x4e && encBytes[3] === 0x47
      if (isJPEG || isPNG) {
        return new Response(encBuf, { headers: { 'Content-Type': isPNG ? 'image/png' : 'image/jpeg', 'Cache-Control': 'public, max-age=86400', 'Access-Control-Allow-Origin': '*' } })
      }

      // AES-128-CBC 解密
      const key = await crypto.subtle.importKey('raw', IMG_KEY, { name: 'AES-CBC' }, false, ['decrypt'])
      const decBuf = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: IMG_IV }, key, encBuf)
      const decBytes = new Uint8Array(decBuf)

      // 判断格式 + 截断
      let contentType = 'image/jpeg'
      let end = decBytes.length
      if (decBytes[0] === 0xff && decBytes[1] === 0xd8) {
        for (let i = decBytes.length - 2; i >= 0; i--) { if (decBytes[i] === 0xff && decBytes[i+1] === 0xd9) { end = i + 2; break } }
      } else if (decBytes[0] === 0x89 && decBytes[1] === 0x50) {
        contentType = 'image/png'
        for (let i = decBytes.length - 12; i >= 0; i--) { if (decBytes[i]===0x49&&decBytes[i+1]===0x45&&decBytes[i+2]===0x4e&&decBytes[i+3]===0x44) { end = i + 8; break } }
      } else {
        contentType = 'application/octet-stream'
      }

      return new Response(decBuf.slice(0, end), { headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400', 'Access-Control-Allow-Origin': '*' } })
    } catch (e) {
      return new Response(`decrypt error: ${e.message}`, { status: 500 })
    }
  }
}
