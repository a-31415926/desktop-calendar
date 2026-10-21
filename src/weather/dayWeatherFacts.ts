import {dateKey,type WeatherData} from './model.ts';
import {extraIsFresh} from './extras.ts';
import {forecastFresh} from './calendarWeather.ts';
const finite=(n:number|null|undefined)=>n!=null&&Number.isFinite(n)?n:null;
// WHO recommends sun protection at UVI >= 3; this uses UVI, never the life-index level.
// https://www.who.int/news-room/questions-and-answers/item/radiation-the-ultraviolet-(uv)-index/
export function uvProtection(value:number|null|undefined) {
  if(value==null||!Number.isFinite(value)||value<0)return {risk:'unknown',strength:'未知',label:'指数暂缺',tip:'指数暂缺，无法判断防护需求'};
  if(value<3)return {risk:'low',strength:'低',label:'低',tip:'强度较低，按外出时间和个人需要防护'};
  if(value<6)return {risk:'moderate',strength:'中等',label:'需防晒',tip:'外出防晒，午间遮阴，可用帽子和防晒霜'};
  if(value<8)return {risk:'high',strength:'高',label:'需防晒',tip:'加强防晒，减少暴晒，遮阳帽和防护衣物配合防晒霜'};
  if(value<11)return {risk:'very-high',strength:'很高',label:'加强防晒',tip:'尽量避免午间暴晒，外出做好遮挡和防晒'};
  return {risk:'extreme',strength:'极高',label:'加强防晒',tip:'尽量避开强日照时段，必须外出时充分遮挡和防晒'};
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
  const uvMax=raw!=null&&raw>=0?raw:null;
  const currentUv=finite(f?.current.uv_index);
  const score=day===today?(currentUv!=null&&currentUv>=0?currentUv:null):uvMax;
  if(!f&& !uvLife)return null;
  if(day!==today&&i<0&&!uvLife)return null;
  const category=day===today?uvCategory(score):uvLife?.category&&freshLife?uvLife.category:uvCategory(score)??uvLife?.category??null;
  return {uv:score,uvMax,uvStale:!forecastFresh(data,now),uvCategory:category,uvProtection:uvProtection(score),uvCached:!!category&&score==null&&!freshLife,
    wind:finite(day===today?f?.current.wind_speed_10m:i>=0?f?.daily.wind_speed_10m_max?.[i]:null),
    humidity:day===today?finite(f?.current.relative_humidity_2m):null,
    today:day===today};
}
