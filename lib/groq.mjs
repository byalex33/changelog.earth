export async function groqJSON(instruction,input,{apiKey='',model='openai/gpt-oss-120b',fetcher=fetch,schema,reasoningEffort='low',maxOutputTokens=3000}={}) {
 if (!apiKey) throw new Error('Groq not configured');
 const signal=AbortSignal.timeout(70_000);
 const request={
  method:'POST',signal,
  headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`},
  body:JSON.stringify({model,reasoning_effort:reasoningEffort,max_completion_tokens:maxOutputTokens,response_format:schema?{type:'json_schema',json_schema:{name:'edition',strict:true,schema}}:{type:'json_object'},messages:[{role:'system',content:instruction},{role:'user',content:input}]}),
 };
 let response=await fetcher('https://api.groq.com/openai/v1/chat/completions',request);
 const retryAfter=Number(response.headers.get('retry-after'));
 if (response.status===429 && response.headers.has('retry-after') && Number.isFinite(retryAfter) && retryAfter>=0 && retryAfter<=60) {
  await response.body?.cancel();
  await new Promise(resolve=>setTimeout(resolve,retryAfter*1000));
  response=await fetcher('https://api.groq.com/openai/v1/chat/completions',request);
 }
 if (!response.ok) throw new Error(`Groq HTTP ${response.status}`);
 const result=await response.json();
 if (result.usage) console.log('Groq usage',JSON.stringify({model,promptTokens:result.usage.prompt_tokens,completionTokens:result.usage.completion_tokens,totalTokens:result.usage.total_tokens}));
 const choice=result.choices?.[0];
 if (choice?.finish_reason!=='stop') throw new Error('Incomplete Groq response');
 return JSON.parse(choice.message.content);
}
