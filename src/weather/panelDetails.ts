import {dateKey,number,timeLabel,rainIsFresh,futureRain,timestamp,type WeatherData} from './model.ts';
import {forecastFresh} from './calendarWeather.ts';
export function panelDetails(data:WeatherData|null,day:string,now=Date.now()) {
 const f=data?.forecast,today=day===dateKey(now),i=f?.daily.time.indexOf(day)??-1;
 const particles=data?.extras?.air?.value?.pollutants??[];
 const pollutant=(name:string)=>{
  const p=particles.find(p=>p.code.toLowerCase().replace('2p5','25').replace(/[^a-z0-9]/g,'')===name);
  const v=p?.concentration?.value;
  return v!=null&&Number.isFinite(v)&&v>=0?`${number(v)} ${p!.concentration.unit}`:'暂缺';
 };
 const degree=f?.current.wind_direction,scale=f?.current.wind_scale;
 const direction=degree!=null&&Number.isFinite(degree)&&degree>=0&&degree<360?['北','东北','东','东南','南','西南','西','西北'][Math.round(degree/45)%8]+'风':'';
 const wind=direction+(scale!=null&&Number.isFinite(scale)&&scale>=0?` ${number(scale)}级`:'');
 let rain='短时降雨 · 暂无可靠数据',rainNote='',wetRain=false;
 if(rainIsFresh(data,now)){
  const points=futureRain(data!.minutely,now);
  const valid=points.every(p=>p.precip!=null&&String(p.precip).trim()!==''&&Number.isFinite(Number(p.precip))&&Number(p.precip)>=0);
  if(!valid)rain='短时降雨 · 数据不完整';
  else {
   const wet=points.filter(p=>Number(p.precip)>0);
   const first=wet[0];wetRain=!!first;
   rain=!first?'未来两小时预计无降水':timestamp(first.fxTime)<=now+5*60000?'短时预报 · 当前附近可能有降水':`短时预报 · 预计 ${timeLabel(first.fxTime)} 起有降水`;
   rainNote=`${timeLabel(data!.minutely!.updateTime)} 更新${first?" · 出门建议备伞":""}`;
   if(first&&forecastFresh(data,now)&&f){
    const ps=wet.map(p=>{
     const times=f.hourly.time.map(timestamp),t=timestamp(p.fxTime);
     const index=times.findIndex(h=>Math.abs(h-t)<=30*60000);
     return index<0?null:f.hourly.precipitation_probability[index];
    });
    if(ps.length&&ps.every(p=>p===0))rainNote=`${timeLabel(data!.minutely!.updateTime)} 更新 · 与小时预报有差异，建议备伞`;
   }
  }
 }
 const sun=i>=0&&day>=dateKey(now)?{rise:timeLabel(f!.daily.sunrise[i]),set:timeLabel(f!.daily.sunset[i])}:null;
 return {pollutants:`PM2.5 ${pollutant('pm25')} · PM10 ${pollutant('pm10')}`,wind:today?(wind||number(f?.current.wind_speed_10m,' km/h')):'—',rain,rainNote,wetRain,sun};
}
