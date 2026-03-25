import { supabase } from '@/integrations/supabase/client';

class QueryShim {
  constructor(public tableName: string, public filters: any[] = [], public orderField?: string, public isReverse?: boolean, public limitCount?: number) {}

  where(field: string | any) {
    if (typeof field === 'object') {
        const newFilters = [...this.filters, { type: 'match', value: field }];
        return new QueryShim(this.tableName, newFilters, this.orderField, this.isReverse, this.limitCount);
    }
    return {
      equals: (val: any) => new QueryShim(this.tableName, [...this.filters, { type: 'eq', field, val }], this.orderField, this.isReverse, this.limitCount),
      anyOf: (arr: any[]) => new QueryShim(this.tableName, [...this.filters, { type: 'in', field, val: arr }], this.orderField, this.isReverse, this.limitCount),
      equalsIgnoreCase: (val: string) => new QueryShim(this.tableName, [...this.filters, { type: 'ilike', field, val }], this.orderField, this.isReverse, this.limitCount),
      startsWithIgnoreCase: (val: string) => new QueryShim(this.tableName, [...this.filters, { type: 'ilike', field, val: `${val}%` }], this.orderField, this.isReverse, this.limitCount),
    };
  }

  filter(fn: (item: any) => boolean) {
     return new QueryShim(this.tableName, [...this.filters, { type: 'js_filter', fn }], this.orderField, this.isReverse, this.limitCount);
  }

  and(fn: (item: any) => boolean) {
      return this.filter(fn);
  }

  orderBy(field: string) {
    return new QueryShim(this.tableName, this.filters, field, this.isReverse, this.limitCount);
  }

  sortBy(field: string) {
    return new QueryShim(this.tableName, this.filters, field, this.isReverse, this.limitCount).toArray();
  }

  reverse() {
    return new QueryShim(this.tableName, this.filters, this.orderField, true, this.limitCount);
  }

  limit(count: number) {
    return new QueryShim(this.tableName, this.filters, this.orderField, this.isReverse, count);
  }

  async toArray() {
    let query = supabase.from(this.tableName).select('*');
    
    // Apply basic Supabase filters where possible
    const jsFilters = [];
    for (const f of this.filters) {
        if (f.type === 'eq') {
            if (f.field.includes('+')) {
                // handle compound index ['class_id+term_id'].equals([c, t])
                const keys = f.field.replace(/[\[\]]/g, '').split('+');
                keys.forEach((k: string, i: number) => {
                    query = query.eq(k, f.val[i]);
                });
            } else {
                query = query.eq(f.field, f.val);
            }
        } else if (f.type === 'in') {
             if (f.val.length > 0) {
                 query = query.in(f.field, f.val);
             } else {
                 return []; // empty IN clause returns empty
             }
        } else if (f.type === 'match') {
             query = query.match(f.val);
        } else if (f.type === 'js_filter') {
             jsFilters.push(f.fn);
        }
    }

    if (this.orderField) {
        query = query.order(this.orderField, { ascending: !this.isReverse });
    }

    if (this.limitCount) {
        query = query.limit(this.limitCount);
    }

    const { data, error } = await query;
    if (error) {
        console.error(`Error querying ${this.tableName}:`, error);
        return [];
    }

    let results = data || [];
    for (const fn of jsFilters) {
        results = results.filter(fn);
    }
    return results;
  }

  async count() {
      const results = await this.toArray();
      return results.length;
  }

  async first() {
      const results = await this.limit(1).toArray();
      return results[0] || undefined;
  }
}

class TableShim {
  constructor(public name: string) {}

  where(field: string | any) {
    return new QueryShim(this.name).where(field);
  }

  filter(fn: (item: any) => boolean) {
    return new QueryShim(this.name).filter(fn);
  }

  orderBy(field: string) {
    return new QueryShim(this.name).orderBy(field);
  }

  async toArray() {
    return new QueryShim(this.name).toArray();
  }

  async get(id: string) {
      const res = await new QueryShim(this.name).where('id').equals(id).first();
      return res;
  }

  async add(item: any) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !item.user_id && !['profiles', 'learners', 'teacherfile_template_sections', 'teacherfile_entry_attachments'].includes(this.name)) {
         item.user_id = user.id;
      }
      const { error } = await supabase.from(this.name).insert(item);
      if (error) throw error;
      return item.id;
  }

  async bulkAdd(items: any[]) {
      if (!items.length) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !['profiles', 'learners', 'teacherfile_template_sections', 'teacherfile_entry_attachments'].includes(this.name)) {
         items.forEach(i => { if(!i.user_id) i.user_id = user.id; });
      }
      const { error } = await supabase.from(this.name).insert(items);
      if (error) throw error;
  }

  async put(item: any) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !item.user_id && !['profiles', 'learners', 'teacherfile_template_sections', 'teacherfile_entry_attachments'].includes(this.name)) {
         item.user_id = user.id;
      }
      const { error } = await supabase.from(this.name).upsert(item);
      if (error) throw error;
      return item.id;
  }

  async update(id: string, updates: any) {
      const { error } = await supabase.from(this.name).update(updates).eq('id', id);
      if (error) throw error;
  }

  async delete(id: string) {
      const { error } = await supabase.from(this.name).delete().eq('id', id);
      if (error) throw error;
  }

  async bulkPut(items: any[]) {
      if (!items.length) return;
      await supabase.from(this.name).upsert(items);
  }
  
  async count() {
      return new QueryShim(this.name).count();
  }
}

export const db = new Proxy({}, {
  get: (target, prop: string) => {
      if (prop === 'transaction') return async (mode: any, tables: any, cb: any) => cb();
      return new TableShim(prop);
  }
}) as any;
