import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
export function SafeAnswerContent({content}:{content:string}){return <div className="answer-content"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml urlTransform={(url)=>{try{const p=new URL(url,'https://sandbox.invalid').protocol;return p==='https:'||p==='mailto:'?defaultUrlTransform(url):'';}catch{return '';}}}>{content}</ReactMarkdown></div>}
