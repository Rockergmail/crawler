const SimpleCrawler = require('simplecrawler');
const cheerio = require('cheerio');
const htmlDecode = require('js-htmlencode').htmlDecode;
const request = require('request');
const fs = require('fs');
const async = require('async');
const url = require('url');
// const push_to_crawler = require('')

const crawler_url = 'http://wangxinxi.baijia.baidu.com/article/728945';
const crawler = new SimpleCrawler(crawler_url);

// config crawler
crawler.discoverResources = false;

crawler.on("fetchcomplete", (queueItem, data, res) => {
    let picUrlArr = [];
    let picNameArr = [];
    const $ = cheerio.load(data);
    let title = $("#page h1").text();
    let createtime = $("#page span.time").text();
    let summary = $("#page .iquote").text();
    let tag = [];
    let catagory = $("#page .category").text();
    let content;

    $("#page .tag").each(function(index, value){
        tag.push($(this).text());
    });

    // download image
    $(".article-detail img").each(function(index, value){
        let oldUrl = $(this).attr("src");
        $(this).attr("src", 'img/'+oldUrl.split('/').pop());
        picUrlArr.push($(this).attr('src'));
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
                console.log("file exists");
                callback(null, 'exists');
            } else {
                concurrencyCount++;
                console.log(`并发数：${concurrencyCount}, now fetching: ${pic}`)
                request(pic)
                    .pipe(fs.createWriteStream(localUrl))
                    .on('close', function(){
                        console.log(`Done: ${pic}`);
                        concurrencyCount--;
                        callback(null, "next");
                    });
            }
        });
    }, function(err, result){
        if (err) console.log(err);
        console.log(result)
        new News({
            title,
            createtime,
            summary,
            tag,
            catagory,
            content,
            image: picNameArr,
        }).save(function (err) {
            if (err) return console.log(err);
        });
    });

    // TODO: 不能被人爬到我们的内容，因为有些文章是有版权的

});

crawler.start();
