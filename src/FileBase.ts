import { EventEmitter } from 'events';
import fs = require('fs');
import path = require('path');
import { obj_has, sortBy, mkdirSync } from './helper';

const PRE_FILE_RANGE = 1000;
export default class FileBase extends EventEmitter {
    static readonly PRE_FILE_RANGE = PRE_FILE_RANGE;
    private __file_content: string;
    private _index: any;
    private _db: any;
    db_file_path: string;
    constructor(
        public readonly db_file_name: string,
        public readonly db_root: string
    ) {
        super();

        this.db_file_name = path.basename(this.db_file_name);
        if (!db_file_name.endsWith('.fdb.js')) {
            throw new URIError('filebase filename must endwith .fdb.js');
        }

        this.db_root = path.normalize(this.db_root) + path.sep;
        mkdirSync(this.db_root);
        this.db_file_path = path.join(this.db_root, this.db_file_name);

        if (fs.existsSync(this.db_file_path)) {
            this._db = require(this.db_file_path);
            this.__file_content = fs.readFileSync(this.db_file_path).toString();
        } else {
            this._db = {};
            this.__file_content = '';
        }
        this.refreshIndex();
    }
    id_key = '_id';
    get backup_file_path() {
        return this.db_root + this.db_file_name + '.bak.json';
    }
    backup(backup_file_path: string = this.backup_file_path) {
        console.time('parse_data');
        var _data = JSON.stringify(this._db);
        console.timeEnd('parse_data');
        console.time('update_data');
        if (_data) {
            fs.writeFileSync(backup_file_path, _data);
        }
        console.timeEnd('update_data');
    }
    just_in_memory = false;
    private __updateCache(
        tableName: string,
        range_start?: number,
        range_end?: number
    ) {
        if (this.just_in_memory) {
            return;
        }
        var table = this._db[tableName];
        if (range_start) {
            range_start =
                Math.floor(range_start / PRE_FILE_RANGE) * PRE_FILE_RANGE;
        } else {
            range_start = 0;
        }
        if (range_end) {
            range_end = Math.ceil(range_end / PRE_FILE_RANGE) * PRE_FILE_RANGE; // Math.min(range_end, table.length)
        } else {
            range_end =
                Math.ceil(table.length / PRE_FILE_RANGE) * PRE_FILE_RANGE;
        }
        var _range_start = range_start;
        var _range_end = Math.min(range_end, _range_start + PRE_FILE_RANGE);
        var _task_name;
        while (_range_start < _range_end) {
            _task_name = ` <${tableName}>[${_range_start}, ${_range_end}]`;
            //取出指定范围的数据，解析成JSON
            console.time('[parse  data]' + _task_name);
            var _data = table.slice(_range_start, _range_end);
            _data = JSON.stringify(_data);
            console.timeEnd('[parse  data]' + _task_name);

            //写入文件
            console.time('[update data]' + _task_name);
            var _file_name = `${tableName}-${_range_start}-${_range_end}.json`;
            fs.writeFileSync(this.db_root + '/' + _file_name, _data);
            console.timeEnd('[update data]' + _task_name);

            //将数据文件写入集合
            if (this.__file_content.indexOf(_file_name) == -1) {
                var _placeholder = `\/\/---${tableName}---\n`;
                if (
                    this.__file_content.indexOf(`\/\/---${tableName}---`) === -1
                ) {
                    this.__file_content += `exports.${tableName} = [];\n${_placeholder}`;
                }
                this.__file_content = this.__file_content.replace(
                    _placeholder,
                    `    exports.${tableName} = exports.${tableName}.concat(require('./${_file_name}'));\n${_placeholder}`
                );
            }
            _range_start = _range_end;
            _range_end = Math.min(range_end, _range_end + PRE_FILE_RANGE);
        }
        _task_name && fs.writeFileSync(this.db_file_path, this.__file_content);
    }
    private _ti: { [key: string]: NodeJS.Timer } = {};
    private _updateCache(
        tableName: string,
        range_start?: number,
        range_end?: number
    ) {
        var ti_key = `${tableName}-${range_start}-${range_end}`;
        clearTimeout(this._ti[ti_key]);
        this._ti[ti_key] = setTimeout(() => {
            this.__updateCache(tableName, range_start, range_end);
            delete this._ti[ti_key];
        }, 1000);
    }
    private _updateCacheByIndex(
        tableName: string,
        _index: any,
        _to_end?: boolean
    ) {
        //一千条数据为一个范围
        var _range_start = Math.floor(_index / PRE_FILE_RANGE) * PRE_FILE_RANGE;
        var _range_end;
        if (_to_end) {
            _range_end = Math.ceil(_index / PRE_FILE_RANGE) * PRE_FILE_RANGE;
            if (_range_start == _range_end) {
                //1000:index:0~999
                _range_end += PRE_FILE_RANGE;
            }
        }
        this._updateCache(tableName, _range_start, _range_end);
    }
    insert(table_name: string, obj: any, index: string) {
        table_name = table_name.toLowerCase();
        var table = this._db[table_name];
        if (!table) {
            //创建表
            table = this._db[table_name] = [];
            //初始化索引
            this._index[table_name] = {};
        }
        var table_index = this._index[table_name];
        //根据ID判断是否存在这条数据，避免update后再insert，确保ID唯一性
        if (!table_index[obj[this.id_key]]) {
            //新数据，直接插入
            var __index = table.push(obj) - 1;
        } else {
            //update模式
            return this.update(table_name, obj[this.id_key] || index, obj);
        }
        if (obj[this.id_key] || (obj[this.id_key] = index)) {
            //更新索引
            table_index[obj[this.id_key]] = obj;
        }

        this._updateCacheByIndex(table_name, __index);

        this.emit('insert', table_name, obj);
    }
    update(
        table_name: string,
        obj_index: string,
        obj: any,
        _is_cover?: boolean
    ) {
        table_name = table_name.toLowerCase();
        var old_obj = this.find_by_id(table_name, obj_index);
        if (old_obj) {
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    old_obj[key] = obj[key];
                }
            }
            if (_is_cover) {
                for (var key in old_obj) {
                    if (!obj.hasOwnProperty(key)) {
                        delete old_obj[key];
                    }
                }
            }
            obj[this.id_key] = obj_index;
            //更新索引的对象
            this._index[table_name][old_obj[this.id_key]] = old_obj;
            this._updateCacheByIndex(
                table_name,
                this._db[table_name].indexOf(old_obj)
            );
        } else {
            this.insert(table_name, obj, obj_index);
        }
    }
    find_by_id<T = any>(table_name: string, id: string): T | undefined {
        table_name = table_name.toLowerCase();
        var table_index = this._index[table_name];
        if (table_index) {
            return table_index[id];
        }
    }
    find_one<T = any>(table_name: string, obj: any): T | undefined {
        table_name = table_name.toLowerCase();
        var table = this._db[table_name];
        if (table instanceof Array) {
            for (var i = 0; i < table.length; i += 1) {
                var item_obj = table[i];
                if (item_obj && obj_has(item_obj, obj)) {
                    return item_obj;
                }
            }
        }
    }
    find_last_one<T = any>(
        table_name: string,
        obj: any,
        sort_key: string,
        no_asc?: boolean
    ): T | undefined {
        //默认是大~小
        table_name = table_name.toLowerCase();
        var table = this._db[table_name];
        var result;
        if (table instanceof Array) {
            table = this._sortBy(table, sort_key, !no_asc);
            for (var i = table.length - 1, item_obj; i >= 0; i -= 1) {
                item_obj = table[i];
                if (item_obj && obj_has(item_obj, obj)) {
                    result = item_obj;
                    break;
                }
            }
        }
        return result;
    }
    find_list<T = any>(
        table_name: string,
        obj: any,
        num?: number,
        page?: number
    ): T[] {
        num || (num = Number.MAX_VALUE);
        page || (page = 0);
        var _start_index = num * page || 0;
        table_name = table_name.toLowerCase();
        var table = this._db[table_name];
        var result = [];
        if (table instanceof Array) {
            for (
                var i = _start_index, item_obj, len = table.length;
                i < len;
                i += 1
            ) {
                item_obj = table[i];
                if (item_obj && obj_has(item_obj, obj)) {
                    result.push(item_obj);
                }
                if (result.length > num) {
                    break;
                }
            }
        }
        return result;
    }
    find_all<T = any>(table_name: string): T[] {
        table_name = table_name.toLowerCase();
        return this._db[table_name] || [];
    }
    remove(table_name: string, obj_index: string) {
        table_name = table_name.toLowerCase();
        var table = this._db[table_name];
        if (!(table instanceof Array)) {
            return;
        }
        var __index: false | number = false;
        table.every((obj, index) => {
            if (obj && obj[this.id_key] === obj_index) {
                __index = index;
                //保持数据长度，替换为无用的null对象
                table.splice(index, 1, null);
                return false;
            }
            return true;
        });
        if (__index !== false) {
            //移除索引中的数据
            this._index[table_name][obj_index] = null;
            //因为是删除，所以列表后面的数据都有受到变动
            this._updateCacheByIndex(table_name, __index);
        }
    }
    remove_list(table_name: string, obj: any) {
        var remover_list = this.find_list(table_name, obj);
        remover_list.forEach(remover => {
            this.remove(table_name, remover[this.id_key]);
        });
    }
    remove_all(table_name: string) {
        table_name = table_name.toLowerCase();
        this._db[table_name] = [];
        this._index[table_name] = {};
        this._updateCache(table_name);
    }
    fix_no_id_data(table_name: string) {
        table_name = table_name.toLowerCase();
        var table: any[] = this._db[table_name];
        var new_table: any[] = [];
        table.forEach(item => {
            if (item[this.id_key]) {
                new_table.push(item);
            }
        });
        this._db[table_name] = new_table;
        this._refreshIndex_by_tableName(table_name);
        this._updateCache(table_name);
    }
    refreshIndex() {
        //重置索引，消除数组冗余
        this._index = {};
        var $exports_list = [];
        for (var tableName in this._db) {
            this._refreshIndex_by_tableName(tableName);
            // this._create_table(tableName);
        }
    }
    private _create_table(tableName: string) {
        var tablePath = this.db_root + '/' + tableName;
        var _no_need_create_dir = false;
        if (fs.existsSync(tablePath)) {
            _no_need_create_dir = fs.statSync(tablePath).isDirectory();
        }
        if (!_no_need_create_dir) {
            fs.mkdirSync(tablePath);
        }
    }
    private _refreshIndex_by_tableName(tableName: string) {
        if (this._db.hasOwnProperty(tableName)) {
            var table: any = (this._index[tableName] = {});
            var _arr = this._db[tableName];
            if (_arr instanceof Array) {
                for (var i = 0, len = _arr.length; i < len; i += 1) {
                    var obj = _arr[i];
                    if (!obj) {
                        //空对象，忽略过
                        continue;
                    }
                    var old_obj = table[obj[this.id_key]];
                    if (old_obj) {
                        //删除冗余数据
                        _arr.splice(_arr.indexOf(old_obj), 1);
                        i -= 1;
                    }
                    table[obj[this.id_key]] = obj;
                }
            }
        }
    }
    mulCall(method: string, args: any[]) {
        var method_name_map = {
            insert: 'insert',
            findAll: 'find_all',
            findOne: 'find_one',
            findById: 'find_by_id',
            findList: 'find_list',
            update: 'update',
            remove: 'remove'
        };
        var method_foo = (<any>this)[(<any>method_name_map)[method]];
        if (!method_foo) {
            throw new TypeError(`method: ${method} no found.`);
        }
        return args.map(params => {
            return method_foo.apply(this, params);
        });
    }
    //排序函数
    _sortBy = sortBy;
    _obj_has = obj_has;
}
