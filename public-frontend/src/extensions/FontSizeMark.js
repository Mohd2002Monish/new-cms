import { Mark, mergeAttributes } from '@tiptap/core';

export const FONT_SIZES = {
  small: { label: 'Small', style: 'font-size: 0.85em;' },
  normal: { label: 'Normal', style: '' },
  large: { label: 'Large', style: 'font-size: 1.35em; font-weight: 700; line-height: 1.3;' },
  huge: { label: 'Huge', style: 'font-size: 1.75em; font-weight: 800; line-height: 1.2;' },
};

export const FontSizeMark = Mark.create({
  name: 'fontSize',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      size: {
        default: 'normal',
        parseHTML: element => {
          const dataSize = element.getAttribute('data-font-size');
          if (dataSize && FONT_SIZES[dataSize]) return dataSize;

          const inlineStyle = element.style?.fontSize || '';
          if (inlineStyle.includes('1.75') || inlineStyle.includes('28px')) return 'huge';
          if (inlineStyle.includes('1.35') || inlineStyle.includes('22px')) return 'large';
          if (inlineStyle.includes('0.85') || inlineStyle.includes('14px')) return 'small';
          return 'normal';
        },
        renderHTML: attributes => {
          if (!attributes.size || attributes.size === 'normal') {
            return {};
          }
          const config = FONT_SIZES[attributes.size] || FONT_SIZES.normal;
          return {
            'data-font-size': attributes.size,
            style: config.style,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-font-size]',
      },
      {
        tag: 'span[style*="font-size"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
});

export default FontSizeMark;

