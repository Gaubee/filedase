/// <reference types="node" />
import { EventEmitter } from 'events';
import { obj_has, sortBy } from './helper';
export default class FileBase extends EventEmitter {
    readonly db_file_name: string;
    readonly db_root: string;
    static readonly PRE_FILE_RANGE: number;
    private __file_content;
    private _index;
    private _db;
    db_file_path: string;
    constructor(db_file_name: string, db_root: string);
    id_key: any;
    readonly backup_file_path: string;
    backup(backup_file_path?: string): void;
    just_in_memory: boolean;
    private __updateCache(tableName, range_start?, range_end?);
    private _ti;
    private _updateCache(tableName, range_start?, range_end?);
    private _updateCacheByIndex(tableName, _index, _to_end?);
    insert(table_name: string, obj: any, index: string): void;
    update(table_name: string, obj_index: string, obj: any, _is_cover?: boolean): void;
    find_by_id<T = any>(table_name: string, id: string): T | undefined;
    find_one<T = any>(table_name: string, obj: any): T | undefined;
    find_last_one<T = any>(table_name: string, obj: any, sort_key: string, no_asc?: boolean): T | undefined;
    find_list<T = any>(table_name: string, obj: any, num?: number, page?: number): T[];
    find_all<T = any>(table_name: string): T[];
    remove(table_name: string, obj_index: string): void;
    remove_list(table_name: string, obj: any): void;
    remove_all(table_name: string): void;
    fix_no_id_data(table_name: string): void;
    refreshIndex(): void;
    private _create_table(tableName);
    private _refreshIndex_by_tableName(tableName);
    mulCall(method: string, args: any[]): any[];
    _sortBy: typeof sortBy;
    _obj_has: typeof obj_has;
}
