import {dateKey, hourlyRows, number, rainIsFresh, futureRain, timestamp, timeLabel, weatherCode, type WeatherData} from './model.ts';
import {activeAlerts, extraIsFresh, localAir} from './extras.ts';

export function forecastFresh(data:WeatherData|null,now=Date.now()) {
  const age=now-(data?.forecastFetchedAt??0)*1000;
  return !!data?.forecast && !data.forecastError && age>=-60000 && age<=45*60000;
}
export function calendarDayWeather(data:WeatherData|null,day:string,now=Date.now()) {
  if(day<dateKey(now)||!forecastFresh(data,now))return null;
  const f=data!.forecast!, i=f.daily.time.indexOf(day);
  if(i<0)return null;
  const code=day===dateKey(now)?f.current.weather_code:f.daily.weather_code[i];
  const high=f.daily.temperature_2m_max[i],low=f.daily.temperature_2m_min[i];
  if(!Number.isFinite(code)||weatherCode(code)[0]==='暂无数据'||high==null||low==null||!Number.isFinite(high)||!Number.isFinite(low))return null;
  return {code,high,low,label:weatherCode(code)[0],probability:f.daily.precipitation_probability_max[i]};
}
// AQI >100: China AQI pollution category; 35°C: CMA high-temperature reference.
// Rain 50% is an application display cutoff, not an official warning threshold.
export const attentionThresholds={aqi:100,heat:35,freezing:0,rainProbability:50};
export function weatherAttention(data:WeatherData|null,now=Date.now()) {
  const rank=(headline:string)=>headline.includes('红色')?4:headline.includes('橙色')?3:headline.includes('黄色')?2:headline.includes('蓝色')?1:0;
  const alerts=activeAlerts(data?.extras?.alerts,now).sort((a,b)=>rank(b.headline)-rank(a.headline));
  if(alerts.length) {
    const a=alerts[0];
    return {kind:'official',title:a.headline,detail:[a.description,a.instruction,a.senderName].filter(Boolean).join('\n'),count:alerts.length};
  }
  const air=localAir(data?.extras?.air);
  if(air?.code==='cn-mee' && extraIsFresh(data?.extras?.air,now,60*60000) && air.aqi!>attentionThresholds.aqi)
    return {kind:'attention',title:`空气质量需关注 · AQI ${number(air.aqi)} ${air.category}`,detail:air.primaryPollutant?.name?'首要污染物：'+air.primaryPollutant.name:'中国空气质量指数',count:1};
  if(forecastFresh(data,now)) {
    const today=data!.forecast!.daily.time.indexOf(dateKey(now));
    const high=data!.forecast!.daily.temperature_2m_max[today],low=data!.forecast!.daily.temperature_2m_min[today];
    if(high!=null && high>=attentionThresholds.heat)return {kind:'attention',title:`今日最高 ${number(high,'°')} · 留意高温`,detail:'依据当日最高温预报（35°C 高温参考），不代表官方高温预警。',count:1};
    const rows=hourlyRows(data!.forecast,now).filter(h=>timestamp(h.time)>=now && timestamp(h.time)<=now+6*3600000 && h.probability!=null && h.probability>=attentionThresholds.rainProbability);
    if(rows.length) {
      const max=Math.max(...rows.map(h=>h.probability!));
      return {kind:'attention',title:`${timeLabel(rows[0].time)} 起有降雨可能 · 最高 ${number(max,'%')}`,detail:'依据未来六小时逐小时降水概率；概率不代表确定降雨。',count:1};
    }
    if(low!=null && low<=attentionThresholds.freezing)return {kind:'attention',title:`今日最低 ${number(low,'°')} · 留意低温`,detail:'预报温度达到或低于水的冰点，不代表官方寒潮或道路结冰预警。',count:1};
  }
  if(rainIsFresh(data,now) && futureRain(data?.minutely??null,now).some(p=>Number(p.precip)>0))
    return {kind:'attention',title:'未来两小时预计有降雨',detail:data?.minutely?.summary??'每五分钟降水临近预报',count:1};
  return null;
}
export function weatherDataIssues(data:WeatherData|null,now=Date.now()) {
  if(!data)return [];
  const items:string[]=[];
  if(data.forecastError)items.push('天气获取失败，已有数据仅供参考');
  else if(!data.forecast)items.push('天气数据暂缺');
  else if(!forecastFresh(data,now))items.push('天气数据已过期');
  if(data.forecast && data.forecast.current.temperature_2m==null)items.push('当前温度暂缺');
  const ext=data.extras;
  if(data.provider==='qweather') {
    if(ext?.alerts.error)items.push('预警获取失败，无法确认预警状态');
    else if(!extraIsFresh(ext?.alerts,now,20*60000))items.push('预警数据暂缺或过期');
    if(ext?.air.error)items.push('空气质量获取失败');
    else if(!localAir(ext?.air))items.push('空气质量暂缺');
    else if(!extraIsFresh(ext?.air,now,60*60000))items.push('空气质量为旧数据');
  }
  if(data.rainError)items.push('短时降雨不可用');
  return items;
}
