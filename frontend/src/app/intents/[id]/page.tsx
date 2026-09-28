import IntentDetailClient from './IntentDetailClient';
export default async function IntentDetail({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  return <IntentDetailClient id={id}/>;
}
