import {dateKey,type WeatherData} from './model.ts';
import {extraIsFresh} from './extras.ts';
import {forecastFresh} from './calendarWeather.ts';
const finite=(n:number|null|undefined)=>n!=null&&Number.isFinite(n)?n:null;
// Display China Weather's five intensity bands; these are not life-index level numbers.
// Protection advice remains appropriate from UVI 3 (WHO), with gentle wording for weak UV.
export function uvProtection(value:number|null|undefined) {
  if(value==null||!Number.isFinite(value)||value<0)return {risk:'unknown',strength:'未知',label:'指数暂缺',tip:'指数暂缺，无法判断防护需求',guidance:'当前指数暂缺'};
  const n=Math.round(value);
  if(n<=2)return {risk:'low',strength:'最弱',label:'最弱',tip:'紫外线较弱，按外出时间和个人需要防护',guidance:'防晒需求较低'};
  if(n<=4)return {risk:'weak',strength:'弱',label:'弱',tip:'指数3起建议适当防护；户外久留可遮阳、戴帽或使用防晒霜',guidance:'户外久留，建议防晒'};
  if(n<=6)return {risk:'moderate',strength:'中等',label:'中等',tip:'外出做好防晒，午间优先遮阴，可用帽子和防晒霜',guidance:'外出做好防晒'};
  if(n<=9)return {risk:'high',strength:'强',label:'强',tip:'加强防晒，减少暴晒，遮阳帽和防护衣物配合防晒霜',guidance:'加强防晒，减少暴晒'};
  return {risk:'very-high',strength:'很强',label:'很强',tip:'尽量避免午间暴晒，外出充分遮挡和防晒',guidance:'避免午间暴晒'};
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
