const SimpleCrawler = require('simplecrawler');
const cheerio = require('cheerio');
const htmlDecode = require('js-htmlencode').htmlDecode;
const request = require('request');
const fs = require('graceful-fs');
const async = require('async');
const log4js = require('log4js');
const url = require('url');
const models = require("./model/models");
const utils = require('./util/utils');

const crawler_url = 'http://baijia.baidu.com';
// listUrlExample: http://baijia.baidu.com/?tn=listarticle&labelid=100
// ajaxUrlExample: http://baijia.baidu.com/ajax/labellatestarticle?page=2&pagesize=20&labelid=100&prevarticalid=730032
// pageUrlExample: http://zongning.baijia.baidu.com/article/730039

const crawler =  new SimpleCrawler(crawler_url);
let listUrlArr = []; // 分类url数组
let pageUrlArr = []; // 文章url数组
let fuckNumber = 1;

log4js.configure({
    appenders: [{
        // type: 'DataFile',
        type: 'file',
        filename: 'debug.log',
        // pattern: '-yyyy-MM-dd.log',
        // alwaysIncludePattern: true,
        // category: 'access'
    }]
});
let logger = log4js.getLogger();


// config crawler
crawler.discoverResources = false; // 禁用自动搜索资源
crawler.userAgent = utils.getRandomUseragent();
crawler.respectRobotsTxt = false;
// crawler.interval = 1000;
crawler.maxConcurrency = 1000;
crawler.filterByDomain = false;


crawler.on("fetchcomplete", (queueItem, data, res) => {
    const $ = cheerio.load(data);

    // fetch list url
    if (queueItem.url === 'http://baijia.baidu.com/') {
        $("#menu a").each(function(index, value){
            if ($(this).attr("href") !== "http://baijia.baidu.com") {
                listUrlArr.push($(this).attr("href"));
            }
        });
        // push to crawler queue
        pushToCrawler(listUrlArr, queueItem);
        return false;
    }

    // fetch page url
    if (url.parse(queueItem.url, true).query.tn === "listarticle") {
        let lastId = $(".feeds-item:last-child").attr("id").replace(/[item-]/g,"");
        // let tempArr = [];

        $("#feeds .feeds-item").each(function(index, value){
            pageUrlArr.push($(this).find("h3 a").attr("href"));
            // tempArr.push($(this).find("h3 a").attr("href"));
        });

        /*setTimeout(function() {
            console.log("start ajax");
            // goAjax(2, url.parse(queueItem.url, true).query.labelid, lastId, queueItem);
            goAjax(2, url.parse(queueItem.url, true).query.labelid);
        }, 0);*/

        // pushToCrawler(pageUrlArr.splice(0, pageUrlArr.length), queueItem.referrer);
        goAjax(2, url.parse(queueItem.url, true).query.labelid, lastId, queueItem);
        // pushToCrawler(tempArr, queueItem);

        return false;
    }

    // fetch page info
    if (queueItem.url.split("/").indexOf("article") > -1) {
        let picUrlArr = [];
        let picLocalUrlArr = [];
        let picNameArr = [];
        const $ = cheerio.load(data);
        let title = $("#page h1").text();
        let createtime = $("#page span.time").text();
        let summary = $("#page blockquote").text();
        let tag = [];
        let catagory = $("#page .category").text();
        let content;

        $("#page .tag").each(function(index, value){
            tag.push($(this).text());
        });

        // download image
        $(".article-detail img").each(function(index, value){
            let oldUrl = $(this).attr("src");
            picUrlArr.push(oldUrl);
            $(this).attr("src", 'img/'+oldUrl.split('/').pop());
            // picLocalUrlArr.push($(this).attr('src'));
        });

        content = htmlDecode($(".article-detail").html());

        let concurrencyCount = 0;

        async.mapLimit(picUrlArr, 100, function(pic, callback){
            // download to local
            let picName = pic.split("/").pop();
            let localUrl = 'img/' + picName;
            picNameArr.push(picName);

            fs.exists(localUrl, function(exists){
                if (exists) {
                    console.log(`file exists: ${picName}`);
                    return false;
                    callback(null, 'exists');
                } else {
                    concurrencyCount++;
                    console.log(`并发数：${concurrencyCount}, fetching: ${pic}`)
                    request(pic).on('error', function(error){
                            logger.debug("picRequest", error);
                            return false;
                        }).pipe(fs.createWriteStream(localUrl)).on('close', function(){
                            console.log(`fetched: ${pic}`);
                            concurrencyCount--;
                            callback(null, "next");
                        });
                }
            });
        }, function(err, result){
            if (err) logger.debug("asyncError", err);
            new models.News({
                title,
                createtime,
                summary,
                tag,
                catagory,
                content,
                image: picNameArr,
            }).save(function (err) {
                if (err) return logger.debug("saveError", err);
                console.log("saved to db");
            });
        });
    }

    // push to crawler queue
    /*if (pageUrlArr.length > 0) {
        pushToCrawler(pageUrlArr.splice(0, 10), queueItem.referrer);
    }*/

});

// 发送ajax请求文章列表分页
function goAjax (page=2, labelid, prevarticalid, queueItem) {
// function goAjax (page=2, labelid, prevarticalid) {
    let url = `http://baijia.baidu.com/ajax/labellatestarticle?page=${page}&pagesize=20&labelid=${labelid}&prevarticalid=${prevarticalid}`
    request(url, function(error, response, body){
        let list = JSON.parse(body).data.list;
        let lastId;

        // 出错的时候，list为undefined
        if (!list) {
            console.log("list fucked");
            return false;
        }

        lastId = list[list.length-1].ID;

        for (let i = 0; i < list.length; i++) {
            pageUrlArr.push(list[i].m_display_url);
        }

        /*if (pageUrlArr.length > 0) {
            pushToCrawler(pageUrlArr.splice(0, 10), queueItem.referrer);
        }*/
        // goAjax(page+1, labelid, lastId, queueItem);
        pushToCrawler(pageUrlArr.splice(0, 10), queueItem);
        goAjax(page+1, labelid, lastId, queueItem);
    })
}

// 推送到爬虫队列
function pushToCrawler (urlArr, queueItem) {
    for (let i=0; i<urlArr.length; i++) {
        // console.log(`now push: ${urlArr[i]}`);
        crawler.queueURL(urlArr[i], {
            url: queueItem.url,
            depth: queueItem.depth,
            status: queueItem.status,
            fetched: queueItem.fetched,
            protocol: queueItem.protocol,
            host: queueItem.host,
            port: queueItem.port,
            path: queueItem.path
        }, false);
    }
}

crawler.on('queueerror', (error, URLData) => {
    console.log("排队错误");
    console.log(error);
    console.log(URLData);
});
crawler.on('fetchdataerror', (error, queueItem) => {
    console.log(`爬取${queueItem.url}出错`);
})
crawler.on('downloadprevented', (queueItem, res) => {
    console.log(`下载${queueItem.url}出错`);
});
crawler.on('fetchdisallowed', (queueItem) => {
    console.log(`不准爬取${queueItem.url}`);
});
crawler.on('queueduplicate', (URLData)=> {
    console.log(`队列重复${URLData}`);
});
crawler.on('fetchtimeout', (queueItem) => {
    console.log(`爬取超时${queueItem.url}`);
});
crawler.on('fetchclienterror', (queueItem, errorData) => {
    console.log(errorData);
    console.log(`客户端错误${queueItem.url}`);
});
crawler.on("queueadd", function(queueItem){
    if (queueItem) {
        console.log(`--> ${queueItem.url}  the depth: ${queueItem.depth}`);
    }
});
crawler.on("queueerror", function(queueItem){
    console.log(`xxx ${queueItem.url}`);
});
crawler.on("robotstxterror", function(queueItem){
    console.log(`xxx ${queueItem.url}`);
});

crawler.on('complete', () => {
    console.log(`完成了？`);
    return false;
});

crawler.start();

