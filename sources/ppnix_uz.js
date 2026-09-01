// ignore
//@name:未知源
//@version:1
//@webSite:
//@remark:移植自 XPTV ppnix.js
//@type:101
// ignore

// ============================================================
// uzVideo 扩展 - 自动转换自 XPTV ppnix.js
// 转换工具: tools/convert_xptv.py
// 原理: XPTV兼容shim + uzVideo wrapper
// ============================================================

// ---------- XPTV 兼容层 (polyfill) ----------

const $$cheerio = cheerio;
const $$crypto = Crypto;

const $fetch = {
    async get(url, options) {
        const resp = await req(url, options || {});
        return { data: resp.data, headers: resp.headers, code: resp.code };
    },
    async post(url, body, options) {
        const opts = options || {};
        opts.method = 'POST';
        if (body !== undefined) opts.body = body;
        const resp = await req(url, opts);
        return { data: resp.data, headers: resp.headers, code: resp.code };
    },
    async download(url, options) {
        const opts = options || {};
        opts.responseType = 'arraybuffer';
        const resp = await req(url, opts);
        return { data: resp.data, headers: resp.headers, code: resp.code };
    },
};

const $html = {
    elements(html, selector) {
        if (!html) return [];
        const $ = $$cheerio.load(html);
        const out = [];
        $(selector).each(function (i, el) {
            out.push($(el).toString());
        });
        return out;
    },
    attr(html, selector, attrName) {
        if (!html) return '';
        const $ = $$cheerio.load(html);
        const v = $(selector).attr(attrName);
        return v || '';
    },
    text(html, selector) {
        if (!html) return '';
        const $ = $$cheerio.load(html);
        return $(selector).text().trim();
    },
};

const $$cacheStore = {};
const $cache = {
    get(key) { return $$cacheStore[key]; },
    set(key, value) { $$cacheStore[key] = value; },
};

const $print = console.log;

function argsify(jsonStr) {
    try {
        if (typeof jsonStr === 'object') return jsonStr;
        return JSONbig.parse(jsonStr);
    } catch (e) { return {}; }
}

function jsonify(obj) { return JSON.stringify(obj); }

function createCheerio() { return $$cheerio; }
function createCryptoJS() { return $$crypto; }

// ---------- 原始 XPTV 代码 ----------

// PPnix XPTV Source
// URL: https://www.ppnix.com/cn/

const $base_url = 'https://www.ppnix.com'
const $headers = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
}

const cheerio = createCheerio()

const movieTypes =
    '剧情,喜剧,动作,惊悚,爱情,犯罪,冒险,恐怖,悬疑,奇幻,科幻,动画,战争,历史,传记,家庭,音乐,同性,纪录片,歌舞,古装,运动,武侠,灾难,西部,儿童,短片,黑色电影,戏曲'.split(
        ',',
    )
const movieCountries =
    '美国,英国,日本,中国大陆,法国,中国香港,韩国,德国,加拿大,意大利,西班牙,澳大利亚,台湾,印度,比利时,瑞典,泰国,爱尔兰,丹麦,俄罗斯,瑞士,新加坡,墨西哥,挪威,荷兰,新西兰,芬兰,西德,波兰,南非,巴西,匈牙利,奥地利,卢森堡,捷克,阿根廷,罗马尼亚,土耳其,保加利亚,马来西亚,印度尼西亚,菲律宾,葡萄牙,希腊,塞尔维亚,越南,苏联,智利,冰岛,伊朗,马耳他,阿联酋,卡塔尔,乌克兰,哥伦比亚,以色列,摩洛哥,南斯拉夫,约旦,柬埔寨,斯洛文尼亚,捷克斯洛伐克,塞浦路斯,克罗地亚,阿尔及利亚,白俄罗斯,爱沙尼亚,波多黎各,斯洛伐克,拉脱维亚,尼泊尔,古巴,博茨瓦纳,北马其顿,黎巴嫩,马恩岛,马其顿,蒙古,立陶宛,突尼斯,秘鲁,科威特,瓦努阿图,玻利维亚,沙特阿拉伯,摩纳哥,巴拿马,巴哈马,尼日利亚,委内瑞拉,多米尼加,埃及,哈萨克斯坦,利比里亚,列支敦士登,伊拉克,亚美尼亚,乌拉圭,中国澳门,中国,不丹'.split(
        ',',
    )
const tvTypes =
    '剧情,犯罪,爱情,悬疑,喜剧,惊悚,奇幻,动作,科幻,古装,冒险,恐怖,动画,历史,战争,同性,西部,武侠,传记,家庭,真人秀,短片,运动,灾难,纪录片,热血,战斗'.split(
        ',',
    )
const tvCountries =
    '美国,中国大陆,韩国,英国,日本,台湾,中国香港,泰国,法国,新加坡,澳大利亚,波兰,加拿大,马来西亚,阿根廷,墨西哥,南非,丹麦'.split(
        ',',
    )
const movieYears =
    '2026,2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015,2014,2013,2012,2011,2010,2009,2008,2007,2006,2005,2004,2003,2002,2001,2000,1999,1998,1997,1996,1995,1994,1993,1992,1991,1990,1989,1988,1987,1986,1985,1984,1983,1982,1981,1980,1979,1978,1977,1976,1975,1974,1973,1972,1971,1970,1969,1968,1967,1966,1965,1964,1963,1962,1961,1960,1959,1958,1957,1956,1955,1954,1953,1952,1951,1950,1949,1948,1946,1945,1944,1942,1941,1940,1939,1938,1937,1936,1935,1933,1932,1931,1929,1928,1927,1926,1925,1924,1922,1921,1920,1919,1916'.split(
        ',',
    )
const tvYears =
    '2026,2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015,2014,2013,2012,2011,2010,2009,2008,2007,2006,2005,2004,2003,2002,2001,2000,1999,1998,1997,1996,1995,1994'.split(
        ',',
    )

const opts = (arr) => [{ n: '全部', v: '' }, ...arr.map((v) => ({ n: v, v }))]

const filterList = {
    movie: [
        { key: 'type', name: '類型', value: opts(movieTypes) },
        { key: 'country', name: '國家', value: opts(movieCountries) },
        { key: 'year', name: '年代', value: opts(movieYears) },
    ],
    tv: [
        { key: 'type', name: '類型', value: opts(tvTypes) },
        { key: 'country', name: '國家', value: opts(tvCountries) },
        { key: 'year', name: '年代', value: opts(tvYears) },
    ],
}

function buildListUrl(cat, type, country, year, page) {
    const parts = [type || '', country || '', year || '', page > 1 ? page - 1 : '']
    const joined = parts.join('-')
    if (joined !== '---') return `${$base_url}/cn/${cat}/${joined}-.html`
    return `${$base_url}/cn/${cat}/`
}

// async function getLocalInfo() {
//     return jsonify({ ver: 1, name: 'PPnix', api: 'csp_ppnix', type: 2 })
// }

async function getConfig() {
    return jsonify({
        ver: 1,
        title: 'PPnix',
        site: $base_url,
        tabs: [
            { name: '電影', ext: { id: 'movie' } },
            { name: '電視劇', ext: { id: 'tv' } },
        ],
    })
}

async function getCards(ext) {
    ext = argsify(ext)
    const { id: cat = 'movie', page = 1, filters = {} } = ext
    const { type = '', country = '', year = '' } = filters

    const listUrl = buildListUrl(cat, type, country, year, page)
    const { data: html = '' } = await $fetch.get(listUrl, { headers: $headers })

    const $ = cheerio.load(html)
    const list = []
    $('a.thumbnail').each((_, el) => {
        const href = $(el).attr('href') || ''
        const m = href.match(/\/cn\/(?:movie|tv)\/(\d+)\.html/)
        if (!m) return
        list.push({
            vod_id: m[1],
            vod_name: $(el).find('img.thumb').attr('alt') || m[1],
            vod_pic: $(el).find('img.thumb').attr('src') || '',
            vod_remarks: '',
            ext: { id: m[1], url: `${$base_url}/cn/${cat}/${m[1]}.html` },
        })
    })

    return jsonify({ list, filter: filterList[cat] })
}

async function getTracks(ext) {
    const args = argsify(ext)
    const id = args.id
    if (!id) return jsonify({ code: 0, msg: 'Missing id' })

    let url = `${$base_url}/cn/movie/${id}.html`
    let resp = await $fetch.get(url, { headers: $headers })
    let html = typeof resp === 'string' ? resp : resp.data || ''
    let isTv = false

    if (!html.includes('m3u8=')) {
        url = `${$base_url}/cn/tv/${id}.html`
        resp = await $fetch.get(url, { headers: $headers })
        html = typeof resp === 'string' ? resp : resp.data || ''
        isTv = true
    }

    const cid = html.match(/classid=(\d+)/)
    if (cid) isTv = cid[1] === '2'

    const m3u8Match = html.match(/m3u8=\[([^\]]+)\]/)
    if (!m3u8Match) return jsonify({ code: 0, msg: 'No playback found' })

    const values = m3u8Match[1]
        .replace(/'/g, '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

    const subMatch = html.match(/sub='\|([^|]*)\|([^|]*)\|([^|]*)\|'/)
    const subLangs = []
    if (subMatch)
        [1, 2, 3].forEach((i) => {
            if (subMatch[i]) subLangs.push(subMatch[i])
        })

    const subLangNames = { cn: '簡體中文', tw: '繁體中文', en: 'English' }

    const $ = cheerio.load(html)
    const title = $('h1.product-title').first().text().trim() || id

    const tracks = values.map((v) => {
        const m3u8Url = `${$base_url}/info/m3u8/${id}/${encodeURIComponent(v)}.m3u8`
        const subs = {}
        subLangs.forEach((lang) => {
            subs[lang] = `${$base_url}/info/subtitle/${id}/${encodeURIComponent(v)}/${lang}.srt`
        })
        return {
            name: isTv ? `第${v}集` : v,
            url: m3u8Url,
            ext: { url: m3u8Url, encrypt: 2, keyUrl: `${$base_url}/info/m3u8/key`, subs, subNames: subLangNames },
        }
    })

    return jsonify({
        code: 1,
        msg: 'success',
        id,
        title,
        list: [{ title: '正片', tracks }],
    })
}

async function getPlayinfo(ext) {
    const args = argsify(ext)
    const url = args.url
    if (!url) return jsonify({ urls: [] })

    const subtitles = []
    const subs = args.subs || {}
    const subNames = args.subNames || {}
    ;['cn', 'tw', 'en'].forEach((lang) => {
        if (subs[lang]) subtitles.push({ name: subNames[lang] || lang, url: subs[lang] })
    })

    const result = {
        urls: [url],
        headers: [{ 'User-Agent': $headers['User-Agent'], Referer: `${$base_url}/` }],
    }
    if (subtitles.length) result.subtitles = subtitles

    return jsonify(result)
}

async function search(ext) {
    const args = argsify(ext)
    const keyword = args.text || args.wd || args.keyword || ''
    if (!keyword) return jsonify({ code: 0, msg: 'Missing keyword' })

    const searchUrl = `${$base_url}/cn/search/${encodeURIComponent(keyword)}--.html`
    const resp = await $fetch.get(searchUrl, { headers: $headers })
    const html = typeof resp === 'string' ? resp : resp.data || ''

    const $ = cheerio.load(html)
    const list = []
    $('a.thumbnail').each((_, el) => {
        const href = $(el).attr('href')
        const match = href && href.match(/\/cn\/(movie|tv)\/(\d+)\.html/)
        if (!match) return
        const type = match[1],
            id = match[2]
        list.push({
            vod_id: id,
            vod_name: $(el).find('img.thumb').attr('alt') || id,
            vod_pic: $(el).find('img.thumb').attr('src') || '',
            vod_remarks: '',
            ext: { id, url: `${$base_url}/cn/${type}/${id}.html` },
        })
    })

    return jsonify({ code: 1, msg: 'success', list, page: 1, total: list.length })
}


// ============================================================
// uzVideo 扩展接口适配层 (wrapper)
// ============================================================

async function getClassList(args) {
    var backData = new RepVideoClassList();
    try {
        var config = await getConfig();
        var cfg = typeof config === 'string' ? JSON.parse(config) : config;
        var list = [];
        var tabs = cfg.tabs || [];
        for (var i = 0; i < tabs.length; i++) {
            var vc = new VideoClass();
            vc.type_id = String(tabs[i].id || tabs[i].name || i);
            vc.type_name = String(tabs[i].name || tabs[i].id || '');
            vc.hasSubclass = false;
            list.push(vc);
        }
        backData.data = list;
    } catch (e) { backData.error = e.toString(); }
    return JSON.stringify(backData);
}

async function getSubclassList(args) {
    var backData = new RepVideoSubclassList();
    try { backData.data = new VideoSubclass(); }
    catch (e) { backData.error = e.toString(); }
    return JSON.stringify(backData);
}

async function getVideoList(args) {
    var backData = new RepVideoList();
    try {
        var xptvArgs = { url: args.url, page: args.page || 1 };
        var result = await getCards(xptvArgs);
        var parsed = typeof result === 'string' ? JSON.parse(result) : result;
        var cards = parsed.list || [];
        var list = [];
        for (var i = 0; i < cards.length; i++) {
            var c = cards[i];
            var vd = new VideoDetail();
            vd.vod_id = String(c.vod_id || '');
            vd.vod_name = c.vod_name || '';
            vd.vod_pic = c.vod_pic || '';
            vd.vod_remarks = c.vod_remarks || '';
            list.push(vd);
        }
        backData.data = list;
        backData.total = list.length;
    } catch (e) { backData.error = e.toString(); }
    return JSON.stringify(backData);
}

async function getSubclassVideoList(args) {
    var backData = new RepVideoList();
    try {
        var xptvArgs = { url: args.url, page: args.page || 1 };
        var result = await getCards(xptvArgs);
        var parsed = typeof result === 'string' ? JSON.parse(result) : result;
        var cards = parsed.list || [];
        var list = [];
        for (var i = 0; i < cards.length; i++) {
            var c = cards[i];
            var vd = new VideoDetail();
            vd.vod_id = String(c.vod_id || '');
            vd.vod_name = c.vod_name || '';
            vd.vod_pic = c.vod_pic || '';
            vd.vod_remarks = c.vod_remarks || '';
            list.push(vd);
        }
        backData.data = list;
        backData.total = list.length;
    } catch (e) { backData.error = e.toString(); }
    return JSON.stringify(backData);
}

async function getVideoDetail(args) {
    var backData = new RepVideoDetail();
    try {
        var xptvArgs = { url: args.url };
        var result = await getTracks(xptvArgs);
        var parsed = typeof result === 'string' ? JSON.parse(result) : result;
        var groups = parsed.list || [];
        var vd = new VideoDetail();
        vd.vod_id = String(args.url);
        var playFromParts = [];
        var playUrlParts = [];
        for (var g = 0; g < groups.length; g++) {
            var group = groups[g];
            playFromParts.push(group.title || ('线路' + (g + 1)));
            var trackParts = [];
            var tracks = group.tracks || [];
            for (var t = 0; t < tracks.length; t++) {
                var track = tracks[t];
                var trackName = track.name || ('第' + (t + 1) + '集');
                var trackUrl = track.url || track.playUrl || '';
                trackParts.push(trackName + '$' + trackUrl);
            }
            playUrlParts.push(trackParts.join('#'));
        }
        vd.vod_play_from = playFromParts.join('$$$');
        vd.vod_play_url = playUrlParts.join('$$$');
        backData.data = vd;
    } catch (e) { backData.error = e.toString(); }
    return JSON.stringify(backData);
}

async function getVideoPlayUrl(args) {
    var backData = new RepVideoPlayUrl();
    try {
        var xptvArgs = { url: args.url };
        var result = await getPlayinfo(xptvArgs);
        var parsed = typeof result === 'string' ? JSON.parse(result) : result;
        if (parsed.urls && parsed.urls.length > 0) {
            for (var i = 0; i < parsed.urls.length; i++) {
                backData.urls.push({
                    url: parsed.urls[i],
                    headers: parsed.headers || [],
                });
            }
        }
    } catch (e) { backData.error = e.toString(); }
    return JSON.stringify(backData);
}

async function searchVideo(args) {
    var backData = new RepVideoList();
    try {
        var xptvArgs = { searchWord: args.searchWord, page: args.page || 1 };
        var result = await search(xptvArgs);
        var parsed = typeof result === 'string' ? JSON.parse(result) : result;
        var cards = parsed.list || [];
        var list = [];
        for (var i = 0; i < cards.length; i++) {
            var c = cards[i];
            var vd = new VideoDetail();
            vd.vod_id = String(c.vod_id || '');
            vd.vod_name = c.vod_name || '';
            vd.vod_pic = c.vod_pic || '';
            vd.vod_remarks = c.vod_remarks || '';
            list.push(vd);
        }
        backData.data = list;
        backData.total = list.length;
    } catch (e) { backData.error = e.toString(); }
    return JSON.stringify(backData);
}
