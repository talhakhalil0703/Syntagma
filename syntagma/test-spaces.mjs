import { remark } from 'remark';
import remarkGfm from 'remark-gfm';

const processor = remark().use(remarkGfm);
const ast = processor.parse("![alt](<Pasted image 2026.png|963>)");
console.log(JSON.stringify(ast, null, 2));

const ast2 = processor.parse("![alt](Pasted image 2026.png|963)");
console.log(JSON.stringify(ast2, null, 2));
