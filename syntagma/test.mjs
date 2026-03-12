import { remark } from 'remark';
import remarkWikiLink from 'remark-wiki-link';

const processor = remark().use(remarkWikiLink, { aliasDivider: '|' });
const ast = processor.parse("![[Pasted image 20260304151319.png|963]]");
console.log(JSON.stringify(ast, null, 2));
