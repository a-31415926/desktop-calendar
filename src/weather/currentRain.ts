import {rainIsFresh, timestamp, timeLabel, weatherCode, type WeatherData} from './model.ts';

/** A nowcast is a forecast near this location, never an observed rain intensity. */
export function currentRain(data: WeatherData|null, now=Date.now()) {
  const code=data?.forecast?.current.weather_code;
  const original=code==null?'暂无数据':weatherCode(code)[0];
  const scene=code==null?'cloud':weatherCode(code)[1];
  const result={active:false, conflict:false, code:code??3, label:original, source:''};
  if(!rainIsFresh(data,now)||scene==='snow'||scene==='storm')return result;
  const points=data!.minutely!.minutely.filter(p=>{
    const t=timestamp(p.fxTime);
    return t<=now && t>now-5*60000;
  }).sort((a,b)=>timestamp(b.fxTime)-timestamp(a.fxTime));
  const point=points[0];
  if(!point||point.type!=='rain'||point.precip.trim()===''||!Number.isFinite(Number(point.precip))||Number(point.precip)<=0)return result;
  return {active:true,conflict:scene!=='rain',code:scene==='rain'?code!:399,
    label:scene==='rain'?original:'附近正在降雨',source:`短时预报 · ${timeLabel(data!.minutely!.updateTime)}更新`};
}
