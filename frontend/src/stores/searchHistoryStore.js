import { defineStore } from 'pinia';
import { searchHistoryService } from '../services/searchHistoryService';

export const useSearchHistoryStore = defineStore('searchHistory', {
    state: () => ({
        searchHistory: [],
        currentSearch: null,
        loading: false,
        error: null,
        pagination: {
            page: 1,
            limit: 10,
            total: 0,
            pages: 0
        }
    }),

    actions: {
        async saveSearch(searchData) {
            try {
                this.loading = true;
                const savedSearch = await searchHistoryService.saveSearch(searchData);
                this.searchHistory.unshift(savedSearch);
                return savedSearch;
            } catch (error) {
                this.error = error.message;
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async fetchSearchHistory(page = 1) {
            try {
                this.loading = true;
                const response = await searchHistoryService.getSearchHistory(page);
                this.searchHistory = response.searches;
                this.pagination = {
                    page: response.page,
                    limit: response.limit,
                    total: response.total,
                    pages: response.pages
                };
            } catch (error) {
                this.error = error.message;
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async getSearchById(id) {
            try {
                this.loading = true;
                const search = await searchHistoryService.getSearchById(id);
                this.currentSearch = search;
                return search;
            } catch (error) {
                this.error = error.message;
                throw error;
            } finally {
                this.loading = false;
            }
        }
    }
}); 