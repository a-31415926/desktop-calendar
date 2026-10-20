import {dateKey,type WeatherData} from './model.ts';
import {extraIsFresh} from './extras.ts';
const finite=(n:number|null|undefined)=>n!=null&&Number.isFinite(n)?n:null;
// WHO recommends sun protection at UVI >= 3; this uses UVI, never the life-index level.
// https://www.who.int/news-room/questions-and-answers/item/radiation-the-ultraviolet-(uv)-index/
export function uvProtection(value:number|null|undefined) {
  if(value==null||!Number.isFinite(value)||value<0)return {risk:'unknown',label:'指数暂缺',tip:'暂无可靠紫外线指数，不能判断防护需求'};
  if(value<3)return {risk:'low',label:'低',tip:'紫外线指数较低，按外出时间和个人需要防护'};
  if(value<8)return {risk:value<6?'moderate':'high',label:'需防晒',tip:'午间尽量在阴凉处，使用遮阳帽、防护衣物和防晒霜'};
  return {risk:value<11?'very-high':'extreme',label:'加强防晒',tip:'避免午间暴晒，使用遮阳帽、防护衣物和防晒霜'};
}
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
  return {uv:score,uvCategory:category,uvProtection:uvProtection(score),uvCached:!!category&&score==null&&!freshLife,
    wind:finite(day===today?f?.current.wind_speed_10m:i>=0?f?.daily.wind_speed_10m_max?.[i]:null),
    humidity:day===today?finite(f?.current.relative_humidity_2m):null,
    today:day===today};
}
