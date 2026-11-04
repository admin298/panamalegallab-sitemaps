import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

test('feature modes differ only by bounded opt-in variable with unchanged free account/class',async()=>{
 const read=name=>readFile(new URL('../config/'+name,import.meta.url),'utf8').then(JSON.parse);
 const base=await read('backend.wrangler.json');
 assert.equal(base.name,'pll-renderer-free-20261103');assert.equal(base.account_id,'20f76014286629dae916202a43465d8d');
 assert.deepEqual(base.exports,{PllRenderer:{type:'durable-object',storage:'sqlite'}});
 for(const mode of ['off','preview','all']){
  const config=await read('backend.'+mode+'.wrangler.json');assert.deepEqual(config,{...base,vars:{PLL_IMAGE_FORMAT:mode,PLL_CSS_STATIC:mode}});
  assert.equal('limits' in config,false);assert.equal('routes' in config,false);
 }
});
test('thin frontend and all twenty-six frozen rendering files remain exact',async()=>{
 const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
 const provenance=JSON.parse(await readFile(new URL('../renderer-source-provenance.json',import.meta.url),'utf8'));
 assert.equal(Object.keys(provenance.files).length,26);
 for(const [file,hash]of Object.entries(provenance.files))assert.equal(sha(await readFile(new URL('../renderer/'+file,import.meta.url))),hash,file);
 assert.equal(sha(await readFile(new URL('../dist/frontend/_worker.js',import.meta.url))),'3d7351a56f2729327f85ecf350e0c4729689b882c11c8b294d4aa771d87f08e9');
});
