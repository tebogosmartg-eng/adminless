import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/App';

class QueryShim {
  constructor(public tableName: string, public filters: any[] = [], public orderField?: string, public isReverse?: boolean, public limitCount?: number) {}

  where(field: string | any) {
    if (typeof field === 'object' && field !== null) {
        const cleanObj: any = {};
        for (const k in field) {
            // Filter out invalid values from the match object
            if (field[k] !== undefined && field[k] !== null && field[k] !== 'undefined' && field[k] !== '') {
                cleanObj[k] = field[k];
            }
        }
        const newFilters = [...this.filters, { type: 'match', value: cleanObj }];
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
    const isInvalid = (val: any) => val === undefined || val === null || val === 'undefined' || val === '';

    // STABILITY FIX: Strict check for invalid filter values before query execution
    for (const f of this.filters) {
        if (f.type === 'eq') {
            if (Array.isArray(f.val)) {
                if (f.val.some(isInvalid)) return [];
            } else if (isInvalid(f.val)) {
                return [];
            }
        }
        if (f.type === 'in' && (!f.val || f.val.length === 0)) {
            return [];
        }
        if (f.type === 'match') {
            // If the match object is empty after cleaning, we might want to block or allow. 
            // Usually, an empty match means "all", but in our context it's often a missing filter.
            if (Object.keys(f.value).length === 0) return [];
        }
    }

    let query: any = supabase.from(this.tableName).select('*');
    
    const jsFilters = [];
    for (const f of this.filters) {
        if (f.type === 'eq') {
            if (f.field.includes('+')) {
                const keys = f.field.replace(/[\[\]]/g, '').split('+');
                keys.forEach((k: string, i: number) => {
                    // Shield specific columns that may not exist in the cloud schema yet
                    if (this.tableName === 'classes' && (k === 'term_id' || k === 'year_id')) return; 
                    query = query.eq(k, f.val[i]);
                });
            } else {
                if (this.tableName === 'classes' && (f.field === 'term_id' || f.field === 'year_id')) continue; 
                if (this.tableName === 'timetable' && f.field === 'year_id') continue; 
                query = query.eq(f.field, f.val);
            }
        } else if (f.type === 'in') {
             query = query.in(f.field, f.val);
        } else if (f.type === 'match') {
             query = query.match(f.value);
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
      return results[0] || null;
  }
}

class TableShim {
  constructor(public name: string) {}

  private async invalidate() {
      await queryClient.invalidateQueries({ queryKey: ['liveQuery'] });
  }

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
      if (!id || id === 'undefined') return null;
      const q: any = new QueryShim(this.name).where('id');
      const res = await q.equals(id).first();
      return res;
  }

  async add(item: any) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !item.user_id && !['profiles', 'learners', 'teacherfile_template_sections', 'teacherfile_entry_attachments'].includes(this.name)) {
         item.user_id = user.id;
      }
      
      let error;
      if (this.name === 'attendance') {
          const { error: e } = await supabase.from(this.name).upsert(item, { onConflict: 'learner_id,date' });
          error = e;
      } else {
          const { error: e } = await supabase.from(this.name).insert(item);
          error = e;
      }
      
      if (error) throw error;
      await this.invalidate();
      return item.id;
  }

  async bulkAdd(items: any[]) {
      if (!items.length) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !['profiles', 'learners', 'teacherfile_template_sections', 'teacherfile_entry_attachments'].includes(this.name)) {
         items.forEach(i => { if(!i.user_id) i.user_id = user.id; });
      }
      
      let error;
      if (this.name === 'attendance') {
          const { error: e } = await supabase.from(this.name).upsert(items, { onConflict: 'learner_id,date' });
          error = e;
      } else {
          const { error: e } = await supabase.from(this.name).insert(items);
          error = e;
      }
      
      if (error) throw error;
      await this.invalidate();
  }

  async put(item: any) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !item.user_id && !['profiles', 'learners', 'teacherfile_template_sections', 'teacherfile_entry_attachments'].includes(this.name)) {
         item.user_id = user.id;
      }
      const options: any = {};
      if (this.name === 'attendance') {
          options.onConflict = 'learner_id,date';
      } else if (this.name === 'assessment_marks') {
          options.onConflict = 'assessment_id,learner_id';
      }
      const { error } = await supabase.from(this.name).upsert(item, options);
      if (error) throw error;
      await this.invalidate();
      return item.id;
  }

  async update(id: string, updates: any) {
      if (!id || id === 'undefined') return;
      const { error } = await supabase.from(this.name).update(updates).eq('id', id);
      if (error) throw error;
      await this.invalidate();
  }

  async delete(id: string) {
      if (!id || id === 'undefined') return;
      const { error } = await supabase.from(this.name).delete().eq('id', id);
      if (error) throw error;
      await this.invalidate();
  }

  async bulkPut(items: any[]) {
      if (!items.length) return;
      const options: any = {};
      if (this.name === 'attendance') {
          options.onConflict = 'learner_id,date';
      } else if (this.name === 'assessment_marks') {
          options.onConflict = 'assessment_id,learner_id';
      }
      const { error } = await supabase.from(this.name).upsert(items, options);
      if (error) throw error;
      await this.invalidate();
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