import {selectedForecast} from './selectedForecast.ts';
import {activeAlerts} from './extras.ts';
import type {WeatherData} from './model.ts';
/** Visual gust threshold only; typhoon treatment always requires an active official alert. */
export function atmosphereState(data:WeatherData|null,selected:string,now=Date.now()) {
 const f=selectedForecast(data,selected,now);
 const live=f.scene!=='neutral';
 const code=live?f.code:undefined;
 const wind=live?(f.isToday?data?.forecast?.current.wind_speed_10m:f.wind):null;
 const typhoon=live&&f.isToday&&activeAlerts(data?.extras?.alerts,now).some(a=>a.headline.includes('台风'));
 return {scene:f.scene,code,night:live&&f.isToday&&data?.forecast?.current.is_day===0,
  variant:code!=null&&[503,504,507,508].includes(code)?'dust':code!=null&&[502,511,512,513].includes(code)?'haze':'normal',
  clouds:code!=null&&[102,103,152,153].includes(code)?'few':'normal',
  wind:typhoon?'typhoon':wind!=null&&Number.isFinite(wind)&&wind>=35?'wind':'normal'};
}
