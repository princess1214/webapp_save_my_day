declare module "pg" {
  export class Pool {
    constructor(config?: Record<string, unknown>);
    query<T = any>(text: string, values?: any[]): Promise<{ rows: T[]; rowCount: number | null }>;
    end(): Promise<void>;
  }
}
