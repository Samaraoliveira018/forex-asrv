import type { SupabaseClientLike } from '../infrastructure/supabaseClient';

type Row = Record<string, unknown>;
type Filter = { column: string; value: unknown };

interface QueryOptions {
  onConflict?: string;
  ignoreDuplicates?: boolean;
}

type QueryResult = { data: unknown; error: { message: string } | null };

/**
 * Cliente Supabase falso, com apenas o subconjunto usado pelos adaptadores.
 * Simula tabelas, filtros, ordenação, upsert e estado de autenticação.
 */
export class FakeSupabase implements SupabaseClientLike {
  tables: { trades: Row[]; no_trade_days: Row[]; settings: Row[]; [key: string]: Row[] } = {
    trades: [],
    no_trade_days: [],
    settings: [],
  };

  session: { user: { id: string; email: string } } | null = null;
  offline = false;
  authListener: ((event: string, session: unknown) => void) | null = null;

  from(table: string): FakeQuery {
    if (this.offline) throw new Error('offline');
    return new FakeQuery(this, table);
  }

  auth = {
    getSession: async (): Promise<QueryResult> => {
      // Sessão fica no storage local: continua válida sem rede.
      return { data: { session: this.session }, error: null };
    },

    signInWithPassword: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }): Promise<QueryResult> => {
      if (this.offline) return { data: null, error: { message: 'offline' } };
      if (password === 'senha-errada') {
        return { data: null, error: { message: 'Invalid login credentials' } };
      }

      const user = { id: 'user-1', email };
      this.session = { user };
      this.authListener?.('SIGNED_IN', this.session);
      return { data: { user, session: this.session }, error: null };
    },

    signOut: async (): Promise<QueryResult> => {
      this.session = null;
      this.authListener?.('SIGNED_OUT', null);
      return { data: null, error: null };
    },

    onAuthStateChange: (listener: (event: string, session: unknown) => void) => {
      this.authListener = listener;
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              this.authListener = null;
            },
          },
        },
      };
    },
  };
}

export class FakeQuery {
  private op: 'select' | 'delete' | 'upsert' = 'select';
  private filters: Filter[] = [];
  private orderColumn: string | null = null;
  private ascending = true;
  private payload: Row | Row[] | null = null;
  private options: QueryOptions | undefined;

  constructor(
    private readonly client: FakeSupabase,
    private readonly table: string,
  ) {}

  select(): this {
    this.op = 'select';
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderColumn = column;
    this.ascending = options?.ascending ?? true;
    return this;
  }

  delete(): this {
    this.op = 'delete';
    return this;
  }

  upsert(payload: Row | Row[], options?: QueryOptions): Promise<{ error: { message: string } | null }> {
    this.op = 'upsert';
    this.payload = payload;
    this.options = options;
    return Promise.resolve(this.execute()).then(({ error }) => ({ error }));
  }

  maybeSingle(): Promise<QueryResult> {
    const result = this.execute();
    const rows = Array.isArray(result.data) ? result.data : [];
    return Promise.resolve({ data: rows[0] ?? null, error: result.error });
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }

  private execute(): QueryResult {
    if (this.client.offline) {
      return { data: null, error: { message: 'offline' } };
    }

    const rows = this.client.tables[this.table] ?? [];

    if (this.op === 'upsert') {
      const items = Array.isArray(this.payload) ? this.payload : this.payload ? [this.payload] : [];
      const conflictColumns = (this.options?.onConflict ?? 'id')
        .split(',')
        .map((column) => column.trim())
        .filter(Boolean);

      for (const item of items) {
        const index = rows.findIndex((row) =>
          conflictColumns.every((column) => row[column] === item[column]),
        );

        if (index >= 0) {
          if (!this.options?.ignoreDuplicates) {
            rows[index] = { ...rows[index], ...item };
          }
        } else {
          rows.push({ ...item });
        }
      }

      this.client.tables[this.table] = rows;
      return { data: null, error: null };
    }

    const matches = rows.filter((row) =>
      this.filters.every((filter) => row[filter.column] === filter.value),
    );

    if (this.op === 'delete') {
      this.client.tables[this.table] = rows.filter((row) => !matches.includes(row));
      return { data: null, error: null };
    }

    if (this.orderColumn) {
      matches.sort((a, b) => {
        const left = String(a[this.orderColumn as string] ?? '');
        const right = String(b[this.orderColumn as string] ?? '');
        return (left < right ? -1 : left > right ? 1 : 0) * (this.ascending ? 1 : -1);
      });
    }

    return { data: matches, error: null };
  }
}
