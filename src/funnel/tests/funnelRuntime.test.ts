import { describe, expect, it } from 'vitest';
import { FunnelRuntime } from '../runtime/funnelRuntime';
import { funnelSchema, type FunnelDefinition } from '../schema/v1';
import { validateFunnel } from '../validator/validateFunnel';

const makeFunnel = (events: unknown[] = [], extra: Partial<FunnelDefinition> = {}): FunnelDefinition => funnelSchema.parse({ schemaVersion: 1, id: 'funnel', title: 'Test', entrySceneId: 'a', assets: [{ id: 'video', mediaType: 'video', source: 'permanent', url: '/video.mp4' }], scenes: [{ id: 'a', title: 'A', duration: 30, nextSceneId: 'b', events }, { id: 'b', title: 'B', events: [] }], ...extra });
describe('FunnelRuntime', () => {
 it('preserves sourceEventId and completes the originating event exactly once', () => { const runtime=new FunnelRuntime(makeFunnel([{id:'mother-call-event',block:'incoming_call',trigger:{kind:'TIME',seconds:1},callerName:'Mae',onAccept:[{type:'RESUME_VIDEO'}],onDecline:[{type:'RESUME_VIDEO'}],onEnd:[{type:'RESUME_VIDEO'}]}])); runtime.start();runtime.updateTime(1);expect(runtime.snapshot().activeInteraction).toEqual({id:'mother-call-event',sourceEventId:'mother-call-event'});expect(runtime.completeInteraction('mother-call-event')).toBe(true);expect(runtime.completeInteraction('mother-call-event')).toBe(false);expect(runtime.snapshot().events['mother-call-event']).toBe('completed'); });
 it('invalidates stale callbacks after reset',()=>{const runtime=new FunnelRuntime(makeFunnel([{id:'quiz',block:'quiz',trigger:{kind:'TIME',seconds:1},title:'Q',questions:[{id:'q',title:'Q',options:[{id:'a',label:'A'}]}],actions:[{type:'RESUME_VIDEO'}]}]));const old=runtime.start();runtime.reset();runtime.updateTime(2,old);expect(runtime.snapshot().events['quiz']).toBe('armed');});
 it('fires TIME on crossing and forward seek but not twice',()=>{const runtime=new FunnelRuntime(makeFunnel([{id:'n',block:'notification',trigger:{kind:'TIME',seconds:5},appName:'A',senderName:'S',message:'M'}]));runtime.start();runtime.updateTime(4);expect(runtime.snapshot().events['n']).toBe('armed');runtime.seek(6);expect(runtime.snapshot().events['n']).toBe('completed');runtime.updateTime(8);expect(runtime.snapshot().executedActions).toHaveLength(0);});
 it('rearms unfinished time events on backward seek',()=>{const runtime=new FunnelRuntime(makeFunnel([{id:'q',block:'quiz',trigger:{kind:'TIME',seconds:5},title:'Q',questions:[{id:'q1',title:'Q',options:[{id:'a',label:'A'}]}],actions:[{type:'RESUME_VIDEO'}]}]));runtime.start();runtime.updateTime(6);runtime.seek(2);expect(runtime.snapshot().events['q']).toBe('armed');});
 it('fires BEFORE_END from real metadata duration',()=>{const runtime=new FunnelRuntime(makeFunnel([{id:'n',block:'notification',trigger:{kind:'BEFORE_END',seconds:2},appName:'A',senderName:'S',message:'M'}]));runtime.start();runtime.setDuration(10);runtime.updateTime(7.9);expect(runtime.snapshot().events['n']).toBe('armed');runtime.updateTime(8);expect(runtime.snapshot().events['n']).toBe('completed');});
 it('fires VIDEO_END only when mediaEnded is signaled',()=>{const runtime=new FunnelRuntime(makeFunnel([{id:'call',block:'incoming_call',trigger:{kind:'VIDEO_END'},callerName:'M',onAccept:[{type:'RESUME_VIDEO'}],onDecline:[{type:'RESUME_VIDEO'}],onEnd:[{type:'RESUME_VIDEO'}]}]));runtime.start();runtime.updateTime(30);expect(runtime.snapshot().events['call']).toBe('armed');runtime.mediaEnded();expect(runtime.snapshot().events['call']).toBe('active');});
 it('fires SCENE_START and INTERACTION_COMPLETE',()=>{const runtime=new FunnelRuntime(makeFunnel([{id:'quiz',block:'quiz',trigger:{kind:'SCENE_START'},title:'Q',questions:[{id:'q',title:'Q',options:[{id:'a',label:'A'}]}],actions:[{type:'RESUME_VIDEO'}]},{id:'after',block:'notification',trigger:{kind:'INTERACTION_COMPLETE',interactionId:'quiz'},appName:'A',senderName:'S',message:'M'}]));runtime.start();expect(runtime.snapshot().events['quiz']).toBe('active');runtime.completeInteraction('quiz');expect(runtime.snapshot().events['after']).toBe('completed');});
 it('navigates with validated GO_TO_SCENE',()=>{const runtime=new FunnelRuntime(makeFunnel([{id:'go',block:'notification',trigger:{kind:'SCENE_START'},appName:'A',senderName:'S',message:'M',actions:[{type:'GO_TO_SCENE',sceneId:'b'}]}]));runtime.start();expect(runtime.snapshot().sceneId).toBe('b');});
 it('records media errors',()=>{const runtime=new FunnelRuntime(makeFunnel());runtime.reportMediaError('video','network','video');expect(runtime.snapshot().mediaErrors[0]?.assetId).toBe('video');});
 // completeInteraction only ever runs an event's base `actions` — outcome-specific lists (onAccept,
 // onDecline, onEnd, onClose, onTap, onDismiss) must be executed explicitly by the caller, same as the
 // guided preview (RuntimeOverlays.tsx) and funnel-runtime-proof.tsx (the reference implementation) do.
 it('accepting a call runs its action list but leaves the interaction active (the overlay must not vanish mid-call)', () => {
   const runtime = new FunnelRuntime(makeFunnel([{ id: 'call', block: 'incoming_call', trigger: { kind: 'TIME', seconds: 1 }, callerName: 'Mãe', onAccept: [{ type: 'RESUME_VIDEO' }], onDecline: [{ type: 'STOP' }], onEnd: [{ type: 'NEXT_SCENE' }] }]));
   runtime.start();
   runtime.updateTime(1);
   const { runId } = runtime.snapshot();
   runtime.execute([{ type: 'RESUME_VIDEO' }], 'call', runId); // what onAccept alone does — no completeInteraction call
   const afterAccept = runtime.snapshot();
   expect(afterAccept.activeInteraction).toEqual({ id: 'call', sourceEventId: 'call' });
   expect(afterAccept.mediaState).toBe('playing');
 });
 it('ending an accepted call runs onEnd and completes the interaction, navigating via NEXT_SCENE', () => {
   const runtime = new FunnelRuntime(makeFunnel([{ id: 'call', block: 'incoming_call', trigger: { kind: 'TIME', seconds: 1 }, callerName: 'Mãe', onAccept: [{ type: 'RESUME_VIDEO' }], onDecline: [{ type: 'STOP' }], onEnd: [{ type: 'NEXT_SCENE' }] }]));
   runtime.start();
   runtime.updateTime(1);
   const { runId } = runtime.snapshot();
   runtime.execute([{ type: 'RESUME_VIDEO' }], 'call', runId); // accept
   runtime.execute([{ type: 'NEXT_SCENE' }], 'call', runId); // what onEnd runs, exactly as RuntimeOverlays does
   expect(runtime.completeInteraction('call', runId)).toBe(false); // stale: NEXT_SCENE already bumped runId
   expect(runtime.snapshot().sceneId).toBe('b');
   expect(runtime.snapshot().activeInteraction).toBeNull();
 });
});
describe('validateFunnel',()=>{
 it('finds invalid targets, blocking exits, invalid quiz and choice',()=>{const f=makeFunnel([{id:'bad',block:'quiz',trigger:{kind:'TIME',seconds:31},blocking:true,title:'Q',questions:[],actions:[]},{id:'choice',block:'choice',trigger:{kind:'MANUAL'},title:'C',options:[]}]);f.entrySceneId='nope';f.scenes.push({id:'orphan',title:'O',events:[]});const codes=validateFunnel(f).map(i=>i.code);expect(codes).toContain('entry_scene_missing');expect(codes).toContain('quiz_empty');expect(codes).toContain('choice_empty');expect(codes).toContain('blocking_no_exit');expect(codes).toContain('scene_unreachable');});
 it('rejects preview assets in exportable definitions',()=>{const f=makeFunnel();f.assets=[{id:'preview',mediaType:'video',source:'preview',objectUrl:'blob:x',fileName:'x.mp4'}];expect(validateFunnel(f).some(i=>i.code==='preview_asset')).toBe(true);});
 it('finds duplicate ids and invalid action targets',()=>{const f=makeFunnel([{id:'same',block:'notification',trigger:{kind:'MANUAL'},appName:'A',senderName:'S',message:'M',actions:[{type:'GO_TO_SCENE',sceneId:'missing'},{type:'OPEN_EVENT',eventId:'missing-event'}]},{id:'same',block:'notification',trigger:{kind:'MANUAL'},appName:'A',senderName:'S',message:'M',actions:[]}]);const codes=validateFunnel(f).map(i=>i.code);expect(codes).toContain('duplicate_id');expect(codes).toContain('scene_target_missing');expect(codes).toContain('event_target_missing');});
 it('does not fire VIDEO_END from time updates',()=>{const runtime=new FunnelRuntime(makeFunnel([{id:'end',block:'scene_transition',trigger:{kind:'VIDEO_END'},blocking:false,targetSceneId:'b',actions:[{type:'NEXT_SCENE'}]}]));runtime.start();runtime.updateTime(99);expect(runtime.snapshot().sceneId).toBe('a');runtime.mediaEnded();expect(runtime.snapshot().sceneId).toBe('b');});
});
