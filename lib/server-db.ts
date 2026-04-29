export const db = {
  async execute(_q:any){ return { rows: [] as any[] }; },
  async batch(_q:any,_mode?:any){ return []; },
};
export async function initDb(){}
