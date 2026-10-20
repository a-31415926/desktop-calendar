import { rainMotion } from '../../../weather/rainMotion.ts';
const scenes = ['neutral', 'sun', 'cloud-sun', 'cloud', 'rain', 'storm', 'snow', 'fog'];
/** Only decorations dissolve. The opaque sky base interpolates its color independently. */
export default function WeatherAtmosphere({scene,night=false,code=305}: {scene:string;night?:boolean;code?:number}) {
 const rain=rainMotion(code);
 const variant=code===309?'drizzle':code===300||code===350?'shower':[503,504,507,508].includes(code)?'dust':code===502||[511,512,513].includes(code)?'haze':code===304?'hail':code===404||code===405?'sleet':code>=509&&code<=515?'dense-fog':code>=310&&code<=312?'downpour':'normal';
 return <div className="calendar-weather-atmosphere v16-atmosphere" data-night={night} data-variant={variant} data-rain-intensity={rain.intensity} aria-hidden="true">
  {scenes.map(kind=><div key={kind} className={'v16-scene v16-'+kind} data-active={kind===scene}>
   {(kind==='sun'||kind==='cloud-sun')&&<div className={night?'v16-moon':'v16-sun-disc'}/>}
   {kind!=='sun'&&kind!=='neutral'&&<><div className="v16-cloud-shape v16-cloud-a"/><div className="v16-cloud-shape v16-cloud-b"/></>}
   {kind==='fog'&&<div className="v16-fog-ribbon"/>}
   {(kind==='rain'||kind==='storm'||(kind==='snow'&&variant==='sleet'))&&<>
    {(['far','near'] as const).map(depth=><div className={'rain-field rain-field-'+depth} key={depth}>
     {Array.from({length:rain[depth]},(_,i)=><i key={i} style={{left:((i*61+13)%103)+'%',top:(((i*37)%120)-10)+'%',height:(rain.length*(depth==='far'?.72:1))+'px',animationDelay:-(i*.237)+'s',animationDuration:(rain.seconds*(depth==='far'?1.22:1)*(1+(i%5)*.04))+'s'}}/>)}
    </div>)}
    <div className="rain-ripples">{Array.from({length:rain.ripples},(_,i)=><i key={i} style={{left:(12+(i*29)%80)+'%',top:(i*23%70)+'%',animationDelay:-(i*.83)+'s'}}/>)}</div>
   </>}
   {kind==='storm'&&<svg className="weather-lightning" viewBox="0 0 45 70"><path d="M24 0L3 36h17L13 70 43 25H25L35 0Z" fill="#f6df9e"/></svg>}
   <div className="weather-wind-lines">{Array.from({length:9},(_,i)=><i key={i} style={{top:(12+i*9)+'%',animationDelay:-(i*.47)+'s'}}/>)}</div>
   <div className="weather-dust-motes">{Array.from({length:24},(_,i)=><i key={i} style={{left:((i*43)%100)+'%',top:((i*31)%100)+'%',animationDelay:-(i*.57)+'s'}}/>)}</div>
   <div className="v16-particles">{Array.from({length:kind==='snow'?({light:16,moderate:32,heavy:56}[rain.intensity]):0},(_,i)=><i key={i} style={{left:((i*37+9)%100)+'%',top:((i*23)%100)+'%',animationDelay:-(i*.73)+'s',animationDuration:(kind==='snow'?({light:11,moderate:8,heavy:5}[rain.intensity])+i%5:2.6+(i%5)*.3)+'s'}}/>)}</div>
  </div>)}
 </div>;
}
