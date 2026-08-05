'use strict';

const sanitizeHtml = require('sanitize-html');

const ALLOWED_TAGS = [
  'p', 'br', 'h2', 'h3', 'h4', 'ul', 'ol', 'li',
  'strong', 'b', 'em', 'i', 'blockquote', 'a', 'img',
  'figure', 'figcaption', 'code', 'pre', 'hr', 'div', 'span',
  'table', 'thead', 'tbody', 'tr', 'th', 'td'
];

const OPTIONS = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    '*': ['class'],
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding'],
    th: ['scope', 'colspan', 'rowspan'],
    td: ['colspan', 'rowspan']
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {
    img: ['http', 'https']
  },
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  nonTextTags: ['style', 'script', 'textarea', 'option', 'noscript'],
  transformTags: {
    a: function secureExternalLink(tagName, attribs) {
      const nextAttributes = { ...attribs };
      if (nextAttributes.target === '_blank') {
        nextAttributes.rel = 'noopener noreferrer';
      } else {
        delete nextAttributes.target;
        delete nextAttributes.rel;
      }
      return { tagName, attribs: nextAttributes };
    },
    img: function lazyImage(tagName, attribs) {
      return {
        tagName,
        attribs: {
          ...attribs,
          loading: attribs.loading === 'eager' ? 'eager' : 'lazy',
          decoding: 'async'
        }
      };
    }
  }
};

function sanitizeBlogContent(content) {
  return sanitizeHtml(String(content || ''), OPTIONS);
}

module.exports = {
  sanitizeBlogContent
};
