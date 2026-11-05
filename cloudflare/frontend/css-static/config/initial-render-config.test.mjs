import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initialRenderCacheRevision } from '../src/initial-render.js';
import { impressionCacheRevision } from '../src/native-impressions.js';
const read=async name=>JSON.parse(await readFile(new URL('../'+name,import.meta.url)));
test('font deployment configs only add the explicit font mode to the current accepted backend',async()=>{
  const {$schema,...base}=await read('config/backend.impressions-all.wrangler.json');
  for(const mode of ['off','preview','all']){
    const config=await read('config/backend.initial-render-'+mode+'.wrangler.json');
    assert.deepEqual(config,{...base,vars:{...base.vars,PLL_INITIAL_RENDER:mode}});
  }
});
test('build records every impression/font policy cache revision and zero new resources',async()=>{
  const manifest=await read('build-manifest.json');
  assert.equal(manifest.initialRender.modeVariable,'PLL_INITIAL_RENDER');
  for(const impressions of ['off','preview','all'])for(const font of ['off','preview','all'])
    assert.equal(manifest.htmlCache.revisionsByPolicyMode[impressions][font],initialRenderCacheRevision(impressionCacheRevision(impressions),font));
  assert.equal(manifest.htmlCache.addedBindings,0);assert.equal(manifest.htmlCache.newPaidResources,0);
  assert.equal(manifest.htmlCache.recurringJobs,0);
});
