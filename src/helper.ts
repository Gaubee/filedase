import path = require("path");
import fs = require("fs");

const empty_array: any[] = [];
export function obj_has(obj_big: any, obj_small: any): boolean {
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
                } else {
                    result = false;
                }
                if (result === false) {
                    break;
                }
            }
        }
    }
    return result;
};
export function sortBy(arr: any[], key: string, asc: boolean) {
    var _arr_map: any = {};
    var _arr_keys: any[] = [];
    //根据值保存对象到集合和值数组
    arr.forEach(function (item) {
        var value = item[key];
        var _arr_set = _arr_map[value];
        if (!_arr_set) {
            _arr_set = _arr_map[value] = [];
            _arr_keys.push(value)
        }
        _arr_set.push(item);
    });
    if (typeof _arr_keys[0] === "number") {
        function _asc_number_sort(a: number, b: number) {
            return b - a
        }

        function _number_sort(a: number, b: number) {
            return a - b
        }
        _arr_keys.sort(asc ? _asc_number_sort : _number_sort);
    } else {
        //排序值数组
        _arr_keys.sort();
        //倒序
        if (asc) {
            _arr_keys.reverse();
        }
    }
    var result: any[] = [];
    //根据值数组排列对象集
    _arr_keys.forEach(function (value) {
        result = result.concat(_arr_map[value]);
    });
    return result;
}
export function clearNull(arr: any[]) {
    return arr.filter(function (item) {
        if (item === undefined || item === null || item === "") {
            return false
        }
        return true;
    });
};
export function mkdirSync(url: string, mode?: number) {
    var arr = url.split(path.sep);
    mode = mode || 0o755;
    if (arr[0] === "") {
        arr.shift();
        arr[0] = path.sep + arr[0];
    }
    if (arr[0] === ".") { //处理 ./aaa
        arr.shift();
    }
    if (arr[0] == "..") { //处理 ../ddd/d
        arr.splice(0, 2, arr[0] + path.sep + arr[1])
    }
    arr = clearNull(arr);

    function inner(cur: string) {
        // console.log("cur:", cur);
        if (!fs.existsSync(cur)) { //不存在就创建一个
            fs.mkdirSync(cur, mode)
        }
        if (arr.length) {
            inner(cur + path.sep + arr.shift());
        }
    }
    arr.length && inner(<string>arr.shift());
};