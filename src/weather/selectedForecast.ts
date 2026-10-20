import {dateKey,selectedHours,weatherCode,type WeatherData} from './model.ts';
import {forecastFresh} from './calendarWeather.ts';

/** A date selection never falls back to today's forecast. Current services remain explicitly current. */
export function selectedForecast(data:WeatherData|null,selected:string,now=Date.now()) {
  const today=dateKey(now),isToday=selected===today,isPast=selected<today;
  const f=data?.forecast,index=f?.daily.time.indexOf(selected)??-1;
  const available=!!f && !isPast && (isToday?!!f.current:index>=0);
  const code=available?(isToday?f!.current.weather_code:f!.daily.weather_code[index]):undefined;
  return {isToday,isPast,available,index,code,
    scene:available&&forecastFresh(data,now)&&code!=null?weatherCode(code)[1]:'neutral',
    hours:selectedHours(f??null,selected,now).slice(0,4),
    high:index>=0?f?.daily.temperature_2m_max[index]:null,
    low:index>=0?f?.daily.temperature_2m_min[index]:null,
    probability:index>=0?f?.daily.precipitation_probability_max[index]:null,
    wind:index>=0?f?.daily.wind_speed_10m_max?.[index]:null,
    uv:index>=0?f?.daily.uv_index_max?.[index]:null,
    empty:isPast?'暂不提供历史天气':index<0?'所选日期超出当前预报范围':'逐小时预报尚未覆盖此日期',
  };
}
