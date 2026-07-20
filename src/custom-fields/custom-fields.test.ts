import { describe, it, expect } from 'vitest';
import { CustomFields, CustomFieldType } from './index.js';

describe('CustomFields', () => {
  describe('construction', () => {
    it('creates an empty collection', () => {
      expect(CustomFields.create().size).toBe(0);
      expect(new CustomFields().toMap()).toEqual({});
    });

    it('seeds from a raw map', () => {
      const fields = CustomFields.fromMap({ customfield_1: 'a', customfield_2: 2 });

      expect(fields.size).toBe(2);
      expect(fields.getString('customfield_1')).toBe('a');
      expect(fields.getNumber('customfield_2')).toBe(2);
    });

    it('parses a JSON string', () => {
      const fields = CustomFields.fromJSON('{"customfield_1":{"value":"High"}}');

      expect(fields.getSelect('customfield_1')).toBe('High');
    });

    it('accepts an already-parsed object', () => {
      expect(CustomFields.fromJSON({ customfield_1: 'x' }).getString('customfield_1')).toBe('x');
    });

    it('throws when the JSON is not an object', () => {
      expect(() => CustomFields.fromJSON('[1,2,3]')).toThrow(/expects a JSON object/);
    });
  });

  describe('string fields', () => {
    it('round-trips a value and records its type', () => {
      const fields = new CustomFields().setString('customfield_10001', 'Sprint 1');

      expect(fields.getString('customfield_10001')).toBe('Sprint 1');
      expect(fields.getType('customfield_10001')).toBe(CustomFieldType.String);
    });

    it('returns undefined for a missing field', () => {
      expect(new CustomFields().getString('nope')).toBeUndefined();
    });

    it('returns undefined when the value is not a string', () => {
      expect(new CustomFields().setNumber('f', 1).getString('f')).toBeUndefined();
    });
  });

  describe('number fields', () => {
    it('round-trips a number', () => {
      expect(new CustomFields().setNumber('f', 42.5).getNumber('f')).toBe(42.5);
    });

    it('coerces numeric strings from the API', () => {
      expect(CustomFields.fromMap({ f: '17.5' }).getNumber('f')).toBe(17.5);
    });

    it.each([['abc'], [''], [null], [{}]])('returns undefined for %s', (value) => {
      expect(CustomFields.fromMap({ f: value }).getNumber('f')).toBeUndefined();
    });

    it('rejects non-finite numbers', () => {
      expect(CustomFields.fromMap({ f: Number.NaN }).getNumber('f')).toBeUndefined();
    });
  });

  describe('date fields', () => {
    it('serialises a Date as YYYY-MM-DD', () => {
      const fields = new CustomFields().setDate('f', new Date('2024-03-15T18:45:00.000Z'));

      expect(fields.toMap()['f']).toBe('2024-03-15');
      expect(fields.getType('f')).toBe(CustomFieldType.Date);
    });

    it('accepts a pre-formatted string', () => {
      expect(new CustomFields().setDate('f', '2024-03-15').toMap()['f']).toBe('2024-03-15');
    });

    it('parses a date-only value at UTC midnight', () => {
      const date = new CustomFields().setDate('f', '2024-03-15').getDate('f');

      expect(date?.toISOString()).toBe('2024-03-15T00:00:00.000Z');
    });

    it('returns undefined for an unparseable value', () => {
      expect(CustomFields.fromMap({ f: 'not-a-date' }).getDate('f')).toBeUndefined();
      expect(CustomFields.fromMap({ f: 123 }).getDate('f')).toBeUndefined();
      expect(new CustomFields().getDate('missing')).toBeUndefined();
    });
  });

  describe('datetime fields', () => {
    it('serialises a Date as ISO-8601', () => {
      const value = new Date('2024-03-15T18:45:00.000Z');
      const fields = new CustomFields().setDateTime('f', value);

      expect(fields.toMap()['f']).toBe('2024-03-15T18:45:00.000Z');
      expect(fields.getDateTime('f')?.getTime()).toBe(value.getTime());
      expect(fields.getType('f')).toBe(CustomFieldType.DateTime);
    });

    it("parses Jira's colon-less UTC offset format", () => {
      const parsed = CustomFields.fromMap({ f: '2024-03-15T18:45:00.000+0200' }).getDateTime('f');

      expect(parsed?.toISOString()).toBe('2024-03-15T16:45:00.000Z');
    });

    it('accepts a pre-formatted string', () => {
      expect(new CustomFields().setDateTime('f', '2024-03-15T00:00:00Z').toMap()['f']).toBe(
        '2024-03-15T00:00:00Z'
      );
    });
  });

  describe('user fields', () => {
    it('wraps the account id in the shape Jira expects', () => {
      const fields = new CustomFields().setUser('f', 'account-123');

      expect(fields.toMap()['f']).toEqual({ accountId: 'account-123' });
      expect(fields.getUser('f')).toBe('account-123');
    });

    it('returns undefined when the shape does not match', () => {
      expect(CustomFields.fromMap({ f: 'account-123' }).getUser('f')).toBeUndefined();
      expect(CustomFields.fromMap({ f: { accountId: 7 } }).getUser('f')).toBeUndefined();
    });
  });

  describe('select fields', () => {
    it('wraps the option in the shape Jira expects', () => {
      const fields = new CustomFields().setSelect('f', 'High');

      expect(fields.toMap()['f']).toEqual({ value: 'High' });
      expect(fields.getSelect('f')).toBe('High');
    });

    it('returns undefined for a non-option value', () => {
      expect(CustomFields.fromMap({ f: ['a'] }).getSelect('f')).toBeUndefined();
    });
  });

  describe('multi-select fields', () => {
    it('round-trips option values', () => {
      const fields = new CustomFields().setMultiSelect('f', ['a', 'b']);

      expect(fields.toMap()['f']).toEqual([{ value: 'a' }, { value: 'b' }]);
      expect(fields.getMultiSelect('f')).toEqual(['a', 'b']);
    });

    it('reads values from an API response', () => {
      const fields = CustomFields.fromMap({ f: [{ value: 'x', id: '1' }, { id: '2' }] });

      expect(fields.getMultiSelect('f')).toEqual(['x']);
    });

    it('returns an empty array for an empty selection', () => {
      expect(new CustomFields().setMultiSelect('f', []).getMultiSelect('f')).toEqual([]);
    });

    it('returns undefined when the value is not an array', () => {
      expect(CustomFields.fromMap({ f: 'a' }).getMultiSelect('f')).toBeUndefined();
      expect(new CustomFields().getMultiSelect('missing')).toBeUndefined();
    });
  });

  describe('labels fields', () => {
    it('round-trips labels', () => {
      const fields = new CustomFields().setLabels('f', ['bug', 'urgent']);

      expect(fields.toMap()['f']).toEqual(['bug', 'urgent']);
      expect(fields.getLabels('f')).toEqual(['bug', 'urgent']);
      expect(fields.getType('f')).toBe(CustomFieldType.Labels);
    });

    it('drops non-string entries from an API response', () => {
      expect(CustomFields.fromMap({ f: ['a', 1, null] }).getLabels('f')).toEqual(['a']);
    });

    it('returns undefined when the value is not an array', () => {
      expect(CustomFields.fromMap({ f: 'bug' }).getLabels('f')).toBeUndefined();
    });

    it('copies the input array', () => {
      const labels = ['a'];
      const fields = new CustomFields().setLabels('f', labels);
      labels.push('b');

      expect(fields.getLabels('f')).toEqual(['a']);
    });
  });

  describe('raw fields', () => {
    it('stores and reads an arbitrary value', () => {
      const value = { complex: { structure: true } };
      const fields = new CustomFields().setRaw('f', value);

      expect(fields.getRaw('f')).toBe(value);
      expect(fields.getType('f')).toBeUndefined();
    });

    it('returns undefined for a missing field', () => {
      expect(new CustomFields().getRaw('missing')).toBeUndefined();
    });
  });

  describe('collection operations', () => {
    it('reports presence and removes fields', () => {
      const fields = new CustomFields().setString('a', '1');

      expect(fields.has('a')).toBe(true);
      expect(fields.remove('a').has('a')).toBe(false);
    });

    it('merges another collection, overwriting conflicts', () => {
      const base = new CustomFields().setString('a', 'base').setString('b', 'keep');
      const other = new CustomFields().setString('a', 'override').setString('c', 'new');

      const merged = base.merge(other);

      expect(merged.toMap()).toEqual({ a: 'override', b: 'keep', c: 'new' });
      expect(merged).toBe(base);
    });

    it('does not alias field objects when merging', () => {
      const other = new CustomFields().setString('a', 'x');
      const base = new CustomFields().merge(other);

      other.setString('a', 'y');

      expect(base.getString('a')).toBe('x');
    });

    it('exposes keys and entries', () => {
      const fields = new CustomFields().setString('a', '1').setNumber('b', 2);

      expect([...fields.keys()]).toEqual(['a', 'b']);
      expect([...fields.entries()].map(([id, field]) => [id, field.value])).toEqual([
        ['a', '1'],
        ['b', 2],
      ]);
    });

    it('clones independently', () => {
      const original = new CustomFields().setString('a', '1');
      const clone = original.clone().setString('b', '2');

      expect(original.size).toBe(1);
      expect(clone.size).toBe(2);
    });
  });

  describe('serialisation', () => {
    it('produces the Jira wire format via toMap and JSON.stringify', () => {
      const fields = new CustomFields()
        .setString('customfield_10001', 'Sprint 1')
        .setNumber('customfield_10002', 5)
        .setUser('customfield_10005', 'acc-1');

      const expected = {
        customfield_10001: 'Sprint 1',
        customfield_10002: 5,
        customfield_10005: { accountId: 'acc-1' },
      };

      expect(fields.toMap()).toEqual(expected);
      expect(JSON.parse(JSON.stringify(fields))).toEqual(expected);
    });

    it('round-trips through JSON', () => {
      const fields = new CustomFields().setMultiSelect('f', ['a', 'b']);
      const restored = CustomFields.fromJSON(JSON.stringify(fields));

      expect(restored.getMultiSelect('f')).toEqual(['a', 'b']);
    });
  });
});
