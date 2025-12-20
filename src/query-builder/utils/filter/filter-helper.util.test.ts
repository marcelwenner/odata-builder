import { describe, it, expect } from 'vitest';
import { isGuid, getValueType } from './filter-helper.util';

describe('isGuid', () => {
    describe('valid GUIDs', () => {
        it('accepts UUID v1', () => {
            expect(isGuid('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
        });

        it('accepts UUID v4', () => {
            expect(isGuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
        });

        it('accepts UUID v7 (RFC 9562)', () => {
            // UUIDv7 format: timestamp-based, version nibble is 7
            expect(isGuid('018f6b54-2e9e-7000-8000-000000000000')).toBe(true);
        });

        it('accepts UUID v7 from .NET Guid.CreateVersion7()', () => {
            // Example from .NET 9 documentation
            expect(isGuid('01936463-d800-7970-b083-22ca54927904')).toBe(true);
        });

        it('accepts uppercase GUIDs', () => {
            expect(isGuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
        });

        it('accepts mixed case GUIDs', () => {
            expect(isGuid('550e8400-E29B-41d4-A716-446655440000')).toBe(true);
        });

        it('accepts nil UUID', () => {
            expect(isGuid('00000000-0000-0000-0000-000000000000')).toBe(true);
        });

        it('accepts max UUID', () => {
            expect(isGuid('ffffffff-ffff-ffff-ffff-ffffffffffff')).toBe(true);
        });
    });

    describe('invalid GUIDs', () => {
        it('rejects non-string values', () => {
            expect(isGuid(123)).toBe(false);
            expect(isGuid(null)).toBe(false);
            expect(isGuid(undefined)).toBe(false);
            expect(isGuid({})).toBe(false);
        });

        it('rejects wrong format', () => {
            expect(isGuid('not-a-guid')).toBe(false);
            expect(isGuid('550e8400e29b41d4a716446655440000')).toBe(false); // no dashes
            expect(isGuid('550e8400-e29b-41d4-a716')).toBe(false); // too short
        });

        it('rejects wrong characters', () => {
            expect(isGuid('550e8400-e29b-41d4-a716-44665544000g')).toBe(false);
            expect(isGuid('550e8400-e29b-41d4-a716-44665544000!')).toBe(false);
        });

        it('rejects GUIDs with braces', () => {
            expect(isGuid('{550e8400-e29b-41d4-a716-446655440000}')).toBe(false);
        });
    });
});

describe('getValueType', () => {
    it('returns Guid for valid GUID strings', () => {
        expect(getValueType('550e8400-e29b-41d4-a716-446655440000')).toBe(
            'Guid',
        );
    });

    it('returns Guid for UUIDv7', () => {
        expect(getValueType('018f6b54-2e9e-7000-8000-000000000000')).toBe(
            'Guid',
        );
    });

    it('returns string for non-GUID strings', () => {
        expect(getValueType('hello')).toBe('string');
    });

    it('returns number for numbers', () => {
        expect(getValueType(42)).toBe('number');
    });

    it('returns boolean for booleans', () => {
        expect(getValueType(true)).toBe('boolean');
    });

    it('returns null for null', () => {
        expect(getValueType(null)).toBe('null');
    });

    it('returns Date for Date objects', () => {
        expect(getValueType(new Date())).toBe('Date');
    });
});
