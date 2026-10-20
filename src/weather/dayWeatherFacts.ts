import {dateKey,type WeatherData} from './model.ts';
import {extraIsFresh} from './extras.ts';
const finite=(n:number|null|undefined)=>n!=null&&Number.isFinite(n)?n:null;
// China Weather's five UV intensity bands, not the QWeather life-index level number.
// https://js.weather.com.cn/qxkp/rdzt/08/1952286.shtml
export function uvCategory(value:number|null|undefined) {
  if(value==null||!Number.isFinite(value)||value<0)return null;
  const n=Math.round(value);
  return n<=2?'最弱':n<=4?'弱':n<=6?'中等':n<=9?'强':'很强';
}
export function dayWeatherFacts(data:WeatherData|null,day:string,now=Date.now()) {
  const today=dateKey(now),f=data?.forecast,i=f?.daily.time.indexOf(day)??-1;
  if(day<today)return null;
  const indices=data?.extras?.indices;
  const uvLife=indices?.value?.daily.find(index=>index.type==='5'&&index.date===day);
  const freshLife=extraIsFresh(indices,now,12*3600000);
  const raw=i>=0?finite(f?.daily.uv_index_max?.[i]):null;
  const score=raw!=null&&raw>=0?raw:null;
  if(!f&& !uvLife)return null;
  if(day!==today&&i<0&&!uvLife)return null;
  const category=uvLife?.category&&freshLife?uvLife.category:uvCategory(score)??uvLife?.category??null;
  return {uv:score,uvCategory:category,uvCached:!!category&&score==null&&!freshLife,
    wind:finite(day===today?f?.current.wind_speed_10m:i>=0?f?.daily.wind_speed_10m_max?.[i]:null),
    humidity:day===today?finite(f?.current.relative_humidity_2m):null,
    today:day===today};
}
