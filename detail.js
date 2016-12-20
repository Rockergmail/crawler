const SimpleCrawler = require('simplecrawler');
const cheerio = require('cheerio');
const htmlDecode = require('js-htmlencode').htmlDecode;
const request = require('request');
const fs = require('fs');
const async = require('async');
const url = require('url');
const mongoose = require('mongoose');

// config mongodb
mongolass.connect('mongodb://localhost:27017/rockme');
const News = mongolass.model('News', {
    title: { type: 'string'},
    createtime: { type: 'string'},
    summary: { type: 'string'},
    tag:,
    catagory:,
    image:,
})

const crawler_url = 'http://wangxinxi.baijia.baidu.com/article/728945';
const crawler = new SimpleCrawler(crawler_url);

// config crawler
crawler.discoverResources = false;

crawler.on("fetchcomplete", (queueItem, data, res) => {
    let picArr = [];
    const $ = cheerio.load(data);
    // console.log(htmlDecode($(".article-detail").html()));
    // TODO: download image
    $(".article-detail img").each(function(index, value){
        picArr.push($(this).attr('src'));
    });
    console.log(picArr);
    let concurrencyCount = 0;

    async.mapLimit(picArr, 3, function(pic, callback){
        // download to local
        let localUrl = 'img/' + pic.split("/").pop();
        // console.log(localUrl);
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
        console.log("=======================");
        console.log(err);
        console.log(result);
    });

    // TODO: 不能被人爬到我们的内容，因为有些文章是有版权的

});

crawler.start();

