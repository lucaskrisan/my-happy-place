import type { FunnelDefinition } from '../schema/v1';
import dinnerAsset from '@/assets/scene-02/video/scene-02-dinner.mp4.asset.json';
import mirrorAsset from '@/assets/scene-05/video/scene-05-mirror-self-criticism.mp4.asset.json';

export const marinaProofFunnel: FunnelDefinition = {
 schemaVersion: 1, id: 'marina-runtime-proof', title: 'Marina runtime proofs', entrySceneId: 'scene-02-dinner', exportable: true,
 assets: [
  { id: 'dinner-video', mediaType: 'video', source: 'permanent', url: dinnerAsset.url },
  { id: 'future-video', mediaType: 'video', source: 'permanent', url: '/assets/scene-04/video/scene-04-marina-future-call-intro-01.mp4' },
  { id: 'mirror-video', mediaType: 'video', source: 'permanent', url: mirrorAsset.url },
  { id: 'marina-voice', mediaType: 'audio', source: 'permanent', url: '/assets/scene-04/audio/marina-future-call-01.mp3' },
  { id: 'connect-sfx', mediaType: 'audio', source: 'permanent', url: '/assets/scene-01/audio/call-connect.mp3' },
  { id: 'end-sfx', mediaType: 'audio', source: 'permanent', url: '/assets/scene-01/audio/call-end.mp3' },
 ],
 scenes: [
  { id:'scene-02-dinner',title:'Jantar',videoAssetId:'dinner-video',nextSceneId:'scene-03-placeholder',events:[
   {id:'dinner-quiz-event',block:'quiz',trigger:{kind:'TIME',seconds:19},blocking:true,title:'O que você acha que Marina vai fazer agora?',questions:[{id:'prediction',title:'O que ela faz?',options:[{id:'ask',label:'Perguntar de novo se ele está bravo',value:'ask_again'},{id:'apologize',label:'Pedir desculpa sem saber por quê',value:'apologize'}]}],actions:[{type:'RESUME_VIDEO'}]},
   {id:'dinner-notification-event',block:'notification',trigger:{kind:'BEFORE_END',seconds:2},blocking:false,actions:[],appName:'Mensagens',senderName:'Mamãe',message:'Preciso te mandar uma coisa.',onTap:[{type:'OPEN_EVENT',eventId:'dinner-messaging-event'}],onDismiss:[{type:'RESUME_VIDEO'}]},
   {id:'dinner-messaging-event',block:'messaging',trigger:{kind:'MANUAL'},blocking:true,contactName:'Mamãe',messages:[{id:'lucia-audio',type:'voice_once',audioAssetId:'marina-voice'}],voiceFailure:'skip',onClose:[{type:'NEXT_SCENE'}],actions:[{type:'NEXT_SCENE'}]},
   {id:'dinner-end',block:'scene_transition',trigger:{kind:'VIDEO_END'},blocking:false,targetSceneId:'scene-03-placeholder',actions:[{type:'NEXT_SCENE'}]},
  ]},
  { id:'scene-04-future',title:'Marina do Futuro',videoAssetId:'future-video',nextSceneId:'scene-05-mirror',events:[{id:'future-call-event',block:'incoming_call',trigger:{kind:'VIDEO_END'},blocking:true,callerName:'Marina',voiceAssetId:'marina-voice',onAccept:[{type:'RESUME_VIDEO'}],onDecline:[{type:'GO_TO_SCENE',sceneId:'scene-05-mirror'}],onEnd:[{type:'GO_TO_SCENE',sceneId:'scene-05-mirror'}],actions:[{type:'GO_TO_SCENE',sceneId:'scene-05-mirror'}]}]},
  { id:'scene-05-mirror',title:'Espelho',videoAssetId:'mirror-video',events:[] },
  { id:'scene-03-placeholder',title:'Continuação',events:[] },
 ],
};
