/**
 * Tests for the PaginationHelper utility
 */
import { jest } from '@jest/globals';
import { PaginationHelper } from '../pagination.js';

describe('PaginationHelper', () => {
  describe('hasProperties', () => {
    test('should return false for non-object values', () => {
      expect(PaginationHelper.hasProperties(null, ['page'])).toBe(false);
      expect(PaginationHelper.hasProperties(undefined, ['page'])).toBe(false);
      expect(PaginationHelper.hasProperties('string', ['page'])).toBe(false);
      expect(PaginationHelper.hasProperties(123, ['page'])).toBe(false);
    });

    test('should return true when object has all properties', () => {
      const obj = { page: 1, limit: 10, total: 100 };
      expect(PaginationHelper.hasProperties(obj, ['page', 'limit'])).toBe(true);
      expect(PaginationHelper.hasProperties(obj, ['page', 'limit', 'total'])).toBe(true);
    });

    test('should return false when object is missing properties', () => {
      const obj = { page: 1, limit: 10 };
      expect(PaginationHelper.hasProperties(obj, ['page', 'limit', 'total'])).toBe(false);
    });
  });

  describe('extractPaginationInfo', () => {
    test('should return null for non-object values', () => {
      expect(PaginationHelper.extractPaginationInfo(null)).toBeNull();
      expect(PaginationHelper.extractPaginationInfo(undefined)).toBeNull();
      expect(PaginationHelper.extractPaginationInfo('string')).toBeNull();
      expect(PaginationHelper.extractPaginationInfo(123)).toBeNull();
    });

    test('should handle pattern 1: page, limit, totalItems', () => {
      const response = {
        page: 2,
        limit: 10,
        totalItems: 25,
      };

      const result = PaginationHelper.extractPaginationInfo(response);

      expect(result).toEqual({
        currentPage: 2,
        pageSize: 10,
        totalItems: 25,
        totalPages: 3,
        hasMore: true,
      });
    });

    test('should handle pattern 1 with total instead of totalItems', () => {
      const response = {
        page: 2,
        limit: 10,
        total: 25,
      };

      const result = PaginationHelper.extractPaginationInfo(response);

      expect(result).toEqual({
        currentPage: 2,
        pageSize: 10,
        totalItems: 25,
        totalPages: 3,
        hasMore: true,
      });
    });

    test('should handle pattern 1 with explicit totalPages', () => {
      const response = {
        page: 2,
        limit: 10,
        totalItems: 25,
        totalPages: 3,
      };

      const result = PaginationHelper.extractPaginationInfo(response);

      expect(result).toEqual({
        currentPage: 2,
        pageSize: 10,
        totalItems: 25,
        totalPages: 3,
        hasMore: true,
      });
    });

    test('should handle pattern 1 with last page', () => {
      const response = {
        page: 3,
        limit: 10,
        totalItems: 25,
      };

      const result = PaginationHelper.extractPaginationInfo(response);

      expect(result).toEqual({
        currentPage: 3,
        pageSize: 10,
        totalItems: 25,
        totalPages: 3,
        hasMore: false,
      });
    });

    test('should handle pattern 2: current_page, per_page, total', () => {
      const response = {
        current_page: 2,
        per_page: 10,
        total: 25,
      };

      const result = PaginationHelper.extractPaginationInfo(response);

      expect(result).toEqual({
        currentPage: 2,
        pageSize: 10,
        totalItems: 25,
        totalPages: 3,
        hasMore: true,
      });
    });

    test('should handle pattern 2 with explicit last_page', () => {
      const response = {
        current_page: 2,
        per_page: 10,
        total: 25,
        last_page: 3,
      };

      const result = PaginationHelper.extractPaginationInfo(response);

      expect(result).toEqual({
        currentPage: 2,
        pageSize: 10,
        totalItems: 25,
        totalPages: 3,
        hasMore: true,
      });
    });

    test('should handle pattern 3: offset, limit, count', () => {
      const response = {
        offset: 10,
        limit: 10,
        count: 25,
      };

      const result = PaginationHelper.extractPaginationInfo(response);

      expect(result).toEqual({
        currentPage: 2,
        pageSize: 10,
        totalItems: 25,
        totalPages: 3,
        hasMore: true,
      });
    });

    test('should handle pattern 4: meta.pagination', () => {
      const response = {
        meta: {
          pagination: {
            page: 2,
            pageSize: 10,
            total: 25,
            pageCount: 3,
          },
        },
      };

      const result = PaginationHelper.extractPaginationInfo(response);

      expect(result).toEqual({
        currentPage: 2,
        pageSize: 10,
        totalItems: 25,
        totalPages: 3,
        hasMore: true,
      });
    });

    test('should return null if no recognized pagination pattern is found', () => {
      const response = {
        foo: 'bar',
      };

      expect(PaginationHelper.extractPaginationInfo(response)).toBeNull();
    });
  });

  describe('extractData', () => {
    test('should return null for non-object values', () => {
      expect(PaginationHelper.extractData(null)).toBeNull();
      expect(PaginationHelper.extractData(undefined)).toBeNull();
      expect(PaginationHelper.extractData('string')).toBeNull();
      expect(PaginationHelper.extractData(123)).toBeNull();
    });

    test('should extract data from data property', () => {
      const response = {
        data: [1, 2, 3],
      };

      expect(PaginationHelper.extractData(response)).toEqual([1, 2, 3]);
    });

    test('should extract data from items property', () => {
      const response = {
        items: [1, 2, 3],
      };

      expect(PaginationHelper.extractData(response)).toEqual([1, 2, 3]);
    });

    test('should extract data from results property', () => {
      const response = {
        results: [1, 2, 3],
      };

      expect(PaginationHelper.extractData(response)).toEqual([1, 2, 3]);
    });

    test('should extract data from records property', () => {
      const response = {
        records: [1, 2, 3],
      };

      expect(PaginationHelper.extractData(response)).toEqual([1, 2, 3]);
    });

    test('should extract data from content property', () => {
      const response = {
        content: [1, 2, 3],
      };

      expect(PaginationHelper.extractData(response)).toEqual([1, 2, 3]);
    });

    test('should return the response if it is an array', () => {
      const response = [1, 2, 3];

      expect(PaginationHelper.extractData(response)).toEqual([1, 2, 3]);
    });

    test('should find the only array property if no known data property exists', () => {
      const response = {
        foo: [1, 2, 3],
        bar: 'not an array',
      };

      expect(PaginationHelper.extractData(response)).toEqual([1, 2, 3]);
    });

    test('should return null if no array property is found', () => {
      const response = {
        foo: 'bar',
        baz: 123,
      };

      expect(PaginationHelper.extractData(response)).toBeNull();
    });

    test('should return null if multiple array properties are found', () => {
      const response = {
        foo: [1, 2, 3],
        bar: [4, 5, 6],
      };

      expect(PaginationHelper.extractData(response)).toBeNull();
    });
  });

  describe('getNextPageParams', () => {
    test('should return null if pagination info is not provided', () => {
      expect(PaginationHelper.getNextPageParams(null)).toBeNull();
      expect(PaginationHelper.getNextPageParams(undefined)).toBeNull();
    });

    test('should return null if hasMore is false', () => {
      const paginationInfo = {
        currentPage: 3,
        pageSize: 10,
        totalItems: 25,
        totalPages: 3,
        hasMore: false,
      };

      expect(PaginationHelper.getNextPageParams(paginationInfo)).toBeNull();
    });

    test('should return page/limit params for page-based pagination', () => {
      const paginationInfo = {
        currentPage: 2,
        pageSize: 10,
        totalItems: 35,
        totalPages: 4,
        hasMore: true,
      };

      expect(PaginationHelper.getNextPageParams(paginationInfo)).toEqual({
        page: 3,
        limit: 10,
      });
    });

    test('should return offset/limit params for offset-based pagination', () => {
      const paginationInfo = {
        offset: 20,
        pageSize: 10,
        totalItems: 35,
        hasMore: true,
      };

      expect(PaginationHelper.getNextPageParams(paginationInfo)).toEqual({
        offset: 30,
        limit: 10,
      });
    });

    test('should return null for unsupported pagination format', () => {
      const paginationInfo = {
        hasMore: true,
        // Missing pageSize or other required properties
      };

      expect(PaginationHelper.getNextPageParams(paginationInfo)).toBeNull();
    });
  });

  describe('transformPaginationParams', () => {
    test('should handle empty or null params', () => {
      expect(PaginationHelper.transformPaginationParams(null, 'page-limit')).toEqual({});
      expect(PaginationHelper.transformPaginationParams({}, 'page-limit')).toEqual({});
    });

    test('should transform offset/limit to page/limit', () => {
      const params = {
        offset: 20,
        limit: 10,
        sort: 'name',
      };

      expect(PaginationHelper.transformPaginationParams(params, 'page-limit')).toEqual({
        page: 3,
        limit: 10,
        sort: 'name',
      });
    });

    test('should transform page/per_page to page/limit', () => {
      const params = {
        page: 3,
        per_page: 10,
        sort: 'name',
      };

      expect(PaginationHelper.transformPaginationParams(params, 'page-limit')).toEqual({
        page: 3,
        limit: 10,
        sort: 'name',
      });
    });

    test('should transform page/limit to offset/limit', () => {
      const params = {
        page: 3,
        limit: 10,
        sort: 'name',
      };

      expect(PaginationHelper.transformPaginationParams(params, 'offset-limit')).toEqual({
        offset: 20,
        limit: 10,
        sort: 'name',
      });
    });

    test('should transform page/per_page to offset/limit', () => {
      const params = {
        page: 3,
        per_page: 10,
        sort: 'name',
      };

      expect(PaginationHelper.transformPaginationParams(params, 'offset-limit')).toEqual({
        offset: 20,
        limit: 10,
        sort: 'name',
      });
    });

    test('should transform offset/limit to page/per_page', () => {
      const params = {
        offset: 20,
        limit: 10,
        sort: 'name',
      };

      expect(PaginationHelper.transformPaginationParams(params, 'page-per_page')).toEqual({
        page: 3,
        per_page: 10,
        sort: 'name',
      });
    });

    test('should transform page/limit to page/per_page', () => {
      const params = {
        page: 3,
        limit: 10,
        sort: 'name',
      };

      expect(PaginationHelper.transformPaginationParams(params, 'page-per_page')).toEqual({
        page: 3,
        per_page: 10,
        sort: 'name',
      });
    });

    test('should not transform unrecognized target style', () => {
      const params = {
        page: 3,
        limit: 10,
      };

      expect(PaginationHelper.transformPaginationParams(params, 'unknown-style')).toEqual({
        page: 3,
        limit: 10,
      });
    });
  });

  describe('formatPaginatedResponse', () => {
    test('should format a response with pagination info', () => {
      const response = {
        data: [1, 2, 3],
        page: 2,
        limit: 10,
        totalItems: 35,
      };

      expect(PaginationHelper.formatPaginatedResponse(response)).toEqual({
        data: [1, 2, 3],
        pagination: {
          currentPage: 2,
          pageSize: 10,
          totalItems: 35,
          totalPages: 4,
          hasMore: true,
        },
      });
    });

    test('should handle response without pagination info', () => {
      const response = {
        data: [1, 2, 3],
      };

      expect(PaginationHelper.formatPaginatedResponse(response)).toEqual({
        data: [1, 2, 3],
        pagination: null,
      });
    });

    test('should extract data when not directly provided', () => {
      const response = {
        items: [1, 2, 3],
        page: 2,
        limit: 10,
        totalItems: 35,
      };

      expect(PaginationHelper.formatPaginatedResponse(response)).toEqual({
        data: [1, 2, 3],
        pagination: {
          currentPage: 2,
          pageSize: 10,
          totalItems: 35,
          totalPages: 4,
          hasMore: true,
        },
      });
    });

    test('should use response as data if no data property is found and no pagination info', () => {
      const response = [1, 2, 3];

      expect(PaginationHelper.formatPaginatedResponse(response)).toEqual({
        data: [1, 2, 3],
        pagination: null,
      });
    });
  });

  describe('autoPaginate', () => {
    test('should fetch and combine results from multiple pages', async () => {
      // Mock fetch function that returns paginated data
      const mockFetch = jest
        .fn()
        .mockImplementationOnce(() => ({
          data: [1, 2, 3],
          page: 1,
          limit: 3,
          totalItems: 7,
        }))
        .mockImplementationOnce(() => ({
          data: [4, 5, 6],
          page: 2,
          limit: 3,
          totalItems: 7,
        }))
        .mockImplementationOnce(() => ({
          data: [7],
          page: 3,
          limit: 3,
          totalItems: 7,
        }));

      const results = await PaginationHelper.autoPaginate(mockFetch, { page: 1, limit: 3 });

      expect(results).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch).toHaveBeenNthCalledWith(1, { page: 1, limit: 3 });
      expect(mockFetch).toHaveBeenNthCalledWith(2, { page: 2, limit: 3 });
      expect(mockFetch).toHaveBeenNthCalledWith(3, { page: 3, limit: 3 });
    });

    test('should respect maxPages option', async () => {
      // Mock fetch function that returns paginated data
      const mockFetch = jest
        .fn()
        .mockImplementationOnce(() => ({
          data: [1, 2, 3],
          page: 1,
          limit: 3,
          totalItems: 10,
        }))
        .mockImplementationOnce(() => ({
          data: [4, 5, 6],
          page: 2,
          limit: 3,
          totalItems: 10,
        }));

      const results = await PaginationHelper.autoPaginate(
        mockFetch,
        { page: 1, limit: 3 },
        { maxPages: 2 }
      );

      expect(results).toEqual([1, 2, 3, 4, 5, 6]);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    test('should respect maxItems option', async () => {
      // Mock fetch function that returns paginated data
      const mockFetch = jest
        .fn()
        .mockImplementationOnce(() => ({
          data: [1, 2, 3],
          page: 1,
          limit: 3,
          totalItems: 10,
        }))
        .mockImplementationOnce(() => ({
          data: [4, 5, 6],
          page: 2,
          limit: 3,
          totalItems: 10,
        }));

      const results = await PaginationHelper.autoPaginate(
        mockFetch,
        { page: 1, limit: 3 },
        { maxItems: 5 }
      );

      expect(results).toEqual([1, 2, 3, 4, 5, 6]);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    test('should stop when no more pages are available', async () => {
      // Mock fetch function that returns paginated data
      const mockFetch = jest.fn().mockImplementationOnce(() => ({
        data: [1, 2, 3],
        page: 1,
        limit: 3,
        totalItems: 3,
      }));

      const results = await PaginationHelper.autoPaginate(mockFetch, { page: 1, limit: 3 });

      expect(results).toEqual([1, 2, 3]);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('should stop when no pagination info is available', async () => {
      // Mock fetch function that returns non-paginated data
      const mockFetch = jest.fn().mockImplementationOnce(() => ({
        data: [1, 2, 3],
      }));

      const results = await PaginationHelper.autoPaginate(mockFetch, { page: 1, limit: 3 });

      expect(results).toEqual([1, 2, 3]);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('should handle response without data array', async () => {
      // Mock fetch function that returns non-array response
      const mockFetch = jest.fn().mockImplementationOnce(() => ({
        value: 'not an array',
      }));

      const results = await PaginationHelper.autoPaginate(mockFetch, { page: 1, limit: 3 });

      expect(results).toEqual([]);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('should transform pagination params to target style', async () => {
      // Mock fetch function that returns offset/limit style paginated data
      const mockFetch = jest
        .fn()
        .mockImplementationOnce(() => ({
          data: [1, 2, 3],
          offset: 0,
          limit: 3,
          count: 7,
        }))
        .mockImplementationOnce(() => ({
          data: [4, 5, 6],
          offset: 3,
          limit: 3,
          count: 7,
        }))
        .mockImplementationOnce(() => ({
          data: [7],
          offset: 6,
          limit: 3,
          count: 7,
        }));

      const results = await PaginationHelper.autoPaginate(
        mockFetch,
        { offset: 0, limit: 3 },
        { targetStyle: 'offset-limit' }
      );

      expect(results).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch).toHaveBeenNthCalledWith(1, { offset: 0, limit: 3 });
      expect(mockFetch).toHaveBeenNthCalledWith(2, { offset: 3, limit: 3 });
      expect(mockFetch).toHaveBeenNthCalledWith(3, { offset: 6, limit: 3 });
    });
  });
});
