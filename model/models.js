const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/baijia');

let newsScheme = mongoose.Schema({
    title: String,
    createtime: String,
    summary: String,
    content: String,
    tag: Array,
    catagory: Array,
    image: Array,
});

let News = mongoose.model('News', newsScheme);

exports.News = News;