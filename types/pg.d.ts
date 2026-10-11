declare module "pg" {
  export type QueryResult<T = any> = { rows: T[]; rowCount: number | null };
  export type PoolClient = {
    query<T = any>(text: string, values?: any[]): Promise<QueryResult<T>>;
    release(): void;
  };
  export class Pool {
    constructor(config?: Record<string, unknown>);
    query<T = any>(text: string, values?: any[]): Promise<QueryResult<T>>;
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
  }
}
