// ignore
//@name:未知源
//@version:1
//@webSite:
//@remark:移植自 XPTV kuaikaw.js
//@type:101
// ignore

// ============================================================
// uzVideo 扩展 - 自动转换自 XPTV kuaikaw.js
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

// 河马剧场 (kuaikaw.cn) - 微短剧 XPTV 源
//  Based on: https://www.kuaikaw.cn/
// 類型: 短剧/微短剧
// 特點: Next.js SSR 網站，資料嵌入在 __NEXT_DATA__ JSON 中
// 筆記: 封面圖為豎式 (vertical)，無需 ui:1；影片直鏈 MP4

const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const SITE = 'https://www.kuaikaw.cn'

// ========== 工具函數 ==========

// 從 HTML 提取 __NEXT_DATA__ JSON
function extractNextData(html) {
    const match = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>(\{.*?\})<\/script>/s)
    if (match) {
        try {
            return JSON.parse(match[1])
        } catch (e) {
            console.error('Failed to parse __NEXT_DATA__:', e)
        }
    }
    return null
}

// 生成 tmpid (用於 Search APIHEADers)
function buildTmpId() {
    // Simple UUID-like string (timestamp-based)
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

// 標準化Search API 的 book 對象為 XPTV card 格式
function normalizeSearchBook(book) {
    if (!book || !book.bookId) return null
    return {
        vod_id: book.bookId,
        vod_name: book.bookName,
        vod_pic: book.coverWap || '',
        vod_remarks: `${book.totalChapterNum || '?'}集`,
        vod_duration: book.statusDesc || '',
        vod_content: book.introduction || '',
        ext: { id: book.bookId, url: `${SITE}/drama/${book.bookId}` },
    }
}

// ========== XPTV 介面實作 ==========

// async function getLocalInfo() {
//     return jsonify({
//         ver: 1,
//         name: '河马剧场',
//         api: 'csp_kuaikaw',
//         type: 3,
//         descriptor: 'https://www.kuaikaw.cn/ 微短剧源',
//     })
// }

async function getConfig() {
    // 主分類頁面取得分類列表
    const resp = await $fetch.get(SITE + '/browse')
    const html = resp.data || ''
    const nextData = extractNextData(html)
    const tabs = []

    if (nextData && nextData.props && nextData.props.pageProps) {
        const typeThreeList = nextData.props.pageProps.typeThreeList || []
        typeThreeList.forEach((cat) => {
            // cat 格式: { name: '青春', typeThreeIds: [1170] } 或 { name: '全部', typeThreeIds: [0] }
            const ids = cat.typeThreeIds || []
            if (ids.length > 0) {
                tabs.push({
                    name: cat.name,
                    // category URL uses single ID or range "start-end"
                    ext: { id: ids[0].toString(), type: 'category' },
                })
            }
        })
    }

    // 如果無法取得分類，使用備用列表
    if (tabs.length === 0) {
        tabs.push({ name: '全部', ext: { id: '0', type: 'category' } })
    }

    return jsonify({
        ver: 1,
        title: '河马剧场',
        site: SITE,
        tabs: tabs,
    })
}

async function getCards(ext) {
    ext = argsify(ext)
    const { id = '0', page = 1 } = ext

    // Category page: /browse/{id} or /browse for all
    let url = id === '0' ? `${SITE}/browse` : `${SITE}/browse/${id}`
    if (page > 1) url += `?page=${page}`

    const resp = await $fetch.get(url)
    const html = resp.data || ''
    const nextData = extractNextData(html)
    const list = []

    if (nextData && nextData.props && nextData.props.pageProps) {
        const pageProps = nextData.props.pageProps
        // Category browse page uses 'bookList'
        const bookList = pageProps.bookList || []

        bookList.forEach((book) => {
            // Build detail URL
            const detailUrl = `${SITE}/drama/${book.bookId}`
            list.push({
                vod_id: book.bookId,
                vod_name: book.bookName,
                vod_pic: book.coverWap || '',
                vod_remarks: `${book.totalChapterNum}集 · ${book.followCount || ''}`.trim(),
                vod_duration: book.statusDesc || '',
                vod_content: book.introduction || '',
                ext: { id: book.bookId, url: detailUrl },
            })
        })
    }

    return jsonify({ list })
}

async function getTracks(ext) {
    ext = argsify(ext)
    const { id, url } = ext

    // Determine which URL to fetch
    let fetchUrl = url || `${SITE}/drama/${id}`
    // If only id is provided, construct detail URL
    if (id && !url) fetchUrl = `${SITE}/drama/${id}`

    // 如果是 episode URL，直接 fetch 那个页面
    const resp = await $fetch.get(fetchUrl)
    const html = resp.data || ''
    const nextData = extractNextData(html)

    const tracks = []

    if (nextData && nextData.props && nextData.props.pageProps) {
        const pageProps = nextData.props.pageProps
        const chapterList = pageProps.chapterList || []

        if (chapterList.length > 0) {
            // 有章节列表，按集數分组
            // chapterIndex 是数字，chapterName 是"第一集"等
            chapterList.forEach((ch) => {
                const trackUrl = `${SITE}/episode/${id}/${ch.chapterId}`
                tracks.push({
                    name: ch.chapterName || `第${ch.chapterIndex}集`,
                    ext: { url: trackUrl },
                })
            })
            return jsonify({ list: [{ title: '正片', tracks }] })
        }
    }

    // Fallback: no episodes found, return placeholder
    return jsonify({
        list: [
            {
                title: '播放',
                tracks: [
                    {
                        name: '点击播放',
                        ext: { url: fetchUrl },
                    },
                ],
            },
        ],
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    const { url } = ext

    if (!url) {
        return jsonify({ urls: [] })
    }

    // Fetch episode page to get video URL
    const resp = await $fetch.get(url)
    const html = resp.data || ''
    const nextData = extractNextData(html)

    if (nextData && nextData.props && nextData.props.pageProps) {
        const pageProps = nextData.props.pageProps
        const chapterList = pageProps.chapterList || []

        // The current chapterId is encoded in the URL
        // /episode/{bookId}/{chapterId}
        const match = url.match(/\/episode\/\d+\/(\d+)/)
        if (match) {
            const currentChapterId = match[1]
            // Find the matching chapter
            const chapter = chapterList.find((ch) => ch.chapterId === currentChapterId)
            if (chapter && chapter.chapterVideoVo) {
                const video = chapter.chapterVideoVo
                // Prefer mp4 URL (direct)
                const videoUrl = video.mp4 || video.m3u8 || video.vodMp4Url || ''
                if (videoUrl) {
                    const referer = SITE + '/'
                    return jsonify({
                        urls: [videoUrl.trim()],
                        headers: [{ 'User-Agent': UA, Referer: referer }],
                    })
                }
            }
        }
    }

    return jsonify({ urls: [] })
}

async function search(ext) {
    ext = argsify(ext)
    const { text, page = 1 } = ext
    if (!text) return jsonify({ list: [] })

    const currentPage = parseInt(page, 10) || 1

    // ===== Strategy 1: Search API (sourceType: 2) =====
    try {
        const apiUrl = `${SITE}/seo/video/6007`
        const payload = JSON.stringify({
            sourceType: 2,
            keyword: text,
            index: currentPage,
        })
        const apiHeaders = {
            'Content-Type': 'application/json',
            'User-Agent': UA,
            Referer: `${SITE}/search?searchValue=${encodeURIComponent(text)}`,
            tmpid: buildTmpId(),
        }

        // $fetch.post(url, body, options) — 3-parameter signature
        const apiResp = await $fetch.post(apiUrl, payload, { headers: apiHeaders })
        const raw = apiResp.data || '{}'
        const apiData = typeof raw === 'string' ? JSON.parse(raw) : raw
        const apiResult = apiData.data || {}
        const apiBookList = Array.isArray(apiResult.bookList) ? apiResult.bookList : []

        if (apiResp.status === 200 && apiData.retCode === 0 && apiBookList.length > 0) {
            const list = apiBookList.map(normalizeSearchBook).filter(Boolean)
            const total = Number(apiResult.totalSize) || list.length
            return jsonify({
                list,
                page: currentPage,
                pagecount: Math.max(1, Math.ceil(total / 10)),
                limit: 10,
                total,
            })
        }
    } catch (e) {
        console.error('Search API error (non-fatal):', e.message)
        // Fall back to HTML scraping
    }

    // ===== Strategy 2: HTML fallback (client-rendered, may have no results) =====
    try {
        const searchUrl = `${SITE}/search?searchValue=${encodeURIComponent(text)}&page=${currentPage}`
        const resp = await $fetch.get(searchUrl)
        const html = resp.data || ''
        const nextData = extractNextData(html)

        if (nextData && nextData.props && nextData.props.pageProps) {
            const pageProps = nextData.props.pageProps
            const bookList = pageProps.bookList || []
            const list = bookList.map(normalizeSearchBook).filter(Boolean)

            return jsonify({
                list,
                page: currentPage,
                pagecount: pageProps.pages || 1,
                limit: 20,
                total: list.length,
            })
        }
    } catch (e) {
        console.error('Search HTML fallback error:', e.message)
    }

    // ===== No results =====
    return jsonify({ list: [], page: currentPage, pagecount: 1, limit: 10, total: 0 })
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
