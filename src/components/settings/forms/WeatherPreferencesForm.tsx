import { Alert, Button, Form, Input, InputNumber, Segmented, Select, Switch } from 'antd';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';
import { useConfigSync } from '../../../sync/configStore.ts';
import type { Settings, SettingsResponse } from '../../../weather/model.ts';
export default function WeatherPreferencesForm() {
 const {data:c,sync}=useConfigSync();
 const [response,setResponse]=useState<SettingsResponse|null>(null);
 const [draft,setDraft]=useState<Settings|null>(null);
 const [key,setKey]=useState(''); const [clear,setClear]=useState(false);
 const [busy,setBusy]=useState(false); const [error,setError]=useState('');const [saved,setSaved]=useState(false);
 useEffect(()=>{if(isTauri())void invoke<SettingsResponse>('weather_settings').then(r=>{setResponse(r);setDraft(r.settings);}).catch(e=>setError(String(e)));},[]);
 const save=async()=>{if(!draft)return;setBusy(true);setError('');setSaved(false);
  try {const r=await invoke<SettingsResponse>('weather_save_settings',{settings:draft,apiKey:clear?'':key.trim()||null});setResponse(r);setDraft(r.settings);setKey('');setClear(false);await emit('weather-settings-changed');setSaved(true);}
  catch(e){setError(String(e));}finally{setBusy(false);}
 };
 return <Form layout="vertical" style={{maxWidth:570}} onFinish={()=>void save()}>
  <h2>天气与动画</h2><p className="settings-description">选择日期后，整个面板随当天的预报变化；超出预报范围时恢复中性背景。</p>
  <Form.Item label="天气氛围"><Segmented value={c.weatherAtmosphere} options={[{label:'鲜明',value:'vivid'},{label:'柔和',value:'soft'}]} onChange={v=>void sync('weatherAtmosphere',v)} /></Form.Item>
  <Form.Item label="优雅动态效果"><Switch checked={c.weatherAnimation} onChange={v=>void sync('weatherAnimation',v)} /><span className="settings-inline-hint"> 缓慢云层、细雨与雪花，切换时柔和渐变</span></Form.Item>
  <h3>天气连接</h3><p className="settings-description">API 凭证只保存在这台电脑，更换电脑后需要重新填写。</p>
  {draft&&<>
   <Form.Item label="天气服务"><Select value={draft.provider} onChange={provider=>setDraft({...draft,provider})} options={[{value:'qweather',label:'和风天气'},{value:'open-meteo',label:'Open-Meteo'}]} /></Form.Item>
   {draft.provider==='qweather'&&<>
    <Form.Item label="API Host"><Input autoComplete="off" value={draft.host} placeholder="xxx.qweatherapi.com" onChange={e=>{setDraft({...draft,host:e.target.value});setSaved(false);}} /></Form.Item>
    <Form.Item label="API Key"><Input.Password autoComplete="new-password" value={key} placeholder={response?.hasKey?'已加密保存，留空保留':'填写你的 API Key'} onChange={e=>{setKey(e.target.value);setClear(false);setSaved(false);}} /></Form.Item>
    {response?.hasKey&&<Form.Item label="清除本机已保存的密钥"><Switch checked={clear} onChange={setClear} /></Form.Item>}
   </>}
   <h3>常用地点</h3>
   {draft.locations.map((p,i)=><section className="settings-place" key={i}>
    <div className="settings-place-heading"><strong>地点 {i+1}</strong><Button type="text" danger size="small" disabled={draft.locations.length===1} onClick={()=>setDraft({...draft,locations:draft.locations.filter((_,n)=>n!==i),selected:0})}>移除</Button></div>
    <Form.Item label="名称"><Input required maxLength={16} value={p.name} onChange={e=>setDraft({...draft,locations:draft.locations.map((v,n)=>n===i?{...v,name:e.target.value}:v)})}/></Form.Item>
    <div style={{display:'flex',gap:12}}>{(['longitude','latitude'] as const).map(field=><Form.Item key={field} label={field==='longitude'?'经度':'纬度'}><InputNumber required step={0.001} min={field==='longitude'?-180:-90} max={field==='longitude'?180:90} value={p[field]} onChange={value=>{if(value!=null)setDraft({...draft,locations:draft.locations.map((v,n)=>n===i?{...v,[field]:value}:v)});}} /></Form.Item>)}</div>
    <Form.Item label="位置说明"><Input maxLength={80} value={p.description} onChange={e=>setDraft({...draft,locations:draft.locations.map((v,n)=>n===i?{...v,description:e.target.value}:v)})}/></Form.Item>
   </section>)}
   <Button disabled={draft.locations.length>=5} onClick={()=>setDraft({...draft,locations:[...draft.locations,{name:'新地点',description:'',longitude:121.47,latitude:31.23}]})}>添加地点</Button>
   <Form.Item label="默认地点" style={{marginTop:18}}><Select value={draft.selected} onChange={selected=>setDraft({...draft,selected})} options={draft.locations.map((p,i)=>({value:i,label:p.name}))}/></Form.Item>
   <Button type="primary" htmlType="submit" loading={busy}>保存天气连接与地点</Button>
  </>}
  {error&&<Alert style={{marginTop:12}} type="error" showIcon title={error}/>}
  {saved&&<Alert style={{marginTop:12}} type="success" showIcon title="已保存，日历正在刷新天气。"/>}
 </Form>;
}
