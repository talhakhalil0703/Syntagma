import React from 'react';
import { renderToString } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkWikiLink from 'remark-wiki-link';

const content = "![[Pasted image 20260304151319.png|963]]";

const components = {
    img: (props: any) => {
        console.log("IMG PROPS:", props);
        return <img {...props} />;
    },
    a: (props: any) => {
        console.log("A PROPS:", props);
        return <a {...props} />;
    }
};

const html = renderToString(
    <ReactMarkdown remarkPlugins={[remarkWikiLink]} components={components}>
        {content}
    </ReactMarkdown>
);

console.log("HTML:", html);
