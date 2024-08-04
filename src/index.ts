import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import path from 'path'
import { promises as fs } from 'fs'
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import {PromptTemplate} from "@langchain/core/prompts";
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { Ollama } from '@langchain/community/llms/ollama';
import { createRetrievalChain } from 'langchain/chains/retrieval';

const app = new Hono()

const ollama = new Ollama({
  baseUrl: "http://localhost:11434", // Default value
  model: "gemma2:2b", // Default value
});

// Metin dosyasını okuma fonksiyonu

const getTextFile = async () => {
  //const filePath = path.join(__dirname, '../data/langchain-test.txt')
  const filePath = path.join(__dirname, '../data/wsj.txt')
  
  const data = await fs.readFile(filePath, 'utf-8')
  
  return data
}

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

//Vector DB

let vectorStore: MemoryVectorStore;

app.get('/loadTextEmbeddings',async (c) => {
const text = await getTextFile();

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  separators:['\n\n', '\n', ' ', '', '###'],
  chunkOverlap:50
});
  const output = await splitter.createDocuments([text]);

  const embeddings = new OllamaEmbeddings({
    model: "gemma2:2b", 
    baseUrl: "http://localhost:11434", //default is "http://localhost:11434"
    requestOptions: {
      useMMap: true, // use_mmap 1
      numThread: 6, // num_thread 6
      numGpu: 1, // num_gpu 1
    },
  });

  //ilerki aşamada bunu sqLite'a, MongoDb'ye  kaydedebiliriz.
  vectorStore = await MemoryVectorStore.fromDocuments( output,embeddings);
  
  return c.json({message: 'Text embeddings loaded successfully'})
})

// to ask a question, firstly we should load the text embeddings
app.post('/ask', async(c) => {
  const { question } = await c.req.json()

  if(!vectorStore){
    return c.json({message: 'Text embeddings not loaded yet'})
  }

  const prompt = PromptTemplate.fromTemplate(`You are a helpful AI assistant. Answer the following question based only on the provided context. If the answer cannot be derived from the context, say "I don't have enough information to answer that question." If I like your results I'll tip you $1000!

    Context: {context}
    
    Question: {question}
    
    Answer: 
      `)
    
      const documentChain = await createStuffDocumentsChain({
        llm: ollama,
        prompt
       });

       const retrievelChain= await createRetrievalChain({
        combineDocsChain: documentChain,
        retriever: vectorStore.asRetriever({
          k: 3,
        }),
      });

      const response = await retrievelChain.invoke({
        question,
        input:""
      });

      return c.json({answer:response.answer})
    });    


    /* 
      
    */
const port = 3003
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port

})