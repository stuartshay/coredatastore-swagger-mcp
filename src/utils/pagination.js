/**
 * Pagination utilities for handling paginated API responses
 */

/**
 * Extracts pagination metadata from API responses
 */
export class PaginationHelper {
  /**
   * Extract pagination info from response
   * @param {Object} response - The API response object
   * @returns {Object|null} Pagination metadata or null if not paginated
   */
  static extractPaginationInfo(response) {
    // If response is null or not an object, it's not paginated
    if (!response || typeof response !== 'object') {
      return null;
    }

    // Try different common pagination patterns
    let paginationInfo = null;

    // Pattern 1: { page, limit, totalItems, totalPages }
    if (
      this.hasProperties(response, ['page', 'limit', 'totalItems']) ||
      this.hasProperties(response, ['page', 'limit', 'total'])
    ) {
      paginationInfo = {
        currentPage: response.page,
        pageSize: response.limit,
        totalItems: response.totalItems || response.total,
        totalPages:
          response.totalPages ||
          Math.ceil((response.totalItems || response.total) / response.limit),
        hasMore:
          response.page <
          (response.totalPages ||
            Math.ceil((response.totalItems || response.total) / response.limit)),
      };
    }
    // Pattern 2: { current_page, per_page, total }
    else if (this.hasProperties(response, ['current_page', 'per_page', 'total'])) {
      paginationInfo = {
        currentPage: response.current_page,
        pageSize: response.per_page,
        totalItems: response.total,
        totalPages: response.last_page || Math.ceil(response.total / response.per_page),
        hasMore:
          response.current_page <
          (response.last_page || Math.ceil(response.total / response.per_page)),
      };
    }
    // Pattern 3: { offset, limit, count }
    else if (this.hasProperties(response, ['offset', 'limit', 'count'])) {
      const currentPage = Math.floor(response.offset / response.limit) + 1;
      const totalPages = Math.ceil(response.count / response.limit);

      paginationInfo = {
        currentPage,
        pageSize: response.limit,
        totalItems: response.count,
        totalPages,
        hasMore: currentPage < totalPages,
      };
    }
    // Pattern 4: meta: { pagination: { page, pageCount, pageSize, total } }
    else if (
      response.meta?.pagination &&
      this.hasProperties(response.meta.pagination, ['page', 'pageSize'])
    ) {
      const pagination = response.meta.pagination;
      paginationInfo = {
        currentPage: pagination.page,
        pageSize: pagination.pageSize,
        totalItems: pagination.total,
        totalPages: pagination.pageCount,
        hasMore: pagination.page < pagination.pageCount,
      };
    }

    return paginationInfo;
  }

  /**
   * Checks if an object has all the specified properties
   * @param {Object} obj - Object to check
   * @param {Array<string>} props - Properties to check for
   * @returns {boolean} True if all properties exist
   */
  static hasProperties(obj, props) {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    return props.every(prop => obj[prop] !== undefined);
  }

  /**
   * Extract the actual data from a paginated response
   * @param {Object} response - The API response
   * @returns {Array|null} The data array or null if not found
   */
  static extractData(response) {
    if (!response || typeof response !== 'object') {
      return null;
    }

    // Common patterns for where data might be located
    const dataProperties = ['data', 'items', 'results', 'records', 'content'];

    for (const prop of dataProperties) {
      if (Array.isArray(response[prop])) {
        return response[prop];
      }
    }

    // If the response itself is an array, return it
    if (Array.isArray(response)) {
      return response;
    }

    // If no known data property is found but the response has a data property
    // that is not an array, check if there are other array properties
    const arrayProps = Object.keys(response).filter(key => Array.isArray(response[key]));
    if (arrayProps.length === 1) {
      return response[arrayProps[0]];
    }

    return null;
  }

  /**
   * Creates pagination parameters for the next page
   * @param {Object} paginationInfo - Current pagination info
   * @returns {Object|null} Parameters for the next page or null if no more pages
   */
  static getNextPageParams(paginationInfo) {
    if (!paginationInfo || !paginationInfo.hasMore) {
      return null;
    }

    const nextPage = paginationInfo.currentPage + 1;

    // Different parameter formats based on common API patterns
    if (paginationInfo.pageSize !== undefined) {
      // page/limit style
      if (paginationInfo.currentPage !== undefined) {
        return {
          page: nextPage,
          limit: paginationInfo.pageSize,
        };
      }

      // offset/limit style
      if (paginationInfo.offset !== undefined) {
        return {
          offset: paginationInfo.offset + paginationInfo.pageSize,
          limit: paginationInfo.pageSize,
        };
      }
    }

    return null;
  }

  /**
   * Transforms parameters to match pagination style expected by an API
   * @param {Object} params - Original parameters
   * @param {string} targetStyle - Target pagination style ('page-limit', 'offset-limit', etc.)
   * @returns {Object} Transformed parameters
   */
  static transformPaginationParams(params, targetStyle) {
    if (!params) {
      return {};
    }

    const result = { ...params };

    switch (targetStyle) {
    case 'page-limit':
      // Transform offset/limit to page/limit
      if (result.offset !== undefined && result.limit) {
        result.page = Math.floor(result.offset / result.limit) + 1;
        delete result.offset;
      }
      // Transform page/per_page to page/limit
      else if (result.per_page) {
        result.limit = result.per_page;
        delete result.per_page;
      }
      break;

    case 'offset-limit':
      // Transform page/limit to offset/limit
      if (result.page !== undefined && result.limit) {
        result.offset = (result.page - 1) * result.limit;
        delete result.page;
      }
      // Transform page/per_page to offset/limit
      else if (result.page !== undefined && result.per_page) {
        result.offset = (result.page - 1) * result.per_page;
        result.limit = result.per_page;
        delete result.page;
        delete result.per_page;
      }
      break;

    case 'page-per_page':
      // Transform offset/limit to page/per_page
      if (result.offset !== undefined && result.limit) {
        result.page = Math.floor(result.offset / result.limit) + 1;
        result.per_page = result.limit;
        delete result.offset;
        delete result.limit;
      }
      // Transform page/limit to page/per_page
      else if (result.limit) {
        result.per_page = result.limit;
        delete result.limit;
      }
      break;
    }

    return result;
  }

  /**
   * Format a response with pagination metadata for MCP clients
   * @param {Object} response - Original API response
   * @returns {Object} Formatted response with pagination metadata
   */
  static formatPaginatedResponse(response) {
    const paginationInfo = this.extractPaginationInfo(response);
    const data = this.extractData(response) || response;

    if (!paginationInfo) {
      return {
        data,
        pagination: null,
      };
    }

    return {
      data,
      pagination: {
        currentPage: paginationInfo.currentPage,
        pageSize: paginationInfo.pageSize,
        totalItems: paginationInfo.totalItems,
        totalPages: paginationInfo.totalPages,
        hasMore: paginationInfo.hasMore,
      },
    };
  }

  /**
   * Auto-paginate through all pages and collect results
   * @param {Function} fetchFn - Function to fetch a page (takes page params)
   * @param {Object} initialParams - Initial pagination parameters
   * @param {Object} options - Pagination options
   * @returns {Promise<Array>} Combined results from all pages
   */
  static async autoPaginate(fetchFn, initialParams = {}, options = {}) {
    const { maxPages = 10, maxItems = 1000, targetStyle = 'page-limit' } = options;

    let allResults = [];
    let currentParams = { ...initialParams };
    let pageCount = 0;

    while (pageCount < maxPages && allResults.length < maxItems) {
      // Fetch page
      const response = await fetchFn(currentParams);

      // Extract data and pagination info
      const data = this.extractData(response) || response;
      const paginationInfo = this.extractPaginationInfo(response);

      // If we got data, add it to our results
      if (Array.isArray(data)) {
        allResults = allResults.concat(data);
      }

      // Stop if we've hit maxItems
      if (allResults.length >= maxItems) {
        break;
      }

      // Stop if no pagination info or no more pages
      if (!paginationInfo || !paginationInfo.hasMore) {
        break;
      }

      // Get parameters for the next page
      const nextPageParams = this.getNextPageParams(paginationInfo);
      if (!nextPageParams) {
        break;
      }

      // Transform pagination params to match target style
      currentParams = {
        ...currentParams,
        ...this.transformPaginationParams(nextPageParams, targetStyle),
      };

      pageCount++;
    }

    return allResults;
  }
}
