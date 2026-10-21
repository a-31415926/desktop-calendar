import {dateKey,number,timeLabel,rainIsFresh,futureRain,type WeatherData} from './model.ts';
import {extraIsFresh} from './extras.ts';
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
 const lifeEntry=data?.extras?.indices;
 const life=day>=dateKey(now)&&extraIsFresh(lifeEntry,now,12*3600000)?lifeEntry?.value?.daily.find(d=>d.date===day&&d.type==='3'):null;
 let rain='两小时降雨 · 暂无可靠数据';
 if(rainIsFresh(data,now)){
  const points=futureRain(data!.minutely,now),wet=points.filter(p=>Number.isFinite(Number(p.precip))&&Number(p.precip)>0);
  rain=points.some(p=>p.precip==null||String(p.precip).trim()===''||!Number.isFinite(Number(p.precip)))?'两小时降雨 · 数据不完整':wet.length?`两小时降雨 · ${timeLabel(wet[0].fxTime)} 起有降水`:'未来两小时预计无降水';
  if(data?.minutely?.summary&&rain!=='两小时降雨 · 数据不完整')rain=data.minutely.summary;
 }
 const sun=i>=0&&day>=dateKey(now)?{rise:timeLabel(f!.daily.sunrise[i]),set:timeLabel(f!.daily.sunset[i])}:null;
 return {pollutants:`PM2.5 ${pollutant('pm25')} · PM10 ${pollutant('pm10')}`,wind:today?(wind||number(f?.current.wind_speed_10m,' km/h')):'—',rain,sun,life:life?(life.text||life.category):null};
}
