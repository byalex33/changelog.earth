export async function groqJSON(instruction,input,{apiKey='',model='openai/gpt-oss-120b',fetcher=fetch,schema}={}) {
 if (!apiKey) throw new Error('Groq not configured');
 const response=await fetcher('https://api.groq.com/openai/v1/chat/completions',{
  method:'POST',signal:AbortSignal.timeout(40_000),
  headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`},
  body:JSON.stringify({model,reasoning_effort:'low',max_completion_tokens:3000,response_format:schema?{type:'json_schema',json_schema:{name:'edition',strict:true,schema}}:{type:'json_object'},messages:[{role:'system',content:instruction},{role:'user',content:input}]}),
 });
 if (!response.ok) throw new Error(`Groq HTTP ${response.status}`);
 const choice=(await response.json()).choices?.[0];
 if (choice?.finish_reason!=='stop') throw new Error('Incomplete Groq response');
 return JSON.parse(choice.message.content);
}
