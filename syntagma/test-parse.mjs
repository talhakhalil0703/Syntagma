import { remark } from 'remark';
import remarkGfm from 'remark-gfm';

const processor = remark().use(remarkGfm);
const ast = processor.parse("![alt](<Pasted image 2026.png|963>)\n\n![alt2](March 10, 2026)");
console.log(JSON.stringify(ast, null, 2));

const ast2 = processor.parse("![alt3](March%2010,%202026)\n\n![alt4](Pasted%20image%202026.png|963)");
console.log(JSON.stringify(ast2, null, 2));
