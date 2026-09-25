import {useEffect,useState} from 'react';
import {useParams} from 'react-router-dom';
import type {HRAnswer} from '../domain/hrAnswer';
import {canRenderFinalAnswer} from '../domain/hrAnswer';
import {SafeAnswerContent} from '../components/SafeAnswerContent';
import {ArtifactCard} from '../components/ArtifactCard';
import {AnswerRenderBoundary,AnswerUnavailableState} from '../components/AnswerRenderBoundary';
import {fetchProductionAnswer} from '../data/productionAnswerClient';

export function AnswerPage(){
  const {answerKey=''}=useParams();
  const [state,setState]=useState<{loading:boolean;answer:HRAnswer|null}>({loading:true,answer:null});

  useEffect(()=>{
    const controller=new AbortController();
    setState({loading:true,answer:null});
    fetchProductionAnswer(answerKey,controller.signal)
      .then(answer=>setState({loading:false,answer}))
      .catch(()=>setState({loading:false,answer:null}));
    return()=>controller.abort();
  },[answerKey]);

  if(state.loading)return <Shell><section className="state-card"><strong>Loading Answer</strong><p>အတည်ပြုပြီးသော အဖြေကို ဖွင့်နေပါသည်။</p></section></Shell>;
  const answer=state.answer;
  if(!answer||!canRenderFinalAnswer(answer))return <Shell><AnswerUnavailableState/></Shell>;

  return <Shell><Header title={answer.title}/><AnswerRenderBoundary><section className="answer-card"><p className="eyebrow">HR Consultant's Answer</p><SafeAnswerContent content={answer.finalAnswer!}/></section>{answer.artifacts.length>0&&<section className="artifacts"><h2>Related Documents</h2>{answer.artifacts.map((a,i)=><ArtifactCard key={`${a.type}-${i}`} artifact={a}/>)}</section>}<footer>{answer.reviewedBy&&<span>Reviewed by {answer.reviewedBy}</span>}<span>Updated {new Date(answer.updatedAt).toLocaleString()}</span></footer></AnswerRenderBoundary></Shell>
}
function Header({title}:{title:string}){return <header><div className="brand">Pocket HR Partner</div><h1>{title}</h1><span className="status status-resolved">resolved</span></header>}
function Shell({children}:{children:React.ReactNode}){return <main className="viewer-shell">{children}</main>}
