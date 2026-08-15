declare module 'sql.js' {
  export interface SqlJsStatic {
    Database: typeof Database;
  }

  export interface QueryExecResult {
    columns: string[];
    values: unknown[][];
  }

  export class Database {
    constructor(data?: Buffer | ArrayBuffer | Uint8Array | number[]);
    close(): void;
    exec(sql: string, params?: unknown[]): QueryExecResult[];
    run(sql: string, params?: unknown[]): Database;
    prepare(sql: string, params?: unknown[]): unknown;
    export(): Uint8Array;
  }

  export interface SqlJsConfig {
    locateFile?: (url: string, scriptDirectory?: string) => string;
    wasmBinary?: ArrayBuffer;
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
}
