// ignore
//@name:燒火電影-Debug
//@version:1
//@webSite:https://shdy2.com
//@remark:诊断源——用户打开分类页后,把4个对照请求的status/len/error显示成卡片标题
//@type:101
//@order: Z
// ignore

// ⚠️ 这是一次性诊断源,不要长期使用
// 目的:在 uzVideo 真实运行时里验证 shdy2.com 的请求行为

function createCheerio() { return cheerio }

const BROWSER_HEADERS = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept':
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Sec-Ch-Ua': '"Chromium";v="128", "Google Chrome";v="128"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Upgrade-Insecure-Requests': '1',
}
const MOBILE_UA_ONLY = {
    'User-Agent':
        'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36',
}

function summarize(label, r) {
    var len = 0
    var vlist = false
    var head = ''
    try {
        if (r && r.data != null) {
            var d = typeof r.data === 'string' ? r.data : JSON.stringify(r.data)
            len = d.length
            vlist = d.indexOf('v_list') >= 0
            head = d.substring(0, 30).replace(/[\r\n]+/g, ' ')
        }
    } catch (e) { head = 'sumErr:' + e }
    var code = r ? r.code : -1
    var err = (r && r.error) ? String(r.error).substring(0, 40) : ''
    return label + '|c=' + code + '|len=' + len + (vlist ? '|vlist✓' : '') + (err ? '|e:' + err : '') + '|' + head
}

async function runDiag() {
    var url = 'https://shdy2.com/list/1-1.html'
    var results = []

    // A. 默认头(runtime自带)
    try { results.push(summarize('A默认头', await req(url, {}))) }
    catch (e) { results.push('A默认头|THROW|' + e) }

    // B. 仅 mobile UA(原XPTV行为)
    try { results.push(summarize('B仅mobleUA', await req(url, { headers: MOBILE_UA_ONLY }))) }
    catch (e) { results.push('B仅mobleUA|THROW|' + e) }

    // C. 全 Chrome 头(本次修复)
    try { results.push(summarize('C全Chrome头', await req(url, { headers: BROWSER_HEADERS }))) }
    catch (e) { results.push('C全Chrome头|THROW|' + e) }

    // D. 基线: 无CF站点确认网络通
    try { results.push(summarize('D基线example', await req('https://example.com/', { headers: BROWSER_HEADERS }))) }
    catch (e) { results.push('D基线example|THROW|' + e) }

    // 落盘,便于我事后读
    try { await UZUtils.setStorage('saohuo_diag', JSON.stringify(results)) } catch (e) {}

    try { toast('诊断完成', 3) } catch (e) {}

    return results
}

async function getClassList(args) {
    var backData = new RepVideoClassList()
    try {
        var vc = new VideoClass()
        vc.type_id = 'diag'
        vc.type_name = '运行诊断'
        vc.hasSubclass = false
        backData.data = [vc]
    } catch (e) { backData.error = e.toString() }
    return JSON.stringify(backData)
}

async function getSubclassList(args) {
    return JSON.stringify(new RepVideoSubclassList())
}

async function getVideoList(args) {
    var backData = new RepVideoList()
    try {
        var rows = await runDiag()
        for (var i = 0; i < rows.length; i++) {
            var vd = new VideoDetail()
            vd.vod_id = 'diag://' + i
            vd.vod_name = rows[i]
            vd.vod_remarks = '诊断'
            backData.data.push(vd)
        }
        backData.total = backData.data.length
    } catch (e) {
        backData.error = e.toString()
    }
    return JSON.stringify(backData)
}

async function getVideoDetail(args) {
    return JSON.stringify(new RepVideoDetail())
}
async function getVideoPlayUrl(args) {
    return JSON.stringify(new RepVideoPlayUrl())
}
async function searchVideo(args) {
    return JSON.stringify(new RepVideoList())
}
async function getSubclassVideoList(args) {
    return JSON.stringify(new RepVideoList())
}
