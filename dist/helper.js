"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const empty_array = [];
function obj_has(obj_big, obj_small) {
    //non-Object
    var result = obj_big === obj_small;
    if (!result && String(obj_big) === String(obj_small) /*RegExp,Function*/) {
        var keys_big = obj_big instanceof Object ? Object.keys(obj_big) : empty_array;
        var keys_small = obj_small instanceof Object ? Object.keys(obj_small) : empty_array;
        if (keys_big.length >= keys_small.length) {
            result = true;
            for (var i = 0; i < keys_small.length; i += 1) {
                var key = keys_small[i];
                if (obj_big.hasOwnProperty(key)) {
                    var obj_a = obj_big[key];
                    var obj_b = obj_small[key];
                    if (obj_a !== obj_b) {
                        result = obj_has(obj_a, obj_b);
                    }
                }
                else {
                    result = false;
                }
                if (result === false) {
                    break;
                }
            }
        }
    }
    return result;
}
exports.obj_has = obj_has;
;
function sortBy(arr, key, asc) {
    var _arr_map = {};
    var _arr_keys = [];
    //根据值保存对象到集合和值数组
    arr.forEach(function (item) {
        var value = item[key];
        var _arr_set = _arr_map[value];
        if (!_arr_set) {
            _arr_set = _arr_map[value] = [];
            _arr_keys.push(value);
        }
        _arr_set.push(item);
    });
    if (typeof _arr_keys[0] === "number") {
        function _asc_number_sort(a, b) {
            return b - a;
        }
        function _number_sort(a, b) {
            return a - b;
        }
        _arr_keys.sort(asc ? _asc_number_sort : _number_sort);
    }
    else {
        //排序值数组
        _arr_keys.sort();
        //倒序
        if (asc) {
            _arr_keys.reverse();
        }
    }
    var result = [];
    //根据值数组排列对象集
    _arr_keys.forEach(function (value) {
        result = result.concat(_arr_map[value]);
    });
    return result;
}
exports.sortBy = sortBy;
function clearNull(arr) {
    return arr.filter(function (item) {
        if (item === undefined || item === null || item === "") {
            return false;
        }
        return true;
    });
}
exports.clearNull = clearNull;
;
function mkdirSync(url, mode) {
    var arr = url.split(path.sep);
    mode = mode || 0o755;
    if (arr[0] === "") {
        arr.shift();
        arr[0] = path.sep + arr[0];
    }
    if (arr[0] === ".") {
        arr.shift();
    }
    if (arr[0] == "..") {
        arr.splice(0, 2, arr[0] + path.sep + arr[1]);
    }
    arr = clearNull(arr);
    function inner(cur) {
        // console.log("cur:", cur);
        if (!fs.existsSync(cur)) {
            fs.mkdirSync(cur, mode);
        }
        if (arr.length) {
            inner(cur + path.sep + arr.shift());
        }
    }
    arr.length && inner(arr.shift());
}
exports.mkdirSync = mkdirSync;
;
