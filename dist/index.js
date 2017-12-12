"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dateFormat = require("dateformat");
const fs = require("fs");
const os = require("os");
const FileBase_1 = require("./FileBase");
exports.default = FileBase_1.default;
function filebaseInit(dbname = "default") {
    const db = new FileBase_1.default(`filebase-${dbname}.fdb.js`, os.tmpdir() + "/filebase");
    setInterval(function () {
        db.backup(db.db_root + "data.cache." + dateFormat(new Date, "yy-MM-dd[HH=mm=ss]") + ".json");
        var r = /data\.cache\.(\d\d)\-(\d\d)\-(\d\d)\[(\d\d)\=(\d\d)\=(\d\d)\]\.json/;
        var timeline = 3 * 24 * 60 * 60 * 1000; //3天72小时
        fs.readdirSync(__dirname + "/.db/").forEach(function (fileName) {
            var match_info = fileName.match(r);
            if (match_info) {
                var date = new Date("20" + match_info.slice(1, 4).join("/") + " " + match_info.slice(4).join(":"));
                if ((+new Date() - timeline) > +date) {
                    fs.unlinkSync(__dirname + "/.db/" + fileName);
                }
            }
        });
    }, 3 * 60 * 60 * 1000); //3小时进行一次数据备份，删除3天前的数据
    process.on('uncaughtException', function (err) {
        console.info("进程未知错误，强行备份数据", err, err.stack);
        db.backup();
    });
    function _on_db_exit(type) {
        return function () {
            console.info("进程意外中断，强行备份数据", type);
            db.backup();
            process.exit();
        };
    }
    ;
    process.on('SIGHUP', _on_db_exit("SIGHUP"));
    process.on('SIGINT', _on_db_exit("SIGINT"));
    process.on('SIGQUIT', _on_db_exit("SIGQUIT"));
    process.on('SIGABRT', _on_db_exit("SIGABRT"));
    process.on('SIGTERM', _on_db_exit("SIGTERM"));
    return db;
}
exports.filebaseInit = filebaseInit;
