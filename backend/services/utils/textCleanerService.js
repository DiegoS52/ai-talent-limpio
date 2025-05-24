export const textCleaner = {
    cleanHtmlEntities(text) {
        if (!text) return '';
        return text
            .replace(/&nbsp;/g, ' ')
            .replace(/&iexcl;/g, '¡')
            .replace(/&iacute;/g, 'í')
            .replace(/&oacute;/g, 'ó')
            .replace(/&eacute;/g, 'é')
            .replace(/&uacute;/g, 'ú')
            .replace(/&ntilde;/g, 'ñ')
            .replace(/&quot;/g, '"')
            .replace(/&aacute;/g, 'á')
            .replace(/&#39;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&');
    },

    normalizeSpaces(text) {
        if (!text) return '';
        return text
            .replace(/\s+/g, ' ')
            .replace(/\n\s+/g, '\n')
            .trim();
    },

    cleanText(text) {
        if (!text) return '';
        return this.normalizeSpaces(this.cleanHtmlEntities(text));
    }
}; 