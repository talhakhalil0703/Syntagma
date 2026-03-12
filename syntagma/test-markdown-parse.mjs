import { remark } from 'remark';
import remarkWikiLink from 'remark-wiki-link';

const processor = remark().use(remarkWikiLink);

const text = "![[file.md]]\n\n![[Pasted image.png|963]]";
const ast = processor.parse(text);

console.log(JSON.stringify(ast, null, 2));
