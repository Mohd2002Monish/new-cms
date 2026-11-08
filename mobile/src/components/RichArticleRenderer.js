import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { ExternalLink, Quote } from 'lucide-react-native';

/**
 * Universal safe HTML block and inline token parser.
 * Converts HTML into structured React Native semantic components.
 */
function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Parse an inline HTML fragment (containing <strong>, <em>, <a>, <span>) into styled text tokens
 */
function parseInlineTokens(html) {
  if (!html) return [];
  const tokens = [];

  // Regex to match tags: <a>, <strong>, <b>, <em>, <i>, <span> or plain text
  const tagRegex = /<(\/)?([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g;
  let match;

  let currentLink = null;
  let isBold = false;
  let isItalic = false;
  let sizeMultiplier = 1;

  while ((match = tagRegex.exec(html)) !== null) {
    const isClosing = Boolean(match[1]);
    const tagName = match[2]?.toLowerCase();
    const tagAttrs = match[3] || '';
    const textContent = match[4];

    if (textContent) {
      const cleanText = decodeHtmlEntities(textContent);
      if (cleanText) {
        tokens.push({
          text: cleanText,
          bold: isBold,
          italic: isItalic,
          link: currentLink,
          sizeMultiplier,
        });
      }
      continue;
    }

    if (tagName === 'strong' || tagName === 'b') {
      isBold = !isClosing;
    } else if (tagName === 'em' || tagName === 'i') {
      isItalic = !isClosing;
    } else if (tagName === 'a') {
      if (isClosing) {
        currentLink = null;
      } else {
        const hrefMatch = tagAttrs.match(/href=["']([^"']+)["']/i);
        currentLink = hrefMatch ? hrefMatch[1] : null;
      }
    } else if (tagName === 'span') {
      if (isClosing) {
        sizeMultiplier = 1;
      } else {
        if (tagAttrs.includes('large') || tagAttrs.includes('1.25em')) {
          sizeMultiplier = 1.25;
        } else if (tagAttrs.includes('huge') || tagAttrs.includes('1.5em')) {
          sizeMultiplier = 1.5;
        }
      }
    }
  }

  return tokens;
}

/**
 * Parses raw HTML string into top-level semantic blocks
 */
function parseHtmlBlocks(rawHtml) {
  if (!rawHtml || typeof rawHtml !== 'string') return [];
  const blocks = [];

  // Match top-level tags: h1-h4, blockquote, ul, ol, img, p
  const blockRegex = /<(h[1-4]|blockquote|ul|ol|p|figure|img)([^>]*)>([\s\S]*?)<\/\1>|<img([^>]*)\/?>/gi;
  let match;
  let lastIndex = 0;

  while ((match = blockRegex.exec(rawHtml)) !== null) {
    const tagName = (match[1] || 'img').toLowerCase();
    const tagAttrs = match[2] || match[4] || '';
    const innerContent = match[3] || '';

    if (tagName.startsWith('h')) {
      const level = parseInt(tagName.charAt(1), 10) || 2;
      blocks.push({
        type: 'heading',
        level,
        tokens: parseInlineTokens(innerContent),
      });
    } else if (tagName === 'blockquote') {
      blocks.push({
        type: 'blockquote',
        tokens: parseInlineTokens(innerContent),
      });
    } else if (tagName === 'ul' || tagName === 'ol') {
      const listItems = [];
      const itemRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let liMatch;
      while ((liMatch = itemRegex.exec(innerContent)) !== null) {
        listItems.push(parseInlineTokens(liMatch[1]));
      }
      blocks.push({
        type: 'list',
        ordered: tagName === 'ol',
        items: listItems,
      });
    } else if (tagName === 'img' || (tagName === 'figure' && innerContent.includes('<img'))) {
      const srcMatch = (tagAttrs + innerContent).match(/src=["']([^"']+)["']/i);
      const altMatch = (tagAttrs + innerContent).match(/alt=["']([^"']+)["']/i);
      if (srcMatch && srcMatch[1]) {
        blocks.push({
          type: 'image',
          src: srcMatch[1],
          alt: altMatch ? altMatch[1] : null,
        });
      }
    } else {
      // Standard paragraph
      const tokens = parseInlineTokens(innerContent);
      if (tokens.length > 0) {
        blocks.push({
          type: 'paragraph',
          tokens,
        });
      }
    }
    lastIndex = blockRegex.lastIndex;
  }

  // Fallback: If no blocks matched (e.g. raw text without tags)
  if (blocks.length === 0) {
    const rawParagraphs = rawHtml.split(/\n\s*\n/).filter(Boolean);
    return rawParagraphs.map((p) => ({
      type: 'paragraph',
      tokens: [{ text: decodeHtmlEntities(p.trim()), bold: false, italic: false, link: null, sizeMultiplier: 1 }],
    }));
  }

  return blocks;
}

export default function RichArticleRenderer({
  contentHtml,
  fontSize = 16,
  colors,
  typography,
}) {
  const blocks = useMemo(() => {
    try {
      return parseHtmlBlocks(contentHtml);
    } catch (err) {
      console.warn('RichArticleRenderer parse error:', err);
      return [];
    }
  }, [contentHtml]);

  const handleLinkPress = async (url) => {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot Open Link', `Unable to open this web link: ${url}`);
      }
    } catch (e) {
      console.warn('Linking error:', e);
    }
  };

  const renderTokens = (tokens, baseScale = 1, inheritStyle = {}) => {
    return tokens.map((token, idx) => {
      const tokenFontSize = fontSize * baseScale * (token.sizeMultiplier || 1);
      const style = [
        inheritStyle,
        {
          fontSize: tokenFontSize,
          lineHeight: Math.round(tokenFontSize * 1.6),
          color: token.link ? colors.primary : colors.text,
          fontWeight: token.bold ? '700' : inheritStyle.fontWeight || '400',
          fontStyle: token.italic ? 'italic' : 'normal',
          textDecorationLine: token.link ? 'underline' : 'none',
        },
      ];

      if (token.link) {
        return (
          <Text
            key={`tok_${idx}`}
            style={style}
            onPress={() => handleLinkPress(token.link)}
          >
            {token.text}
          </Text>
        );
      }

      return (
        <Text key={`tok_${idx}`} style={style}>
          {token.text}
        </Text>
      );
    });
  };

  return (
    <View style={styles.container}>
      {blocks.map((block, bIdx) => {
        try {
          if (block.type === 'heading') {
            const headingScale = block.level === 1 ? 1.5 : block.level === 2 ? 1.3 : 1.15;
            return (
              <View key={`b_${bIdx}`} style={styles.headingBlock}>
                <Text
                  style={[
                    styles.headingText,
                    {
                      color: colors.text,
                      fontFamily: typography.fontSerif,
                      fontSize: Math.round(fontSize * headingScale),
                      lineHeight: Math.round(fontSize * headingScale * 1.35),
                    },
                  ]}
                >
                  {renderTokens(block.tokens, headingScale, {
                    fontWeight: '800',
                    fontFamily: typography.fontSerif,
                  })}
                </Text>
              </View>
            );
          }

          if (block.type === 'blockquote') {
            return (
              <View
                key={`b_${bIdx}`}
                style={[
                  styles.quoteBlock,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderLeftColor: colors.primary,
                  },
                ]}
              >
                <Quote size={20} color={colors.primary} style={styles.quoteIcon} />
                <Text style={styles.quoteText}>
                  {renderTokens(block.tokens, 1.05, {
                    fontStyle: 'italic',
                    color: colors.text,
                  })}
                </Text>
              </View>
            );
          }

          if (block.type === 'list') {
            return (
              <View key={`b_${bIdx}`} style={styles.listContainer}>
                {block.items.map((itemTokens, itemIdx) => (
                  <View key={`li_${itemIdx}`} style={styles.listItemRow}>
                    <Text style={[styles.listBullet, { color: colors.primary, fontSize }]}>
                      {block.ordered ? `${itemIdx + 1}.` : '•'}
                    </Text>
                    <Text style={styles.listItemText}>
                      {renderTokens(itemTokens, 1)}
                    </Text>
                  </View>
                ))}
              </View>
            );
          }

          if (block.type === 'image') {
            return (
              <View key={`b_${bIdx}`} style={styles.imageBlock}>
                <ExpoImage
                  source={{ uri: block.src }}
                  style={styles.inlineImage}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="disk"
                />
                {block.alt ? (
                  <Text style={[styles.captionText, { color: colors.textMuted }]}>
                    {block.alt}
                  </Text>
                ) : null}
              </View>
            );
          }

          // Default: Paragraph
          return (
            <View key={`b_${bIdx}`} style={styles.paragraphBlock}>
              <Text style={styles.paragraphText}>
                {renderTokens(block.tokens, 1)}
              </Text>
            </View>
          );
        } catch (err) {
          console.warn('Block render failed:', err);
          return null;
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  paragraphBlock: {
    marginBottom: 16,
  },
  paragraphText: {
    letterSpacing: 0.2,
  },
  headingBlock: {
    marginTop: 20,
    marginBottom: 10,
  },
  headingText: {
    fontWeight: '800',
  },
  quoteBlock: {
    flexDirection: 'row',
    padding: 14,
    borderLeftWidth: 4,
    borderRadius: 6,
    marginVertical: 14,
    gap: 10,
  },
  quoteIcon: {
    marginTop: 2,
    opacity: 0.8,
  },
  quoteText: {
    flex: 1,
  },
  listContainer: {
    marginVertical: 10,
    paddingLeft: 6,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  listBullet: {
    fontWeight: '700',
    minWidth: 16,
  },
  listItemText: {
    flex: 1,
  },
  imageBlock: {
    marginVertical: 16,
  },
  inlineImage: {
    width: '100%',
    height: 220,
    borderRadius: 10,
  },
  captionText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 6,
  },
});

